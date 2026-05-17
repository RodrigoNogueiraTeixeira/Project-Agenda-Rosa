const { Router } = require("express");
const authController = require("../controllers/authController");

const router = Router();

// Realiza login do cliente por email e senha.
router.post("/auth/login", authController.login);

module.exports = router;
