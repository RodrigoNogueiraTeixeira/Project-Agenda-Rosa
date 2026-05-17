const express = require("express");
const homeEmpresaController = require("../controllers/homeEmpresaController");

const router = express.Router();

router.get("/resumo", homeEmpresaController.buscarResumo);

module.exports = router;
