const { Router } = require("express");
const dashboardController = require("../controllers/dashboardController");
const empresaController = require("../controllers/empresaController");
const relatorioController = require("../controllers/relatorioController");
const categoriaController = require("../controllers/categoriaController");
const { verificarToken } = require("../../middlewares/authMiddleware");

const router = Router();

// Dashboard
router.get("/dashboard/stats", verificarToken("administrador"), dashboardController.getDashboard);
router.post("/dashboard/apply-period", verificarToken("administrador"), dashboardController.applyPeriod);

// Empresas
router.get("/empresas/pendentes", verificarToken("administrador"), empresaController.getEmpresasPendentes);
router.get("/empresas/:id", verificarToken("administrador"), empresaController.getEmpresaDetalhes);
router.post("/empresas/:id/aprovar", verificarToken("administrador"), empresaController.approveEmpresa);
router.post("/empresas/:id/reprovar", verificarToken("administrador"), empresaController.rejectEmpresa);

// Relatorios
router.get("/relatorios", verificarToken("administrador"), relatorioController.getRelatorio);

// Categorias (Apenas Leitura é Pública para os clientes usarem nos filtros)
router.get("/categorias", categoriaController.getCategorias);
router.post("/categorias", verificarToken("administrador"), categoriaController.criarCategoria);
router.put("/categorias/:id", verificarToken("administrador"), categoriaController.editarCategoria);
router.delete("/categorias/:id", verificarToken("administrador"), categoriaController.excluirCategoria);

module.exports = router;
