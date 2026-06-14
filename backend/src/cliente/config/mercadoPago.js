/**
 * ARQUIVO: mercadoPago.js
 * OBJETIVO: Centralizar as configurações e variáveis de ambiente necessárias para a integração com a API do Mercado Pago.
 * FUNCIONAMENTO: 
 * Este arquivo utiliza a biblioteca 'dotenv' para carregar as chaves e URLs de um arquivo .env. 
 * Ele fornece uma camada de segurança (fail-fast) ao exigir que certas variáveis críticas 
 * existam antes do sistema tentar realizar pagamentos, evitando erros silenciosos.
 */

// ==========================================
// IMPORTAÇÃO: DOTENV (O Cofre de Senhas)
// ==========================================
// O QUE É: 'dotenv' é uma biblioteca externa (instalada via npm) que serve para proteger dados sensíveis.
// FLUXO: No desenvolvimento de software, NUNCA colocamos senhas (como a chave do Mercado Pago) direto no código fonte.
// Se esse código for parar na internet (como no GitHub), hackers poderiam roubar sua conta. 
// Para resolver isso, criamos um arquivo chamado ".env" (que é bloqueado e não vai para a internet) e colocamos as senhas lá. 
// O papel mágico da biblioteca 'dotenv' é abrir esse arquivo '.env' e carregar todas as senhas para dentro da memória do servidor com segurança.
const dotenv = require("dotenv");
// Importa o módulo 'path' nativo do Node.js, para lidar com caminhos de diretórios e arquivos de forma segura e compatível com qualquer sistema operacional (Windows/Linux)
const path = require("path");

// ==========================================
// CONFIGURAÇÃO DO CAMINHO DO ARQUIVO .ENV
// ==========================================
// O QUE É: Dizemos para a biblioteca 'dotenv' exatamente em qual pasta do computador está o arquivo oculto '.env'.
// EXPLICAÇÃO DO CÓDIGO:
// 1. __dirname: É uma variável mágica do Node.js. Ela descobre automaticamente a pasta exata onde ESTE arquivo (mercadoPago.js) está salvo no computador.
// 2. "..": Comando de terminal que significa "volte uma pasta para trás". 
// 3. path.join: É uma ferramenta que junta todos esses pedaços de texto e monta o caminho final perfeitamente, usando as barras corretas (\ no Windows ou / no Linux).
// FLUXO: O arquivo 'mercadoPago.js' está muito escondido dentro das pastas. Então usamos o __dirname para saber onde estamos, 
// e pedimos para o path.join "voltar duas pastas para trás" ("..", "..") até achar o local onde o arquivo '.env' foi colocado.
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

/**
 * FUNÇÃO: obrigatorio
 * OBJETIVO: Validar se uma variável de ambiente essencial foi carregada.
 * FUNCIONAMENTO: Se o valor da variável for "falsy" (undefined, null, string vazia), lança um erro crítico parando a execução. 
 * Isso é conhecido como "Fail-Fast" (falhe rápido). É melhor o sistema nem iniciar se faltar a chave da API (MP_ACCESS_TOKEN), 
 * do que tentar fazer um pagamento depois e dar um erro complexo e difícil de debugar.
 * 
 * Explicando os parâmetros abaixo (padrão de documentação):
 * @param {any} valor - Basicamente a chave api para acessar o mercado pago.
 * @param {string} nome - É apenas um TEXTO (ex: "MP_ACCESS_TOKEN") usado para avisar no console exatamente QUAL variável você esqueceu.
 * @returns {any} Devolve o próprio 'valor' (a chave de acesso) para o sistema usar, caso ele não esteja vazio.
 */
