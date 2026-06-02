const agendamentosDAO = require("../dao/agendamentosDAO");
const clientesDAO = require("../dao/clientesDAO");
const estabelecimentosRepository = require("./estabelecimentosRepository");
const pagamentosDAO = require("../dao/pagamentosDAO");
const pagamentosRepository = require("./pagamentosRepository");

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

  // Buscar profissionais para resolver nomes e IDs e fazer auto-atribuição se "Sem preferência"
  const estabelecimentosDAO = require("../dao/estabelecimentosDAO");
  const profissionais = await estabelecimentosDAO.listarProfissionaisPorEstabelecimento(estabelecimentoId);
  
  let profissionalNome = "Sem preferência";
  let finalProfissionalId = null;

  if (profissionalId && profissionalId !== "qualquer" && profissionalId !== "") {
    const { get } = require("../../config/database");
    const profRow = await get("SELECT nome FROM profissionais WHERE id = ?", [Number(profissionalId)]);
    if (profRow) {
      profissionalNome = profRow.nome;
      finalProfissionalId = Number(profissionalId);
    } else {
      throw new Error("Profissional selecionado nao encontrado.");
    }
  } else if (profissionais.length > 0) {
    // "Sem preferência": Auto-atribui o primeiro profissional ativo que estiver livre
    const { get } = require("../../config/database");
    for (const prof of profissionais) {
      const conflitoProf = await get(
        `
          SELECT id
          FROM agendamentos
          WHERE estabelecimento_id = ?
            AND data = ?
            AND (
              status IN ('agendado', 'concluido')
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
        break;
      }
    }
  }

  // Validar se há conflito para o profissional selecionado (ou se todos estão ocupados se "Sem preferência")
  const temConflito = await agendamentosDAO.existeConflitoDeHorario({
    estabelecimentoId,
    data,
    horario,
    horarioFim,
    profissionalId: finalProfissionalId || "qualquer"
  });

  if (temConflito) {
    throw new Error("Esse horario ja esta ocupado para o profissional selecionado ou a agenda esta lotada.");
  }

  // Buscar o empresa_id associado ao estabelecimento pelos servicos cadastrados
  const { get } = require("../../config/database");
  const servicoEmpresa = await get(
    "SELECT DISTINCT empresa_id FROM servicos WHERE estabelecimento_id = ? AND empresa_id IS NOT NULL LIMIT 1",
    [estabelecimentoId]
  );
  const empresaId = servicoEmpresa ? servicoEmpresa.empresa_id : estabelecimentoId; // Fallback

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
