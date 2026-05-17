const express = require("express");
const profissionalController = require("../controllers/profissionalController");

// Cria um roteador separado para as rotas de profissionais.
const router = express.Router();

// Lista profissionais: GET /api/profissionais?empresaId=1
router.get("/", profissionalController.listarProfissionais);

// Cadastra profissional: POST /api/profissionais
router.post("/", profissionalController.cadastrarProfissional);

// Atualiza profissional: PUT /api/profissionais/:id
router.put("/:id", profissionalController.atualizarProfissional);

// Exclui profissional: DELETE /api/profissionais/:id?empresaId=1
router.delete("/:id", profissionalController.excluirProfissional);

// Exporta o roteador para ser usado no server.js.
module.exports = router;