function obrigatorio(valor, nome) {
  if (!valor) {
    // Se a variável não existe, "joga" (throw) um erro. Isso interrompe o fluxo normal e ajuda o desenvolvedor a perceber rapidamente que esqueceu de configurar o .env
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${nome}`);
  }

  // Se passou pela validação acima, retorna o valor para ser usado na configuração
  return valor;
}

/**
 * FUNÇÃO: obterConfigMercadoPago
 * OBJETIVO: Retornar um objeto padronizado com todas as configurações do Mercado Pago que o resto do sistema precisará.
 * FUNCIONAMENTO: Ela lê as variáveis do process.env e mapeia para propriedades de um objeto Javascript. 
 * Algumas são obrigatórias (AccessToken, AppBaseUrl) e outras possuem valores padrão (fallback) se não estiverem no .env.
 * @returns {Object} Objeto contendo as credenciais e URLs configuradas
 */
function obterConfigMercadoPago() {
  return {
    // O 'process.env' é o local de memória do Node.js onde ficam guardadas as "variáveis de ambiente" (segredos).
    // A biblioteca 'dotenv' que configuramos lá na linha 14 pegou o arquivo .env e jogou tudo dentro desse 'process.env'.
    // É por isso que puxamos os dados usando "process.env.NOME_DA_VARIAVEL".

    // ==========================================
    // 1. accessToken (Chave Mestra de Acesso)
    // ==========================================
    // O QUE É: É a credencial (senha) secreta gerada pela sua conta do Mercado Pago (Production ou Test).
    // POR QUE É OBRIGATÓRIA: Toda vez que o nosso sistema mandar um pedido (ex: "Gere um Pix de 50 reais"), o Mercado Pago
    // olha para esse Token para saber que fomos nós (Agenda Rosa) que pedimos, e para saber em qual conta depositar o dinheiro.
    // FLUXO: Sem isso, o Mercado Pago bloqueia a conexão (Erro 401 Unauthorized). Usamos a função 'obrigatorio' para travar o sistema na hora se faltar.
    accessToken: obrigatorio(process.env.MP_ACCESS_TOKEN, "MP_ACCESS_TOKEN"),
    
    // ==========================================
    // 2. baseUrl (Endereço do Servidor do Mercado Pago)
    // ==========================================
    // O QUE É: É o endereço de internet exato para onde o nosso sistema vai disparar as ordens de pagamento.
    // FLUXO: O operador '||' (OU) cria uma segurança de "fallback" (plano B). O sistema tenta ler a URL do arquivo .env. 
    // Se você não colocou nada lá, ele automaticamente assume o endereço oficial "https://api.mercadopago.com".
    // Isso é útil porque permite que, no futuro, você troque o endereço para um servidor falso de testes (Mock) sem precisar alterar o código, mudando apenas no .env.
    baseUrl: process.env.MP_API_BASE_URL || "https://api.mercadopago.com",
    
    // ==========================================
    // 3. appBaseUrl (Endereço do Nosso Sistema)
    // ==========================================
    // O QUE É: É a URL da nossa própria aplicação (ex: http://localhost:3000 em dev ou https://agendarosa.com em produção).
    // POR QUE É OBRIGATÓRIA: Quando o cliente clica para pagar e vai para a tela do Mercado Pago, o Mercado Pago precisa saber
    // para onde mandar o cliente de volta depois que ele pagar (ou se ele desistir). 
    // FLUXO: Nós pegamos essa URL e colamos nas rotas de "back_urls" (success, failure, pending). Se não tiver, o cliente fica perdido numa página do Mercado Pago.
    appBaseUrl: obrigatorio(process.env.APP_BASE_URL, "APP_BASE_URL"),
    
    // ==========================================
    // 4. webhookUrl (O "Telefone" de Notificações)
    // ==========================================
    // O QUE É: É a URL do nosso servidor que fica "escutando" os avisos do Mercado Pago.
    // FLUXO: O cliente fez um agendamento e gerou o Pix (Fica 'Pendente'). Quando ele abre o app do banco e paga, o dinheiro cai no Mercado Pago. 
    // Como nosso sistema descobre isso? O Mercado Pago pega essa 'webhookUrl' e envia uma notificação "silenciosa" (via POST) avisando:
    // "O pagamento 1234 acabou de ser Aprovado!". Nosso sistema recebe e muda o status no banco de dados. 
    // Não é obrigatório aqui (por isso o '|| ""'), mas sem isso, não há atualização automática de status.
    webhookUrl: process.env.MP_WEBHOOK_URL || "",
    
    // ==========================================
    // 5. integratorId (Identificador de Parceiro)
    // ==========================================
    // O QUE É: É um código dado a agências ou softwares parceiros do Mercado Pago.
    // FLUXO: Ao enviar um pagamento, informamos esse ID. Serve apenas para contabilizar comissões ou volume no programa de parcerias deles. 
    // Se o seu sistema não é de uma agência parceira, fica vazio (por isso o '|| ""').
    integratorId: process.env.MP_INTEGRATOR_ID || ""
  };
}

// Exporta as funções para serem utilizadas por outros módulos do sistema (ex: pagamentosRepository)
module.exports = {
  obterConfigMercadoPago
};
