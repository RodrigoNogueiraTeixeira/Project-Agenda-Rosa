/**
 * ARQUIVO: pagamentosController.js
 * OBJETIVO: Funcionar como o "Guarda de Trânsito" das requisições de pagamento.
 * FUNCIONAMENTO: As rotas (pagamentosRoutes.js) recebem os pedidos da internet e jogam para cá.
 * O Controller não faz lógica pesada (não salva no banco, não chama a API do Mercado Pago diretamente).
 * O papel dele é apenas:
 * 1. Receber o que o cliente mandou (req.body ou req.params).
 * 2. Mandar para o Repository processar.
 * 3. Pegar a resposta do Repository e devolver para o cliente (com o código HTTP correto, ex: 200 OK, 400 Erro).
 */

// Importa o "Mão na Massa" (Repository) que vai realmente executar a lógica pesada de falar com o Mercado Pago
const pagamentosRepository = require("../repositories/pagamentosRepository");

/**
 * FUNÇÃO: statusConfiguracao
 * O QUE FAZ: Responde ao frontend se a aplicação está pronta para aceitar pagamentos.
 * FLUXO: O frontend pergunta "Tá tudo OK com o Mercado Pago?". O Controller pergunta pro Repository, 
 * pega a resposta (Sim/Não) e devolve pro frontend com o código 200 (Sucesso).
 */
async function statusConfiguracao(_req, res) {
  const status = pagamentosRepository.validarConfiguracaoMercadoPago();
  res.status(200).json(status);
}

/**
 * FUNÇÃO: criarPreferencia
 * O QUE FAZ: Pede para o Repository gerar a cobrança (Preference) no Mercado Pago.
 * FLUXO: 
 * 1. Pega os dados do cliente (req.body) e manda pro Repository.
 * 2. Se der certo, devolve o link de pagamento com o código HTTP 201 (Criado com Sucesso).
 * 3. Se der erro, cai no bloco "catch" para decidir qual código de erro devolver.
 */
async function criarPreferencia(req, res) {
  try {
    const resultado = await pagamentosRepository.criarPreferenciaCheckout(req.body || {});
    // Devolve HTTP 201: Significa "Created" (Criado). Uma nova cobrança nasceu!
    res.status(201).json({
      mensagem: "Preferencia criada com sucesso.",
      pagamento: resultado
    });
  } catch (error) {
    // Se algo quebrar, capturamos a mensagem de erro que o Repository gerou.
    const mensagem = error.message || "Erro ao criar preferencia de pagamento.";
    
    // ============================================================
    // EXPLICANDO O FLUXO DO "IF" (Operador Ternário) ABAIXO:
    // ============================================================
    // Isso é um IF escrito em uma linha só. O que ele está fazendo:
    // PERGUNTA: A mensagem de erro tem a palavra "nao encontrado" OU "autorizado"?
    // SE SIM (?): A variável 'status' vai valer 404 (Not Found - Ex: O agendamento procurado não existe).
    // SE NÃO (:): A variável 'status' vai valer 400 (Bad Request - Ex: Cliente preencheu os dados errado).
    const status = mensagem.includes("nao encontrado") || mensagem.includes("autorizado") ? 404 : 400;
    
    // Devolve o erro pro frontend com o número correto que decidimos acima
    res.status(status).json({ erro: mensagem });
  }
}

/**
 * FUNÇÃO: webhookMercadoPago 
 * O QUE FAZ: Recebe a notificação (webhook) do Mercado Pago quando o Pix/Cartão é aprovado.
 * FLUXO: O MP manda os dados da cobrança. O Controller joga pro Repository processar e mudar o banco para "APROVADO".
 */
async function webhookMercadoPago(req, res) {
  try {
    await pagamentosRepository.processarWebhookMercadoPago(req.body || {});
    // Devolve HTTP 200 (OK): Avisando o Mercado Pago "Obrigado, recebemos e atualizamos o banco!"
    res.status(200).json({ ok: true });
  } catch (_error) {
    // ============================================================
    // EXPLICANDO O TRUQUE DESTE CATCH (Por que não devolver erro?)
    // ============================================================
    // Se devolvermos um erro (Ex: 400 ou 500) pro Mercado Pago, ele vai achar que a mensagem
    // não chegou ou caiu no vazio. O que ele faz? Ele fica "bombardeando" e reenviando a mesma notificação sem parar, 
    // podendo travar o nosso servidor (loop infinito). 
    // Então, mesmo se der erro, nós mentimos e devolvemos 200 "ok: true" só pro Mercado Pago parar de enviar mensagens.
    res.status(200).json({ ok: true });
  }
}

/**
 * FUNÇÃO: buscarPagamento
 * O QUE FAZ: Procura um pagamento salvo no nosso banco de dados local.
 * FLUXO: Pega o ID da URL (req.params.id) e manda pro Repository pesquisar. Se achar, devolve os dados.
 */
async function buscarPagamento(req, res) {
  try {
    const pagamento = await pagamentosRepository.buscarPagamentoPorId(req.params.id);
    res.status(200).json({ pagamento });
  } catch (error) {
    const mensagem = error.message || "Erro ao buscar pagamento.";
    
    // ============================================================
    // EXPLICANDO O FLUXO DO "IF" (Operador Ternário) ABAIXO:
    // ============================================================
    // PERGUNTA: A mensagem de erro contém o texto "nao encontrado"?
    // SE SIM (?): O status é 404 (Not Found - Significa que o ID da cobrança não existe no nosso banco).
    // SE NÃO (:): O status é 400 (Bad Request - Algum outro erro genérico).
    const status = mensagem.includes("nao encontrado") ? 404 : 400;
    
    res.status(status).json({ erro: mensagem });
  }
}

module.exports = {
  statusConfiguracao,
  criarPreferencia,
  webhookMercadoPago,
  buscarPagamento
};
