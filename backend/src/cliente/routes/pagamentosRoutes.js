const { Router } = require("express");
const pagamentosController = require("../controllers/pagamentosController");

const router = Router();

// Verifica se as variaveis essenciais de pagamento estao configuradas.
router.get("/pagamentos/mercadopago/status-config", pagamentosController.statusConfiguracao);

// Cria preferencia no Mercado Pago para redirecionamento externo.
router.post("/pagamentos/mercadopago/preference", pagamentosController.criarPreferencia);

// Recebe notificacoes do Mercado Pago.
router.post("/pagamentos/mercadopago/webhook", pagamentosController.webhookMercadoPago);

// Consulta pagamento salvo localmente.
router.get("/pagamentos/:id", pagamentosController.buscarPagamento);

module.exports = router;
