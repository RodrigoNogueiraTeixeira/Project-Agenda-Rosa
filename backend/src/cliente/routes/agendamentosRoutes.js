const { Router } = require("express");
const agendamentosController = require("../controllers/agendamentosController");
const { verificarToken } = require("../../middlewares/authMiddleware");

const router = Router();

// Cria um novo agendamento.
router.post("/agendamentos", verificarToken("cliente"), agendamentosController.criar);

// Lista os agendamentos de um cliente.
router.get("/clientes/:id/agendamentos", verificarToken("cliente"), agendamentosController.listarPorCliente);

// Cancela um agendamento.
router.patch("/agendamentos/:id/cancelar", verificarToken("cliente"), agendamentosController.cancelar);

module.exports = router;
