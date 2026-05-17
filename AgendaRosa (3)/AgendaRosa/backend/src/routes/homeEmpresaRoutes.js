const express = require("express");
const homeEmpresaController = require("../controllers/homeEmpresaController");

// Cria um roteador separado para os indicadores da home.
const router = express.Router();

// Busca resumo da home: GET /api/home-empresa/resumo?empresaId=1
router.get("/resumo", homeEmpresaController.buscarResumo);

// Exporta o roteador para ser registrado no server.js.
module.exports = router;
