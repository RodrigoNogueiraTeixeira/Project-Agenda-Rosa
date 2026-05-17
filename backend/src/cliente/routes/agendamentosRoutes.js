const { Router } = require("express");
const agendamentosController = require("../controllers/agendamentosController");

const router = Router();

// Cria um novo agendamento.
router.post("/agendamentos", agendamentosController.criar);

// Lista os agendamentos de um cliente.
router.get("/clientes/:id/agendamentos", agendamentosController.listarPorCliente);

// Cancela um agendamento.
router.patch("/agendamentos/:id/cancelar", agendamentosController.cancelar);

module.exports = router;
