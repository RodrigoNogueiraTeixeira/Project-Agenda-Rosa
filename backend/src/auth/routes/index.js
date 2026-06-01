const { Router } = require("express");
const authController = require("../controllers/authController");
const recuperarSenhaController = require("../controllers/recuperarSenhaController");

const router = Router();

// Realiza login do cliente por email e senha
router.post("/auth/login", authController.login);

// Recuperação de senha para clientes e empresas
router.post("/recuperar-senha", recuperarSenhaController.recuperarSenha);

// Redefinição de senha utilizando o token
router.post("/redefinir-senha", recuperarSenhaController.redefinirSenha);

module.exports = router;
