const express = require("express");
const clientRoutes = require("../cliente/routes");
const empresaRoutes = require("../empresa/routes");
const administradorRoutes = require("../administrador/routes");

const router = express.Router();

// Rotas do Cliente (Existentes)
router.use("/cliente", clientRoutes);

// Rotas da Empresa (Novas)
router.use("/empresa", empresaRoutes);

// Rotas do Administrador (Novas)
router.use(administradorRoutes);

// Atalho para manter compatibilidade com rotas que não tinham prefixo /cliente (se necessário)
// Por enquanto, vamos deixar as rotas do cliente no nível raiz também para não quebrar o front atual.
router.use(clientRoutes);

module.exports = router;
