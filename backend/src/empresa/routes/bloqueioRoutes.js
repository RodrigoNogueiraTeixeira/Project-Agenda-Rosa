const express = require("express");
const bloqueioController = require("../controllers/bloqueioController");

const router = express.Router();

// Rotas para listar, cadastrar e remover bloqueios de horarios.
router.get("/", bloqueioController.listarBloqueios);
router.post("/", bloqueioController.cadastrarBloqueio);
router.delete("/:id", bloqueioController.excluirBloqueio);

module.exports = router;
