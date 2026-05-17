const express = require("express");
const bloqueioController = require("../controllers/bloqueioController");

const router = express.Router();

router.get("/", bloqueioController.listarBloqueios);
router.post("/", bloqueioController.cadastrarBloqueio);
router.delete("/:id", bloqueioController.excluirBloqueio);

module.exports = router;
