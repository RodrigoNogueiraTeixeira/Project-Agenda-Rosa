const express = require("express");
const agendamentoController = require("../controllers/agendamentoController");

// Cria um roteador separado para manter as rotas da agenda organizadas.
const router = express.Router();

// Lista agendamentos da empresa: GET /api/agendamentos?empresaId=1
router.get("/", agendamentoController.listarAgendamentos);

// Lista profissionais para o filtro da agenda: GET /api/agendamentos/profissionais?empresaId=1
router.get("/profissionais", agendamentoController.listarProfissionais);

// Cria agendamento: POST /api/agendamentos
router.post("/", agendamentoController.cadastrarAgendamento);

// Atualiza status: PATCH /api/agendamentos/:id/status
router.patch("/:id/status", agendamentoController.atualizarStatus);

// Exporta o roteador para ser registrado no server.js.
module.exports = router;
