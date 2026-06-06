const agendamentoRepository = require("../repositories/agendamentoRepository");

const PRAZO_CANCELAMENTO_HORAS = 2;

function horaValida(hora) {
  return /^\d{2}:\d{2}$/.test(String(hora));
}

function converterHoraParaMinutos(hora) {
  const [horas, minutos] = String(hora).split(":").map(Number);
  return horas * 60 + minutos;
}

function calcularHorarioFim(horarioInicio, duracaoMinutos) {
  const totalMinutos = converterHoraParaMinutos(horarioInicio) + duracaoMinutos;
  const horas = String(Math.floor(totalMinutos / 60)).padStart(2, "0");
  const minutos = String(totalMinutos % 60).padStart(2, "0");

  return `${horas}:${minutos}`;
}

function obterDiaSemana(data) {
  return new Date(`${data}T00:00:00`).getDay();
}

function horariosSobrepostos(inicioA, fimA, inicioB, fimB) {
  return inicioA < fimB && fimA > inicioB;
}

function validarDadosCadastro(dados) {
  if (!dados.empresaId || !dados.servicoId || !dados.nomeCliente) {
    return "Informe empresa, servico e nome do cliente.";
  }

  if (!dados.dataAgendamento || !dados.horarioInicio) {
    return "Informe data e horario do agendamento.";
  }

  if (!horaValida(dados.horarioInicio)) {
    return "Informe um horario inicial valido.";
  }

  return null;
}

async function validarRegrasAgendamento(dados, servico, horarioFim) {
  const diaSemana = obterDiaSemana(dados.dataAgendamento);
  const horarioFuncionamento = await agendamentoRepository.buscarHorarioFuncionamento(
    dados.empresaId,
    diaSemana
  );

  if (!horarioFuncionamento || !horarioFuncionamento.abre) {
    return "O estabelecimento nao abre neste dia.";
  }

  if (
    dados.horarioInicio < horarioFuncionamento.horarioAbertura ||
    horarioFim > horarioFuncionamento.horarioFechamento
  ) {
    return "O agendamento esta fora do horario de funcionamento.";
  }

  if (
    horarioFuncionamento.intervaloInicio &&
    horarioFuncionamento.intervaloFim &&
    horariosSobrepostos(
      dados.horarioInicio,
      horarioFim,
      horarioFuncionamento.intervaloInicio,
      horarioFuncionamento.intervaloFim
    )
  ) {
    return "O agendamento coincide com o intervalo do estabelecimento.";
  }

  const existeBloqueio = await agendamentoRepository.existeBloqueioNoHorario({
    empresaId: dados.empresaId,
    profissionalId: dados.profissionalId,
    dataAgendamento: dados.dataAgendamento,
    horarioInicio: dados.horarioInicio,
    horarioFim,
  });

  if (existeBloqueio) {
    return "Este horario esta bloqueado para o profissional.";
  }

  const existeConflito = await agendamentoRepository.existeAgendamentoNoHorario({
    empresaId: dados.empresaId,
    profissionalId: dados.profissionalId,
    dataAgendamento: dados.dataAgendamento,
    horarioInicio: dados.horarioInicio,
    horarioFim,
  });

  if (existeConflito) {
    return "Este horario ja possui agendamento.";
  }

  if (servico.status !== "ativo") {
    return "Este servico nao esta disponivel para agendamento.";
  }

  return null;
}

function podeCancelar(agendamento) {
  const dataHoraAgendamento = new Date(
    `${agendamento.dataAgendamento}T${agendamento.horarioInicio}:00`
  );
  const limiteCancelamento = new Date(
    dataHoraAgendamento.getTime() - PRAZO_CANCELAMENTO_HORAS * 60 * 60 * 1000
  );

  return new Date() <= limiteCancelamento;
}

async function listarAgendamentos(req, res) {
  try {
    const { empresaId } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const agendamentos = await agendamentoRepository.listarPorEmpresa(req.query);
    return res.json(agendamentos);
  } catch (error) {
    console.error("Erro ao listar agendamentos:", error);
    return res.status(500).json({ message: "Erro interno ao listar agendamentos." });
  }
}

