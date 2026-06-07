const { Router } = require("express");
const dashboardController = require("../controllers/dashboardController");
const empresaController = require("../controllers/empresaController");
const relatorioController = require("../controllers/relatorioController");
const categoriaController = require("../controllers/categoriaController");

const router = Router();

// Dashboard
router.get("/dashboard/stats", dashboardController.getDashboard);
router.post("/dashboard/apply-period", dashboardController.applyPeriod);

// Empresas
router.get("/empresas/pendentes", empresaController.getEmpresasPendentes);
router.get("/empresas/:id", empresaController.getEmpresaDetalhes);
router.post("/empresas/:id/aprovar", empresaController.approveEmpresa);
router.post("/empresas/:id/reprovar", empresaController.rejectEmpresa);

// Relatorios
router.get("/relatorios", relatorioController.getRelatorio);

// Categorias
router.get("/categorias", categoriaController.getCategorias);
router.post("/categorias", categoriaController.criarCategoria);
router.put("/categorias/:id", categoriaController.editarCategoria);
router.delete("/categorias/:id", categoriaController.excluirCategoria);

module.exports = router;
