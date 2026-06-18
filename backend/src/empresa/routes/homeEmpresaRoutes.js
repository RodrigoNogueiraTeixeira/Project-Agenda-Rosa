const express = require("express");
const homeEmpresaController = require("../controllers/homeEmpresaController");

const router = express.Router();

// Resumo exibido na tela inicial da empresa.
router.get("/resumo", homeEmpresaController.buscarResumo);

module.exports = router;
