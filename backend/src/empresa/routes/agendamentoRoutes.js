const express = require("express");
const agendamentoController = require("../controllers/agendamentoController");

const router = express.Router();

// Rotas usadas pela agenda da empresa.
router.get("/", agendamentoController.listarAgendamentos);
router.get("/profissionais", agendamentoController.listarProfissionais);
router.post("/", agendamentoController.cadastrarAgendamento);
router.patch("/:id/status", agendamentoController.atualizarStatus);

module.exports = router;
