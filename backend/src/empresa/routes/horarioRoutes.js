const express = require("express");
const horarioController = require("../controllers/horarioController");

const router = express.Router();

router.get("/", horarioController.listarHorarios);
router.put("/", horarioController.salvarHorarios);

module.exports = router;
