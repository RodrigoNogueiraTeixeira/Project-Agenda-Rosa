const agendamentoRepository = require("../repositories/agendamentoRepository");

const PRAZO_CANCELAMENTO_HORAS = 2;

// Verifica se o horario foi recebido no formato esperado.
function horaValida(hora) {
  return /^\d{2}:\d{2}$/.test(String(hora));
}

// Transforma HH:MM em minutos para facilitar comparacoes e somas.
function converterHoraParaMinutos(hora) {
  const partes = String(hora).split(":");
  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);

  return horas * 60 + minutos;
}

// Soma a duracao do servico ao horario inicial.
function calcularHorarioFim(horarioInicio, duracaoMinutos) {
  const inicioEmMinutos = converterHoraParaMinutos(horarioInicio);
  const totalMinutos = inicioEmMinutos + duracaoMinutos;
  const horas = String(Math.floor(totalMinutos / 60)).padStart(2, "0");
  const minutos = String(totalMinutos % 60).padStart(2, "0");

  return `${horas}:${minutos}`;
}

// Usa a data informada para identificar o dia da semana do agendamento.
function obterDiaSemana(data) {
  const dataAgendamento = new Date(`${data}T00:00:00`);
  return dataAgendamento.getDay();
}

// Compara dois periodos e informa se existe choque de horarios.
function horariosSobrepostos(inicioA, fimA, inicioB, fimB) {
  if (inicioA < fimB && fimA > inicioB) {
    return true;
  }

  return false;
}

// Valida os campos minimos enviados para criar um agendamento.
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

// Confere funcionamento, intervalo, bloqueios e conflitos.
async function validarRegrasAgendamento(dados, servico, horarioFim) {
  const diaSemana = obterDiaSemana(dados.dataAgendamento);
  const horarioFuncionamento =
    await agendamentoRepository.buscarHorarioFuncionamento(
      dados.empresaId,
      diaSemana
    );

  if (!horarioFuncionamento || !horarioFuncionamento.abre) {
    return "O estabelecimento nao abre neste dia.";
  }

  const antesDaAbertura =
    dados.horarioInicio < horarioFuncionamento.horarioAbertura;
  const depoisDoFechamento =
    horarioFim > horarioFuncionamento.horarioFechamento;

  if (antesDaAbertura || depoisDoFechamento) {
    return "O agendamento esta fora do horario de funcionamento.";
  }

  if (
    horarioFuncionamento.intervaloInicio &&
    horarioFuncionamento.intervaloFim
  ) {
    const coincideComIntervalo = horariosSobrepostos(
      dados.horarioInicio,
      horarioFim,
      horarioFuncionamento.intervaloInicio,
      horarioFuncionamento.intervaloFim
    );

    if (coincideComIntervalo) {
      return "O agendamento coincide com o intervalo do estabelecimento.";
    }
  }

  const dadosDoHorario = {
    empresaId: dados.empresaId,
    profissionalId: dados.profissionalId,
    dataAgendamento: dados.dataAgendamento,
    horarioInicio: dados.horarioInicio,
    horarioFim: horarioFim,
  };

  const existeBloqueio =
    await agendamentoRepository.existeBloqueioNoHorario(dadosDoHorario);

  if (existeBloqueio) {
    return "Este horario esta bloqueado para o profissional.";
  }

  const existeConflito =
    await agendamentoRepository.existeAgendamentoNoHorario(dadosDoHorario);

  if (existeConflito) {
    return "Este horario ja possui agendamento.";
  }

  if (servico.status !== "ativo") {
    return "Este servico nao esta disponivel para agendamento.";
  }

  return null;
}

// Converte nomes antigos para o status salvo atualmente.
function obterStatusFinal(status) {
  if (status === "confirmado") {
    return "agendado";
  }

  if (status === "realizado") {
    return "concluido";
  }

  if (
    status === "pendente" ||
    status === "agendado" ||
    status === "concluido" ||
    status === "cancelado"
  ) {
    return status;
  }

  return null;
}

// Define quais mudancas de status podem ser feitas pela empresa.
function transicaoPermitida(statusAtual, statusNovo) {
  if (statusNovo === statusAtual) {
    return true;
  }

  if (statusAtual === "pendente") {
    return statusNovo === "agendado" || statusNovo === "cancelado";
  }

  if (statusAtual === "agendado") {
    return statusNovo === "concluido" || statusNovo === "cancelado";
  }

  return false;
}

