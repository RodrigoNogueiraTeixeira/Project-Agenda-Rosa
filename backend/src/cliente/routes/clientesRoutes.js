const { Router } = require("express");
const clientesController = require("../controllers/clientesController");

const router = Router();

// Retorna os dados de perfil do cliente.
router.get("/clientes/:id/perfil", clientesController.buscarPerfil);

// Atualiza os dados de perfil do cliente.
router.put("/clientes/:id/perfil", clientesController.atualizarPerfil);

// Cadastra um novo cliente.
router.post("/clientes/cadastro", clientesController.cadastrarCliente);

module.exports = router;
