const express = require("express");
const bloqueioHorarioController = require("../controllers/bloqueioHorarioController");

// Cria um roteador separado para as rotas de bloqueios de horario.
const router = express.Router();

// Lista bloqueios da empresa: GET /api/bloqueios-horarios?empresaId=1
router.get("/", bloqueioHorarioController.listarBloqueios);

// Cadastra bloqueio: POST /api/bloqueios-horarios
router.post("/", bloqueioHorarioController.cadastrarBloqueio);

// Remove bloqueio: DELETE /api/bloqueios-horarios/:id?empresaId=1
router.delete("/:id", bloqueioHorarioController.excluirBloqueio);

// Exporta o roteador para ser usado no server.js.
module.exports = router;
