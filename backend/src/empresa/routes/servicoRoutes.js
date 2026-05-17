const express = require("express");
const servicoController = require("../controllers/servicoController");

const router = express.Router();

router.get("/", servicoController.listarServicos);
router.post("/", servicoController.cadastrarServico);
router.put("/:id", servicoController.atualizarServico);
router.delete("/:id", servicoController.excluirServico);

module.exports = router;
