// ==========================================
// ARQUIVO: clientesRoutes.js
// OBJETIVO: Definir as portas de entrada (endpoints) que o aplicativo de celular do cliente pode acessar no servidor.
// ==========================================

// Importa o construtor 'Router' do framework Express para gerenciar as rotas.
const { Router } = require("express");

// Importa o controlador correspondente que contém as funções de lógica que devem ser disparadas para cada endpoint.
const clientesController = require("../controllers/clientesController");
const { verificarToken } = require("../../middlewares/authMiddleware");

// Instancia o roteador do Express.
const router = Router();

// ROTA 1: Retorna os dados de perfil do cliente.
// Método GET: Utilizado para buscar informações do banco sem fazer alterações.
router.get("/clientes/:id/perfil", verificarToken("cliente"), clientesController.buscarPerfil);

// ROTA 2: Atualiza os dados de perfil do cliente.
// Método PUT: Utilizado para atualizar/substituir informações existentes do cadastro.
router.put("/clientes/:id/perfil", verificarToken("cliente"), clientesController.atualizarPerfil);

// ROTA 3: Cadastra um novo cliente no sistema.
// Método POST: Utilizado para criar novos registros (enviar dados de formulário de cadastro).
router.post("/clientes/cadastro", clientesController.cadastrarCliente);

// Exporta o roteador configurado para que o servidor principal (index.js) possa incorporá-lo.
module.exports = router;