async function listarProfissionais(req, res) {
  try {
    const { empresaId } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const profissionais = await agendamentoRepository.listarProfissionaisAtivos(empresaId);
    return res.json(profissionais);
  } catch (error) {
    console.error("Erro ao listar profissionais da agenda:", error);
    return res.status(500).json({
      message: "Erro interno ao listar profissionais da agenda.",
    });
  }
}

async function cadastrarAgendamento(req, res) {
  try {
    const erroValidacao = validarDadosCadastro(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    const servico = await agendamentoRepository.buscarServicoDaEmpresa(
      req.body.servicoId,
      req.body.empresaId
    );

    if (!servico) {
      return res.status(400).json({
        message: "O cliente so pode agendar servicos disponiveis no estabelecimento.",
      });
    }

    const horarioFim = calcularHorarioFim(req.body.horarioInicio, servico.duracaoMinutos);
    const erroRegra = await validarRegrasAgendamento(req.body, servico, horarioFim);

    if (erroRegra) {
      return res.status(400).json({ message: erroRegra });
    }

    const agendamento = await agendamentoRepository.criar({
      empresaId: req.body.empresaId,
      servicoId: req.body.servicoId,
      profissionalId: req.body.profissionalId || null,
      clienteId: req.body.clienteId || null,
      nomeCliente: req.body.nomeCliente,
      telefoneCliente: req.body.telefoneCliente,
      emailCliente: req.body.emailCliente,
      dataAgendamento: req.body.dataAgendamento,
      horarioInicio: req.body.horarioInicio,
      horarioFim,
      observacoes: req.body.observacoes,
    });

    return res.status(201).json({
      message: "Agendamento cadastrado com sucesso.",
      agendamento,
    });
  } catch (error) {
    console.error("Erro ao cadastrar agendamento:", error);
    return res.status(500).json({ message: "Erro interno ao cadastrar agendamento." });
  }
}

async function atualizarStatus(req, res) {
  try {
    const { empresaId, status } = req.body;
    const statusCanonicos = {
      confirmado: "agendado",
      realizado: "concluido",
      pendente: "pendente",
      agendado: "agendado",
      concluido: "concluido",
      cancelado: "cancelado",
    };

    if (!empresaId || !status) {
      return res.status(400).json({ message: "Informe empresa e status." });
    }

    if (!statusCanonicos[status]) {
      return res.status(400).json({ message: "Status de agendamento invalido." });
    }

    const statusFinal = statusCanonicos[status];

    const agendamentoAtual = await agendamentoRepository.buscarPorId(req.params.id, empresaId);

    if (!agendamentoAtual) {
      return res.status(404).json({ message: "Agendamento nao encontrado." });
    }

    const statusAtual = statusCanonicos[agendamentoAtual.status] || agendamentoAtual.status;
    const transicoesPermitidas = {
      pendente: ["agendado", "cancelado"],
      agendado: ["concluido", "cancelado"],
      concluido: [],
      cancelado: [],
    };

    if (
      statusFinal !== statusAtual &&
      !(transicoesPermitidas[statusAtual] || []).includes(statusFinal)
    ) {
      return res.status(409).json({
        message: "Esta alteracao de status nao e permitida para o agendamento.",
      });
    }

    if (statusFinal === "cancelado" && !podeCancelar(agendamentoAtual)) {
      return res.status(400).json({
        message: `Cancelamentos so podem ser realizados ate ${PRAZO_CANCELAMENTO_HORAS} horas antes do horario.`,
      });
    }

    const agendamento = await agendamentoRepository.atualizarStatus(
      req.params.id,
      empresaId,
      statusFinal
    );

    return res.json({
      message: "Status do agendamento atualizado com sucesso.",
      agendamento,
    });
  } catch (error) {
    console.error("Erro ao atualizar status do agendamento:", error);
    return res.status(500).json({
      message: "Erro interno ao atualizar status do agendamento.",
    });
  }
}

module.exports = {
  listarAgendamentos,
  listarProfissionais,
  cadastrarAgendamento,
  atualizarStatus,
};
