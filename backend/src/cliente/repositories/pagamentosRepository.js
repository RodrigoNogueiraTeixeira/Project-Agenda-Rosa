const agendamentosDAO = require("../dao/agendamentosDAO");
const pagamentosDAO = require("../dao/pagamentosDAO");
const { obterConfigMercadoPago } = require("../config/mercadoPago");

function montarDescricao(agendamento) {
  return `Agendamento #${agendamento.id} - ${agendamento.estabelecimento_nome || "Agenda Rosa"}`;
}

function validarConfiguracaoMercadoPago() {
  try {
    obterConfigMercadoPago();
    return { configurado: true, mensagem: "ok" };
  } catch (error) {
    return { configurado: false, mensagem: error.message || "Configuracao ausente." };
  }
}

async function criarPreferenciaCheckout({ agendamentoId, clienteId }) {
  const idAgendamento = Number(agendamentoId);
  const idCliente = Number(clienteId);

  if (!Number.isFinite(idAgendamento) || !Number.isFinite(idCliente)) {
    throw new Error("Dados invalidos para pagamento.");
  }

  const agendamento = await agendamentosDAO.buscarPorId(idAgendamento);
  if (!agendamento) {
    throw new Error("Agendamento nao encontrado.");
  }

  if (Number(agendamento.cliente_id) !== idCliente) {
    throw new Error("Cliente nao autorizado para este agendamento.");
  }

  const config = obterConfigMercadoPago();
  const externalReference = `agenda-rosa-${idAgendamento}-${Date.now()}`;
  const descricao = montarDescricao(agendamento);

  const body = {
    items: [
      {
        title: descricao,
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(agendamento.total || 0)
      }
    ],
    external_reference: externalReference,
    back_urls: {
      success: `${config.appBaseUrl}/html/pagamentoSucesso.html`,
      pending: `${config.appBaseUrl}/html/pagamentoPendente.html`,
      failure: `${config.appBaseUrl}/html/pagamentoFalha.html`
    },
    auto_return: "approved",
    notification_url: config.webhookUrl || undefined,
    metadata: {
      agendamento_id: idAgendamento,
      cliente_id: idCliente
    }
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.accessToken}`
  };

  if (config.integratorId) {
    headers["x-integrator-id"] = config.integratorId;
  }

  const resposta = await fetch(`${config.baseUrl}/checkout/preferences`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.message || "Falha ao criar preferencia no Mercado Pago.");
  }

  const pagamentoId = await pagamentosDAO.criarPedidoPagamento({
    agendamentoId: idAgendamento,
    clienteId: idCliente,
    valorTotal: Number(agendamento.total || 0),
    descricao,
    status: "pendente",
    preferenceId: dados.id || "",
    initPoint: dados.init_point || "",
    sandboxInitPoint: dados.sandbox_init_point || "",
    externalReference
  });

  return {
    pagamentoId,
    preferenceId: dados.id,
    initPoint: dados.init_point,
    sandboxInitPoint: dados.sandbox_init_point,
    externalReference
  };
}

async function processarWebhookMercadoPago(payload) {
  const topic = payload.type || payload.topic || "";
  const action = payload.action || "";
  const dataId = String((payload.data && payload.data.id) || "");

  await pagamentosDAO.salvarEventoWebhook({
    topic,
    action,
    dataId,
    payload: JSON.stringify(payload || {})
  });

  if (!dataId) {
    return { processado: false, motivo: "sem_data_id" };
  }

  const config = obterConfigMercadoPago();
  const resposta = await fetch(`${config.baseUrl}/v1/payments/${dataId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.accessToken}`
    }
  });

  const dadosPagamento = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    return { processado: false, motivo: "nao_foi_possivel_consultar_pagamento" };
  }

  const externalReference = String(dadosPagamento.external_reference || "");
  if (!externalReference) {
    return { processado: false, motivo: "sem_external_reference" };
  }

  const pagamentoLocal = await pagamentosDAO.buscarPorExternalReference(externalReference);
  if (!pagamentoLocal) {
    return { processado: false, motivo: "pagamento_local_nao_encontrado" };
  }

  const novoStatusPagamento = String(dadosPagamento.status || "pendente");

  await pagamentosDAO.atualizarStatusPagamento({
    id: pagamentoLocal.id,
    status: novoStatusPagamento,
    paymentId: String(dadosPagamento.id || ""),
    statusDetalhe: String(dadosPagamento.status_detail || ""),
    brutoWebhook: JSON.stringify(dadosPagamento)
  });

  // Se o pagamento foi aprovado, muda o status do agendamento para agendado.
  // Caso contrário, ele continua como pendente (ou poderia ser cancelado em caso de falha definitiva).
  if (novoStatusPagamento === "approved") {
    await agendamentosDAO.atualizarStatus(pagamentoLocal.agendamento_id, "agendado");
  }

  return { processado: true };
}

async function buscarPagamentoPorId(pagamentoId) {
  const id = Number(pagamentoId);
  if (!Number.isFinite(id)) {
    throw new Error("Pagamento invalido.");
  }

  const pagamento = await pagamentosDAO.buscarPagamentoPorId(id);
  if (!pagamento) {
    throw new Error("Pagamento nao encontrado.");
  }

  return pagamento;
}

// Estorna o pagamento no Mercado Pago
async function reembolsarPagamento(paymentId) {
  if (!paymentId) return;
  const config = obterConfigMercadoPago();
  const resposta = await fetch(`${config.baseUrl}/v1/payments/${paymentId}/refunds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": require("crypto").randomUUID()
    }
  });

  if (!resposta.ok) {
    const errorData = await resposta.json().catch(() => ({}));
    throw new Error(errorData.message || "Erro ao processar reembolso no Mercado Pago.");
  }
  
  return resposta.json();
}

module.exports = {
  validarConfiguracaoMercadoPago,
  criarPreferenciaCheckout,
  processarWebhookMercadoPago,
  buscarPagamentoPorId,
  reembolsarPagamento
};
