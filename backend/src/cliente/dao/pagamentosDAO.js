const { all, get, run } = require("../../config/database");

async function criarPedidoPagamento({
  agendamentoId,
  clienteId,
  valorTotal,
  descricao,
  status,
  preferenceId,
  initPoint,
  sandboxInitPoint,
  externalReference
}) {
  const resultado = await run(
    `
      INSERT INTO pagamentos (
        agendamento_id,
        cliente_id,
        valor_total,
        descricao,
        status,
        preference_id,
        init_point,
        sandbox_init_point,
        external_reference,
        criado_em,
        atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      agendamentoId,
      clienteId,
      valorTotal,
      descricao,
      status,
      preferenceId,
      initPoint,
      sandboxInitPoint,
      externalReference,
      new Date().toISOString(),
      new Date().toISOString()
    ]
  );

  return resultado.lastID;
}

async function buscarPagamentoPorId(id) {
  return get(`SELECT * FROM pagamentos WHERE id = ?`, [id]);
}

async function buscarPorExternalReference(externalReference) {
  return get(`SELECT * FROM pagamentos WHERE external_reference = ? LIMIT 1`, [externalReference]);
}

async function atualizarStatusPagamento({ id, status, paymentId, statusDetalhe, brutoWebhook }) {
  await run(
    `
      UPDATE pagamentos
      SET status = ?,
          mp_payment_id = ?,
          status_detalhe = ?,
          bruto_webhook = ?,
          atualizado_em = ?
      WHERE id = ?
    `,
    [status, paymentId || null, statusDetalhe || "", brutoWebhook || "", new Date().toISOString(), id]
  );
}

async function salvarEventoWebhook({ topic, action, dataId, payload }) {
  await run(
    `
      INSERT INTO pagamentos_webhooks (topic, action, data_id, payload, criado_em)
      VALUES (?, ?, ?, ?, ?)
    `,
    [topic || "", action || "", dataId || "", payload || "", new Date().toISOString()]
  );
}

async function listarPagamentosPorCliente(clienteId) {
  return all(
    `
      SELECT *
      FROM pagamentos
      WHERE cliente_id = ?
      ORDER BY id DESC
    `,
    [clienteId]
  );
}

async function buscarPagamentoAprovadoPorAgendamento(agendamentoId) {
  return get(
    `SELECT * FROM pagamentos WHERE agendamento_id = ? AND status = 'approved' ORDER BY id DESC LIMIT 1`,
    [agendamentoId]
  );
}

module.exports = {
  criarPedidoPagamento,
  buscarPagamentoPorId,
  buscarPorExternalReference,
  atualizarStatusPagamento,
  salvarEventoWebhook,
  listarPagamentosPorCliente,
  buscarPagamentoAprovadoPorAgendamento
};
