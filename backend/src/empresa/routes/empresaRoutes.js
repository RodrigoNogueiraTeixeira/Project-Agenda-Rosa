const express = require("express");
const empresaController = require("../controllers/empresaController");

const router = express.Router();

// Cadastro inicial da empresa no sistema.
router.post("/", empresaController.cadastrarEmpresa);

module.exports = router;
