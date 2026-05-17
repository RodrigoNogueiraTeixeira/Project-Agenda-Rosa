const { Router } = require("express");
const estabelecimentosController = require("../controllers/estabelecimentosController");

const router = Router();

// Lista estabelecimentos com filtros opcionais.
router.get("/estabelecimentos", estabelecimentosController.listar);

// Busca detalhes de um estabelecimento especifico.
router.get("/estabelecimentos/:id", estabelecimentosController.buscarPorId);

// Busca horarios ocupados de um estabelecimento.
router.get("/estabelecimentos/:id/horarios-ocupados", estabelecimentosController.horariosOcupados);

module.exports = router;
