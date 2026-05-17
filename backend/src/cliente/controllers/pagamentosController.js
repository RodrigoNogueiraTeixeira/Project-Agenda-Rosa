const pagamentosRepository = require("../repositories/pagamentosRepository");

async function statusConfiguracao(_req, res) {
  const status = pagamentosRepository.validarConfiguracaoMercadoPago();
  res.status(200).json(status);
}

async function criarPreferencia(req, res) {
  try {
    const resultado = await pagamentosRepository.criarPreferenciaCheckout(req.body || {});
    res.status(201).json({
      mensagem: "Preferencia criada com sucesso.",
      pagamento: resultado
    });
  } catch (error) {
    const mensagem = error.message || "Erro ao criar preferencia de pagamento.";
    const status = mensagem.includes("nao encontrado") || mensagem.includes("autorizado") ? 404 : 400;
    res.status(status).json({ erro: mensagem });
  }
}

async function webhookMercadoPago(req, res) {
  try {
    await pagamentosRepository.processarWebhookMercadoPago(req.body || {});
    res.status(200).json({ ok: true });
  } catch (_error) {
    // Sempre devolvemos 200 para evitar reenvio infinito em ambiente de teste.
    res.status(200).json({ ok: true });
  }
}

async function buscarPagamento(req, res) {
  try {
    const pagamento = await pagamentosRepository.buscarPagamentoPorId(req.params.id);
    res.status(200).json({ pagamento });
  } catch (error) {
    const mensagem = error.message || "Erro ao buscar pagamento.";
    const status = mensagem.includes("nao encontrado") ? 404 : 400;
    res.status(status).json({ erro: mensagem });
  }
}

module.exports = {
  statusConfiguracao,
  criarPreferencia,
  webhookMercadoPago,
  buscarPagamento
};
