const agendamentosDAO = require("../dao/agendamentosDAO");
const clientesDAO = require("../dao/clientesDAO");
const estabelecimentosRepository = require("./estabelecimentosRepository");
const pagamentosDAO = require("../dao/pagamentosDAO");
const pagamentosRepository = require("./pagamentosRepository");
function adicionarMinutos(horarioStr, minutos) {
  if (!horarioStr || !horarioStr.includes(":")) return horarioStr;
  const [h, m] = horarioStr.split(":").map(Number);
  let totalMinutos = h * 60 + m + minutos;
  const novosH = Math.floor(totalMinutos / 60);
  const novosM = totalMinutos % 60;
  return `${String(novosH).padStart(2, '0')}:${String(novosM).padStart(2, '0')}`;
}

function validarDataAgendamento(dataTexto) {
  const data = String(dataTexto || "").trim();
  const validaFormato = /^\d{4}-\d{2}-\d{2}$/.test(data);
  if (!validaFormato) {
    throw new Error("Data do agendamento invalida.");
  }

  const dataAgendada = new Date(`${data}T00:00:00`);
  if (Number.isNaN(dataAgendada.getTime())) {
    throw new Error("Data do agendamento invalida.");
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const limiteFuturo = new Date(hoje);
  limiteFuturo.setMonth(limiteFuturo.getMonth() + 2);

  if (dataAgendada < hoje) {
    throw new Error("Nao e permitido agendar no passado.");
  }

  if (dataAgendada > limiteFuturo) {
    throw new Error("O agendamento pode ser no maximo ate 2 meses a partir de hoje.");
  }
}

// Cria um novo agendamento com validacoes de negocio.
async function criarAgendamento(payload) {
  const clienteId = Number(payload.clienteId || 1);
  const estabelecimentoId = Number(payload.estabelecimentoId);
  const data = String(payload.data || "").trim();
  const horario = String(payload.horario || "").trim();
  const profissionalId = payload.profissionalId || null;
  const observacoes = String(payload.observacoes || "").trim();

  const ids = Array.isArray(payload.servicosIds)
    ? payload.servicosIds.map((item) => Number(item)).filter((item) => Number.isFinite(item))
    : [];

  if (!Number.isFinite(clienteId) || !Number.isFinite(estabelecimentoId) || !data || !horario) {
    throw new Error("Campos obrigatorios invalidos.");
  }

  validarDataAgendamento(data);

  // Impedir agendamento no passado para o dia de hoje
  const dataHoje = new Date();
  const dataSelecionadaObj = new Date(`${data}T00:00:00`);
  const isHoje = dataHoje.toDateString() === dataSelecionadaObj.toDateString();
  if (isHoje) {
    const [h, m] = horario.split(":").map(Number);
    const mSelecionado = h * 60 + m;
    const mAgora = dataHoje.getHours() * 60 + dataHoje.getMinutes();
    if (mSelecionado <= mAgora) {
      throw new Error("Esse horario ja passou. Por favor, escolha um horario futuro.");
    }
  }

  const cliente = await clientesDAO.buscarPorId(clienteId);
  if (!cliente) {
    throw new Error("Cliente nao encontrado.");
  }

  const estabelecimento = await estabelecimentosRepository.buscarEstabelecimentoPorId(estabelecimentoId);
  if (!estabelecimento) {
    throw new Error("Estabelecimento nao encontrado.");
  }

  const servicosSelecionados = await estabelecimentosRepository.buscarServicosSelecionados(estabelecimentoId, ids);
  if (servicosSelecionados.length === 0) {
    throw new Error("Selecione pelo menos um servico valido.");
  }

  const total = servicosSelecionados.reduce((soma, item) => soma + Number(item.preco || 0), 0);
  const duracaoTotalMinutos = servicosSelecionados.reduce((soma, item) => soma + Number(item.duracao_minutos || 30), 0);

  // Calcula o horario de fim
  const [horaStr, minStr] = horario.split(":");
  let horaFimNum = Number(horaStr);
  let minFimNum = Number(minStr) + duracaoTotalMinutos;
  
  horaFimNum += Math.floor(minFimNum / 60);
  minFimNum = minFimNum % 60;
  
  const horarioFim = `${String(horaFimNum).padStart(2, '0')}:${String(minFimNum).padStart(2, '0')}`;

  // Busca somente profissionais vinculados a todos os servicos escolhidos.
  const estabelecimentosDAO = require("../dao/estabelecimentosDAO");
  const servicosIdsValidos = servicosSelecionados.map((servico) => Number(servico.id));
  const profissionais = await estabelecimentosDAO.listarProfissionaisPorEstabelecimento(
    estabelecimentoId,
    servicosIdsValidos
  );
  
  let profissionalNome = "Sem preferência";
  let finalProfissionalId = null;

  if (profissionalId && profissionalId !== "qualquer" && profissionalId !== "") {
    const profRow = profissionais.find(
      (profissional) => Number(profissional.id) === Number(profissionalId)
    );

    if (profRow) {
      profissionalNome = profRow.nome;
      finalProfissionalId = Number(profissionalId);
    } else {
      throw new Error("O profissional selecionado nao atende a todos os servicos escolhidos.");
    }
  } else if (profissionais.length > 0) {
    // Sem preferencia: escolhe o primeiro profissional vinculado que estiver livre.
    const { get } = require("../../config/database");
    let profissionalLivreEncontrado = false;

    for (const prof of profissionais) {
      const conflitoProf = await get(
        `
          SELECT id
          FROM agendamentos
          WHERE estabelecimento_id = ?
            AND data = ?
            AND (
              status IN ('agendado', 'confirmado', 'concluido', 'realizado')
              OR (status = 'pendente' AND criado_em::timestamptz >= NOW() - INTERVAL '15 minutes')
            )
            AND (
              profissional_id = ? 
              OR profissional = ?
            )
            AND (
              (? < horario_fim AND ? > horario)
              OR (horario_fim IS NULL AND horario = ?)
            )
          LIMIT 1
        `,
        [
          estabelecimentoId,
          data,
          prof.id,
          prof.nome,
          horario,
          horarioFim,
          horario
        ]
      );
      if (!conflitoProf) {
        profissionalNome = prof.nome;
        finalProfissionalId = prof.id;
        profissionalLivreEncontrado = true;
        break;
      }
    }

    if (!profissionalLivreEncontrado) {
      throw new Error("Nao ha profissional disponivel para este horario.");
    }
  } else {
    throw new Error("Nenhum profissional cadastrado atende a todos os servicos selecionados.");
  }

  // Validar se há conflito para o profissional selecionado (usando o cálculo em JS para consistência total com a exibição de horários)
  const diaSemana = new Date(`${data}T00:00:00`).getDay();
  const horarioFuncionamento = await estabelecimentosDAO.buscarHorarioFuncionamento(
    estabelecimentoId,
    diaSemana
  );

  if (horarioFuncionamento?.empresa_id) {
    if (!horarioFuncionamento.abre || !horarioFuncionamento.horario_abertura) {
      throw new Error("O estabelecimento nao abre nesta data.");
    }

    if (
      horario < horarioFuncionamento.horario_abertura ||
      horarioFim > horarioFuncionamento.horario_fechamento
    ) {
      throw new Error("O horario escolhido esta fora do funcionamento do estabelecimento.");
    }

    if (
      horarioFuncionamento.intervalo_inicio &&
      horarioFuncionamento.intervalo_fim &&
      horario < horarioFuncionamento.intervalo_fim &&
      horarioFim > horarioFuncionamento.intervalo_inicio
    ) {
      throw new Error("O horario escolhido coincide com o intervalo do estabelecimento.");
    }
  }

  const bloqueios = await estabelecimentosDAO.listarBloqueiosPorData(
    estabelecimentoId,
    data
  );
  const horarioBloqueado = bloqueios.some((bloqueio) => {
    const bloqueioGlobal = !bloqueio.profissional_id && !bloqueio.profissional_nome;
    const bloqueioDoProfissional = finalProfissionalId &&
      Number(bloqueio.profissional_id) === Number(finalProfissionalId);

    return (bloqueioGlobal || bloqueioDoProfissional)
      && horario < bloqueio.horario_fim
      && horarioFim > bloqueio.horario_inicio;
  });

  if (horarioBloqueado) {
    throw new Error("O horario escolhido esta bloqueado para o profissional.");
  }

  const ocupados = await agendamentosDAO.listarHorariosOcupados(estabelecimentoId, data, finalProfissionalId);
  
  let temConflito = false;
  for (const o of ocupados) {
    const oFim = o.horario_fim || adicionarMinutos(o.horario, 30);
    if (horario < oFim && horarioFim > o.horario) {
      temConflito = true;
      break;
    }
  }

  if (temConflito) {
    throw new Error("Esse horario ja esta ocupado para o profissional selecionado ou a agenda esta lotada.");
  }

  // Busca a empresa vinculada diretamente ao estabelecimento.
  const { get } = require("../../config/database");
  const estabelecimentoEmpresa = await get(
    "SELECT empresa_id FROM estabelecimentos WHERE id = ?",
    [estabelecimentoId]
  );
  let empresaId = estabelecimentoEmpresa
    ? estabelecimentoEmpresa.empresa_id
    : null;

  if (!empresaId) {
    const servicoEmpresa = await get(
      `SELECT empresa_id
      FROM servicos
      WHERE estabelecimento_id = ?
        AND empresa_id IS NOT NULL
      LIMIT 1`,
      [estabelecimentoId]
    );
    empresaId = servicoEmpresa ? servicoEmpresa.empresa_id : null;
  }

  const servicoId = servicosSelecionados.length > 0 ? servicosSelecionados[0].id : null;

  const totalCalculado = total;

  const agendamentoId = await agendamentosDAO.criarAgendamento({
    clienteId,
    estabelecimentoId,
    estabelecimentoNome: estabelecimento.nome,
    data,
    horario,
    profissional: profissionalNome,
    observacoes,
    total: totalCalculado,
    horarioFim,
    servicos: servicosSelecionados,
    // Novos campos de compatibilidade com o painel da empresa:
    empresaId,
    servicoId,
    profissionalId: finalProfissionalId,
    nomeCliente: cliente.nome,
    telefoneCliente: cliente.telefone,
    emailCliente: cliente.email,
    dataAgendamento: data,
    horarioInicio: horario
  });

  return {
    id: agendamentoId,
    clienteId,
    estabelecimentoId,
    estabelecimentoNome: estabelecimento.nome,
    data,
    horario,
    profissional: profissionalNome,
    observacoes,
    total: totalCalculado,
    status: "pendente",
    servicos: servicosSelecionados
  };
}

// Lista agendamentos de um cliente, junto dos servicos de cada agendamento.
async function listarAgendamentosDoCliente(clienteId) {
  const idCliente = Number(clienteId);
  const cliente = await clientesDAO.buscarPorId(idCliente);

  if (!cliente) {
    throw new Error("Cliente nao encontrado.");
  }

  const agendamentos = await agendamentosDAO.listarPorCliente(idCliente);
  const agendamentoIds = agendamentos.map((item) => Number(item.id));
  const servicosRows = await agendamentosDAO.listarServicosPorAgendamentos(agendamentoIds);

  const servicosMap = new Map();
  for (const row of servicosRows) {
    const idAgendamento = Number(row.agendamento_id);

    if (!servicosMap.has(idAgendamento)) {
      servicosMap.set(idAgendamento, []);
    }

    servicosMap.get(idAgendamento).push({
      id: Number(row.servico_id),
      nome: row.nome,
      preco: Number(row.preco || 0)
    });
  }

  return agendamentos.map((item) => ({
    id: Number(item.id),
    clienteId: Number(item.cliente_id),
    estabelecimentoId: Number(item.estabelecimento_id),
    estabelecimentoNome: item.estabelecimento_nome,
    data: item.data,
    horario: item.horario,
    profissional: item.profissional,
    observacoes: item.observacoes,
    total: Number(item.total || 0),
    status: item.status,
    criadoEm: item.criado_em,
    canceladoEm: item.cancelado_em,
    estabelecimentoLat: item.estabelecimento_lat,
    estabelecimentoLng: item.estabelecimento_lng,
    estabelecimentoEndereco: item.estabelecimento_endereco,
    pagamentoUrl: item.pagamento_url,
    servicos: servicosMap.get(Number(item.id)) || []
  }));
}

// Cancela um agendamento se ele ainda estiver aberto.
async function cancelarAgendamento(agendamentoId) {
  const id = Number(agendamentoId);
  const agendamento = await agendamentosDAO.buscarPorId(id);

  if (!agendamento) {
    throw new Error("Agendamento nao encontrado.");
  }

  if (agendamento.status === "cancelado") {
    throw new Error("Agendamento ja esta cancelado.");
  }

  if (agendamento.status === "concluido") {
    throw new Error("Agendamento concluido nao pode ser cancelado.");
  }

  // Tenta fazer o estorno no Mercado Pago se houver pagamento aprovado
  const pagamentoAprovado = await pagamentosDAO.buscarPagamentoAprovadoPorAgendamento(id);
  if (pagamentoAprovado && pagamentoAprovado.mp_payment_id) {
    try {
      await pagamentosRepository.reembolsarPagamento(pagamentoAprovado.mp_payment_id);
    } catch (error) {
      // Se der erro no estorno, não cancela no banco para evitar perda de sincronia, a menos que você queira forçar
      throw new Error(`Nao foi possivel estornar o pagamento: ${error.message}`);
    }
  }

  await agendamentosDAO.cancelarPorId(id);

  return {
    id,
    status: "cancelado"
  };
}

module.exports = {
  criarAgendamento,
  listarAgendamentosDoCliente,
  cancelarAgendamento
};
