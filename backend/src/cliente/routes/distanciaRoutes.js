const { Router } = require("express");
const distanciaController = require("../controllers/distanciaController");

const router = Router();

// Calcula distancia de um endereco de origem para um endereco de destino.
router.post("/distancia/calcular", distanciaController.calcular);

// Filtra estabelecimentos dentro do raio informado.
router.post("/distancia/filtrar-estabelecimentos", distanciaController.filtrarPorRaio);

module.exports = router;
