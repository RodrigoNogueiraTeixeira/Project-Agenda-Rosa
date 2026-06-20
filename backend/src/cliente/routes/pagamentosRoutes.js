/**
 * ARQUIVO: pagamentosRoutes.js
 * OBJETIVO: Funcionar como a "Porta de Entrada" (roteador) para todas as requisições envolvendo pagamentos.
 * FUNCIONAMENTO: Este arquivo não executa a lógica de negócio pesada. Ele apenas pega a URL que o cliente
 * ou o Mercado Pago acessaram e "redireciona" (joga a bola) para o Controller correto lidar com a situação.
 */

// ==========================================
// IMPORTAÇÃO: EXPRESS (O Motor do Servidor)
// ==========================================
// O QUE É: O Express é a biblioteca mais famosa do Node.js, usada para criar servidores web. 
// Aqui estamos importando apenas a ferramenta 'Router' (Roteador) de dentro do Express. 
// É ela que permite criar as URLs (links) do nosso sistema, como "/pagamentos/mercadopago/preference".
const { Router } = require("express");
// Importa o "Guarda de Trânsito" (Controller) que sabe o que fazer com cada pedido
const pagamentosController = require("../controllers/pagamentosController");
const { verificarToken } = require("../../auth/authMiddleware");

// Inicializa o roteador do Express que usaremos para definir as URLs (endpoints) do fluxo de pagamentos.
const router = Router();

// ==========================================
// ROTA 1: Verificar se a Configuração está OK
// ==========================================
// O QUE É: Uma rota do tipo GET (Apenas leitura/consulta).
// FLUXO: O frontend chama essa rota antes de mostrar o botão de pagamento pro cliente. 
// O controller verifica se a chave do Mercado Pago (lá do mercadoPago.js) está presente. 
// Se não estiver, o frontend esconde o botão de pagamento para evitar que o cliente tente pagar e o sistema quebre.
router.get("/pagamentos/mercadopago/status-config", pagamentosController.statusConfiguracao);

// ==========================================
// ROTA 2: Criar Pedido de Pagamento (Preference)
// ==========================================
// O QUE É: Uma rota do tipo POST (Envio de dados novos). 'Preference' é o nome que o Mercado Pago dá para um "Pedido de Cobrança".
// FLUXO: O cliente clica em "Pagar" no frontend. O frontend manda um POST para cá com os dados do agendamento (Ex: Agendamento 5, Valor R$50).
// O controller recebe, manda criar a cobrança lá no Mercado Pago, e devolve um LINK DE CHECKOUT. 
// O frontend pega esse link e redireciona o cliente para a tela oficial do Mercado Pago para pagar com Cartão ou Pix.
router.post("/pagamentos/mercadopago/preference", verificarToken("cliente"), pagamentosController.criarPreferencia);

// ==========================================
// ROTA 3: Receber Avisos do Mercado Pago se foi pago ou nao, avisa o banco de dados
// ==========================================
// O QUE É: Uma rota do tipo POST. ATENÇÃO: Quem chama essa rota NÃO É o seu frontend, é o próprio servidor do Mercado Pago!
// FLUXO: O Mercado Pago vai enviar um POST "invisível" para ESSE endereço
// toda vez que um cliente pagar o Pix no aplicativo do banco dele. O Controller recebe esse aviso, descobre qual foi o agendamento pago,
// e manda o banco de dados atualizar o status de "PENDENTE" para "APROVADO".
router.post("/pagamentos/mercadopago/webhook", pagamentosController.webhookMercadoPago);

// ==========================================
// ROTA 4: Consultar o Status de um Pagamento para demonstrar de forma visual o status do pagamento
// ==========================================
// O QUE É: Uma rota do tipo GET. Aquele ":id" na URL é um parâmetro dinâmico (ex: /pagamentos/123).
// FLUXO: Usado caso o cliente queira ver o recibo de um pagamento. O Controller vai procurar esse ID do pagamento
// no nosso próprio banco de dados local (SQLite), para ver se ele está Pendente ou Aprovado.
router.get("/pagamentos/:id", verificarToken("cliente"), pagamentosController.buscarPagamento);

// Exporta o roteador para que o arquivo principal do servidor possa plugar essas rotas e expô-las na rede.
module.exports = router;
