const express = require("express");
const empresaController = require("../controllers/empresaController");
const empresaRoutes = require("./empresaRoutes");
const profissionalRoutes = require("./profissionalRoutes");
const servicoRoutes = require("./servicoRoutes");
const horarioRoutes = require("./horarioRoutes");
const bloqueioRoutes = require("./bloqueioRoutes");
const agendamentoRoutes = require("./agendamentoRoutes");
const homeRoutes = require("./homeEmpresaRoutes");
const { verificarToken } = require("../../middlewares/authMiddleware");

const router = express.Router();

// Agrupa os endpoints da area da empresa por funcionalidade.

// Rota publica de cadastro
router.use("/cadastro", empresaRoutes);

// Rotas protegidas (apenas perfil de empresa logado tem acesso)
router.use(verificarToken("empresa"));

router.get("/perfil", empresaController.buscarPerfil);
router.put("/perfil", empresaController.atualizarPerfil);
router.use("/profissionais", profissionalRoutes);
router.use("/servicos", servicoRoutes);
router.use("/horarios-funcionamento", horarioRoutes);
router.use("/bloqueios-horarios", bloqueioRoutes);
router.use("/agendamentos", agendamentoRoutes);
router.use("/home-empresa", homeRoutes);

module.exports = router;
