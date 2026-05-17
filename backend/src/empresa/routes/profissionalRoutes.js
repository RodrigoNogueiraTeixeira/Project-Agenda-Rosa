const express = require("express");
const profissionalController = require("../controllers/profissionalController");

const router = express.Router();

router.get("/", profissionalController.listarProfissionais);
router.post("/", profissionalController.cadastrarProfissional);
router.put("/:id", profissionalController.atualizarProfissional);
router.delete("/:id", profissionalController.excluirProfissional);

module.exports = router;
