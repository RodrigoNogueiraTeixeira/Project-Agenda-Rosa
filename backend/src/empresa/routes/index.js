const express = require("express");
const empresaController = require("../controllers/empresaController");
const empresaRoutes = require("./empresaRoutes");
const profissionalRoutes = require("./profissionalRoutes");
const servicoRoutes = require("./servicoRoutes");
const horarioRoutes = require("./horarioRoutes");
const bloqueioRoutes = require("./bloqueioRoutes");
const agendamentoRoutes = require("./agendamentoRoutes");
const homeRoutes = require("./homeEmpresaRoutes");

const router = express.Router();

router.use("/cadastro", empresaRoutes);
router.get("/perfil", empresaController.buscarPerfil);
router.put("/perfil", empresaController.atualizarPerfil);
router.use("/profissionais", profissionalRoutes);
router.use("/servicos", servicoRoutes);
router.use("/horarios-funcionamento", horarioRoutes);
router.use("/bloqueios-horarios", bloqueioRoutes);
router.use("/agendamentos", agendamentoRoutes);
router.use("/home-empresa", homeRoutes);

module.exports = router;
