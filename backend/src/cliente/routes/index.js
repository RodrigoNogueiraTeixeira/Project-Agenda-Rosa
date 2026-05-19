const { Router } = require("express");

// Import das rotas separadas por responsabilidade.
const healthRoutes = require("./healthRoutes");
const estabelecimentosRoutes = require("./estabelecimentosRoutes");
const agendamentosRoutes = require("./agendamentosRoutes");
const clientesRoutes = require("./clientesRoutes");
const pagamentosRoutes = require("./pagamentosRoutes");
const distanciaRoutes = require("./distanciaRoutes");

const router = Router();

// Cada "use" registra um conjunto de endpoints.
router.use(healthRoutes);
router.use(estabelecimentosRoutes);
router.use(agendamentosRoutes);
router.use(clientesRoutes);
router.use(pagamentosRoutes);
router.use(distanciaRoutes);

module.exports = router;
