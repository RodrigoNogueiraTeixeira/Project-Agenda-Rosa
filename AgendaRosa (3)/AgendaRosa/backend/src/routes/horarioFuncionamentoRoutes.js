const express = require("express");
const horarioFuncionamentoController = require("../controllers/horarioFuncionamentoController");

// Cria um roteador separado para as rotas de horario de funcionamento.
const router = express.Router();

// Lista horarios da empresa: GET /api/horarios-funcionamento?empresaId=1
router.get("/", horarioFuncionamentoController.listarHorarios);

// Salva todos os horarios semanais: PUT /api/horarios-funcionamento
router.put("/", horarioFuncionamentoController.salvarHorarios);

// Exporta o roteador para ser registrado no server.js.
module.exports = router;
