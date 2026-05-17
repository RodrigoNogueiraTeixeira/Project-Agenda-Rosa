const express = require("express");
const servicoController = require("../controllers/servicoController");

// Cria um roteador separado para manter as rotas de servicos organizadas.
const router = express.Router();

// Lista servicos da empresa: GET /api/servicos?empresaId=1
router.get("/", servicoController.listarServicos);

// Cadastra um servico: POST /api/servicos
router.post("/", servicoController.cadastrarServico);

// Atualiza um servico: PUT /api/servicos/:id
router.put("/:id", servicoController.atualizarServico);

// Exclui um servico: DELETE /api/servicos/:id?empresaId=1
router.delete("/:id", servicoController.excluirServico);

// Exporta o roteador para ser usado no server.js.
module.exports = router;
