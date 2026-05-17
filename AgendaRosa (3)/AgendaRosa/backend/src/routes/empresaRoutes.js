const express = require("express");
const empresaController = require("../controllers/empresaController");

const router = express.Router();

router.post("/", empresaController.cadastrarEmpresa);

module.exports = router;