// Garante que o cancelamento respeite o prazo minimo configurado.
function podeCancelar(agendamento) {
  const dataHoraAgendamento = new Date(
    `${agendamento.dataAgendamento}T${agendamento.horarioInicio}:00`
  );
  const prazoEmMilissegundos =
    PRAZO_CANCELAMENTO_HORAS * 60 * 60 * 1000;
  const limiteCancelamento = new Date(
    dataHoraAgendamento.getTime() - prazoEmMilissegundos
  );

  return new Date() <= limiteCancelamento;
}

// Prepara os dados usados no cadastro.
function montarDadosAgendamento(dados, horarioFim) {
  return {
    empresaId: dados.empresaId,
    servicoId: dados.servicoId,
    profissionalId: dados.profissionalId || null,
    clienteId: dados.clienteId || null,
    nomeCliente: dados.nomeCliente,
    telefoneCliente: dados.telefoneCliente,
    emailCliente: dados.emailCliente,
    dataAgendamento: dados.dataAgendamento,
    horarioInicio: dados.horarioInicio,
    horarioFim: horarioFim,
    observacoes: dados.observacoes,
  };
}

async function listarAgendamentos(req, res) {
  // Lista os agendamentos conforme os filtros enviados pela tela da empresa.
  try {
    const empresaId = req.query.empresaId;

    if (!empresaId) {
      return res.status(400).json({
        message: "Informe o ID da empresa.",
      });
    }

    const agendamentos =
      await agendamentoRepository.listarPorEmpresa(req.query);

    return res.json(agendamentos);
  } catch (error) {
    console.error("Erro ao listar agendamentos:", error);
    return res.status(500).json({
      message: "Erro interno ao listar agendamentos.",
    });
  }
}

async function listarProfissionais(req, res) {
  // Retorna somente profissionais ativos para uso nos filtros da agenda.
  try {
    const empresaId = req.query.empresaId;

    if (!empresaId) {
      return res.status(400).json({
        message: "Informe o ID da empresa.",
      });
    }

    const profissionais =
      await agendamentoRepository.listarProfissionaisAtivos(empresaId);

    return res.json(profissionais);
  } catch (error) {
    console.error("Erro ao listar profissionais da agenda:", error);
    return res.status(500).json({
      message: "Erro interno ao listar profissionais da agenda.",
    });
  }
}

async function cadastrarAgendamento(req, res) {
  // Cria um agendamento apos validar servico, horario e conflitos.
  try {
    const erroValidacao = validarDadosCadastro(req.body);

    if (erroValidacao) {
      return res.status(400).json({
        message: erroValidacao,
      });
    }

    const servico = await agendamentoRepository.buscarServicoDaEmpresa(
      req.body.servicoId,
      req.body.empresaId
    );

    if (!servico) {
      return res.status(400).json({
        message:
          "O cliente so pode agendar servicos disponiveis no estabelecimento.",
      });
    }

    const horarioFim = calcularHorarioFim(
      req.body.horarioInicio,
      servico.duracaoMinutos
    );
    const erroRegra = await validarRegrasAgendamento(
      req.body,
      servico,
      horarioFim
    );

    if (erroRegra) {
      return res.status(400).json({
        message: erroRegra,
      });
    }

    const dadosAgendamento = montarDadosAgendamento(
      req.body,
      horarioFim
    );
    const agendamento =
      await agendamentoRepository.criar(dadosAgendamento);

    return res.status(201).json({
      message: "Agendamento cadastrado com sucesso.",
      agendamento: agendamento,
    });
  } catch (error) {
    console.error("Erro ao cadastrar agendamento:", error);
    return res.status(500).json({
      message: "Erro interno ao cadastrar agendamento.",
    });
  }
}

async function atualizarStatus(req, res) {
  // Atualiza o andamento do agendamento respeitando as transicoes permitidas.
  try {
    const empresaId = req.body.empresaId;
    const statusRecebido = req.body.status;

    if (!empresaId || !statusRecebido) {
      return res.status(400).json({
        message: "Informe empresa e status.",
      });
    }

    const statusFinal = obterStatusFinal(statusRecebido);

    if (!statusFinal) {
      return res.status(400).json({
        message: "Status de agendamento invalido.",
      });
    }

    const agendamentoAtual = await agendamentoRepository.buscarPorId(
      req.params.id,
      empresaId
    );

    if (!agendamentoAtual) {
      return res.status(404).json({
        message: "Agendamento nao encontrado.",
      });
    }

    const statusAtual = obterStatusFinal(agendamentoAtual.status);

    if (!transicaoPermitida(statusAtual, statusFinal)) {
      return res.status(409).json({
        message:
          "Esta alteracao de status nao e permitida para o agendamento.",
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
      agendamento: agendamento,
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
