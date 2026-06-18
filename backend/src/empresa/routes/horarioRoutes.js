const express = require("express");
const horarioController = require("../controllers/horarioController");

const router = express.Router();

// Rotas para consultar e salvar horarios de funcionamento.
router.get("/", horarioController.listarHorarios);
router.put("/", horarioController.salvarHorarios);

module.exports = router;
