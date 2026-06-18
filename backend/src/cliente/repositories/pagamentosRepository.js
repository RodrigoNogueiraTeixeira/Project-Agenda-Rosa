/**
 * ARQUIVO: pagamentosRepository.js
 * OBJETIVO: É o "Mão na Massa". Esse arquivo é o único que conversa diretamente com a API do Mercado Pago.
 * É aqui que coisas avançadas de Javascript acontecem, como chamadas de rede (fetch) e assincronismo (async/await).
 */

const agendamentosDAO = require("../dao/agendamentosDAO");
const pagamentosDAO = require("../dao/pagamentosDAO");
const { obterConfigMercadoPago } = require("../config/mercadoPago");

/**
 * FUNÇÃO: montarDescricao
 * O QUE FAZ: Cria o título que vai aparecer na fatura do cartão ou no app do banco do cliente.
 * CONCEITO BÁSICO: Usa a "crase" (Template Literal) para injetar variáveis dentro do texto usando ${}.
 */
function montarDescricao(agendamento) {
  return `Agendamento #${agendamento.id} - ${agendamento.estabelecimento_nome || "Agenda Rosa"}`;
}

/**
 * FUNÇÃO: validarConfiguracaoMercadoPago
 * O QUE FAZ: Testa se as chaves da API estão no arquivo .env.
 * CONCEITO: O bloco try/catch serve para "tentar" rodar um código perigoso que pode quebrar (dar erro). 
 * Se quebrar, o "catch" amortece a queda e devolve configurado: false ao invés de travar o sistema.
 */
function validarConfiguracaoMercadoPago() {
  try {
    obterConfigMercadoPago();
    return { configurado: true, mensagem: "ok" };
  } catch (error) {
    return { configurado: false, mensagem: error.message || "Configuracao ausente." };
  }
}

/**
 * FUNÇÃO: criarPreferenciaCheckout
 * O QUE FAZ: Cria o link de pagamento no Mercado Pago.
 * 
 * =======================
 * EXPLICANDO AS FUNÇÕES:
 * =======================
 * 1. async/await: Toda vez que o sistema precisa conversar com o Banco de Dados ou com a Internet, 
 *    isso demora alguns milissegundos. O "await" manda o Javascript "esperar" a resposta chegar antes de continuar para a próxima linha.
 *    Para usar o "await" dentro de uma função, ela é obrigada a ter a palavra "async" no começo.
 * 
 * 2. { agendamentoId, clienteId }: Isso se chama "Desestruturação". Significa que a função espera receber 
 *    um objeto inteiro como parâmetro, mas ela já extrai/pega SÓ o ID do agendamento e o ID do cliente logo de cara, ignorando o resto.
 */
async function criarPreferenciaCheckout({ agendamentoId, clienteId }) {
  // Converte os textos para Número
  const idAgendamento = Number(agendamentoId);
  const idCliente = Number(clienteId);

  // Number.isFinite verifica se é um número válido mesmo (e não um texto corrompido como "NaN")
  if (!Number.isFinite(idAgendamento) || !Number.isFinite(idCliente)) {
    throw new Error("Dados invalidos para pagamento.");
  }

  // "await": Espera o banco de dados procurar o agendamento antes de continuar
  const agendamento = await agendamentosDAO.buscarPorId(idAgendamento);
  if (!agendamento) {
    throw new Error("Agendamento nao encontrado.");
  }

  if (Number(agendamento.cliente_id) !== idCliente) {
    throw new Error("Cliente nao autorizado para este agendamento.");
  }

  const config = obterConfigMercadoPago();
  // Cria um código único de identificação juntando a palavra "agenda-rosa", o ID e a data/hora atual (Date.now)
  const externalReference = `agenda-rosa-${idAgendamento}-${Date.now()}`;
  const descricao = montarDescricao(agendamento);

  // Monta o "Corpo" (body) da mensagem que vamos enviar para o Mercado Pago com os dados do pedido.
  const body = {
    items: [
      {
        title: descricao,
        quantity: 1,
        currency_id: "BRL", // Moeda (Real Brasileiro)
        unit_price: Number(agendamento.total || 0)
      }
    ],

    //////
    // e passado para o mercado pago a cobrança
    /////
    // 'external_reference': É a placa de identificação que NÓS damos para a cobrança.
    // Quando o Mercado Pago nos avisar que o pagamento caiu, ele vai devolver essa mesma "placa" (ex: agenda-rosa-5-1234)
    // para podermos procurar no nosso banco de dados a qual agendamento aquele dinheiro pertence.
    external_reference: externalReference, 
    


    /////
    // sao as paginas de redirecionamento, para voltar o cliente ao site.
    /////
    // 'back_urls': O que acontece depois que o cliente termina de digitar o cartão lá na tela do Mercado Pago?
    // O Mercado Pago precisa de links para redirecionar (mandar de volta) o cliente para o nosso site.
    back_urls: {
      // Se a operadora do cartão aprovou: Manda para a tela de Sucesso.
      success: `${config.appBaseUrl}/html/pagamentoSucesso.html`,
      // Se gerou um Pix (ainda não pagou) ou o banco demorou pra responder: Manda para Pendente.
      pending: `${config.appBaseUrl}/html/pagamentoPendente.html`,
      // Se o cartão foi recusado ou digitado errado: Manda para a tela de Falha.
      failure: `${config.appBaseUrl}/html/pagamentoFalha.html`
    },


    /////
    // se o pagamento for aprovado de forma instantanea volta o cliente.
    /////
    // 'auto_return': Trabalha junto com as 'back_urls' acima. 
    // O valor "approved" significa que, se o pagamento for aprovado instantaneamente, o Mercado Pago joga o cliente 
    // de volta pro nosso site AUTOMATICAMENTE, sem o cliente precisar clicar em um botão "Voltar para o site da loja".
    auto_return: "approved",


    /////
    // recebe notificacoes se caso o pagamento foi efetuado ou alguma novidade
    /////
    // 'notification_url': É o "telefone" do nosso servidor (o Webhook!).
    // Passamos esse link para o Mercado Pago e dizemos: "Se houver qualquer novidade nesse Pix/Cartão, mande um aviso aqui!"
    // O '|| undefined' garante que, se não tivermos essa URL no momento, o campo é ignorado sem dar erro de sistema.
    notification_url: config.webhookUrl || undefined, 
    
    //////
    // E um bolso secreto, onde enviamos para o mercado pago id do agendamento e do cliente, apenas para que
    // o adm tenha nocao do pagamento efetuado e qual foi o agndamento.
    ////// 
    // 'metadata': É como um bolso secreto do Mercado Pago.
    // Ele não usa isso pra nada, mas permite que a gente esconda dados úteis ali dentro (como o ID do Agendamento e do Cliente).
    // Assim, se a dona do salão abrir o site oficial do Mercado Pago para conferir a conta, ela vai ver de qual agendamento é o dinheiro.
    metadata: {
      agendamento_id: idAgendamento,
      cliente_id: idCliente
    }
  };

  const headers = {
    "Content-Type": "application/json",
    // A chave que abre a porta do servidor do Mercado Pago (Bearer Token)
    Authorization: `Bearer ${config.accessToken}`
  };

  ///////
  // parceria, se formos parceiro ganhamos recompensas (implementacao futura)
  ///////
  // Se a empresa Agenda Rosa for uma agência parceira oficial do Mercado Pago,
  // ela vai ter um código de parceiro (integratorId). 
  // Esse 'if' faz o seguinte: "Se existir um código de parceiro configurado, anexe ele no 'cabeçalho' da mensagem".
  // Assim, o Mercado Pago sabe que essa venda foi gerada pelo nosso software e pode contabilizar pontos/comissões no painel de parceiros!
  if (config.integratorId) {
    headers["x-integrator-id"] = config.integratorId;
  }


  ///////
  // aqui enviamos para o mercado pago as configuracoes que fizemos.
  ///////
  // =====================================
  // EXPLICANDO O FETCH:
  // =====================================
  // O 'fetch' é o "telefone" do Javascript. Ele é a ferramenta usada para ligar para as URLs de outros sistemas (como o MP).
  // method: "POST" significa que estamos enviando um pacote de dados (body) para criar uma cobrança lá.
  // JSON.stringify: Converte o objeto Javascript 'body' em puro Texto, porque a internet só trafega mensagens de texto.
  const resposta = await fetch(`${config.baseUrl}/checkout/preferences`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  // Tenta transformar a resposta de texto do Mercado Pago de volta para um Objeto Javascript (json).
  // O ".catch(() => ({}))" diz: "Se a conversão der erro, apenas me devolva um objeto vazio {} para não travar o sistema".
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.message || "Falha ao criar preferencia no Mercado Pago.");
  }


  // Salva no nosso próprio banco de dados que esse pagamento acabou de ser "PENDENTE"
  const pagamentoId = await pagamentosDAO.criarPedidoPagamento({
    agendamentoId: idAgendamento,
    clienteId: idCliente,
    valorTotal: Number(agendamento.total || 0),
    descricao,
    status: "pendente",
    preferenceId: dados.id || "",
    initPoint: dados.init_point || "", // init_point é o link oficial para onde o cliente deve ir para pagar
    sandboxInitPoint: dados.sandbox_init_point || "", // link de testes
    externalReference
  });

  // Retorna os links para o Controller entregar ao frontend
  return {
    pagamentoId,
    preferenceId: dados.id,
    initPoint: dados.init_point,
    sandboxInitPoint: dados.sandbox_init_point,
    externalReference
  };
}

/**
 * FUNÇÃO: processarWebhookMercadoPago
 * O QUE FAZ: É aqui que a mágica acontece. Quando o cliente paga, o Mercado Pago manda um pacote de dados para cá.
 */
async function processarWebhookMercadoPago(payload) {
  // Pega o assunto/tópico do evento (ex: "payment" para avisos de pagamento ou "merchant_order" para pedidos).
  const topic = payload.type || payload.topic || "";
  
  // Pega a ação realizada (ex: "payment.created" ao criar ou "payment.updated" ao atualizar o status do pagamento).
  const action = payload.action || "";
  
  // Pega o ID único do pagamento gerado no Mercado Pago (convertido para Texto de forma segura).
  const dataId = String((payload.data && payload.data.id) || "");

  // Anotamos no banco de dados tudo o que recebemos de fora por pura segurança e histórico
  await pagamentosDAO.salvarEventoWebhook({
    topic,
    action,
    dataId,
    payload: JSON.stringify(payload || {})
  });

  if (!dataId) {
    return { processado: false, motivo: "sem_data_id" };
  }

  const config = obterConfigMercadoPago();
  
  // ====================================================================================
  // SISTEMA DE SEGURANÇA CONTRA FRAUDES (VERIFICAÇÃO DUPLA):
  // Não confiamos nas informações enviadas diretamente pelo Webhook, pois um invasor poderia
  // fingir ser o Mercado Pago para aprovar agendamentos de graça.
  // Em vez disso, pegamos apenas o ID da transação (dataId) e fazemos uma chamada direta,
  // via GET, para a API oficial do Mercado Pago para obter o status real e autêntico do pagamento.
  // ====================================================================================
  const resposta = await fetch(
    // URL: Central de pagamentos do Mercado Pago concatenado com o ID da transação que queremos consultar.
    `${config.baseUrl}/v1/payments/${dataId}`, 
    {
      method: "GET", // Método GET: Apenas consulta/leitura de dados seguros.
      headers: {
        // Envia o nosso token de acesso (accessToken) no cabeçalho para nos autenticar.
        Authorization: `Bearer ${config.accessToken}`
      }
    }
  );

  const dadosPagamento = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    return { processado: false, motivo: "nao_foi_possivel_consultar_pagamento" };
  }

  //////
  // external_refeece se refere a cobrança, puxamos ele e analisamos se existe uma cobranca
  /////
  // Lembra do externalReference "agenda-rosa-5-12345" que enviamos na criação? Ele voltou!
  // Usamos isso para achar no nosso banco quem é o dono exato desse pagamento e a qual agendamento ele pertence.
  const externalReference = String(dadosPagamento.external_reference || "");
  if (!externalReference) {
    return { processado: false, motivo: "sem_external_reference" };
  }

  // --- BUSCA LOCAL: Encontra a comanda de pagamento pendente correspondente em nosso próprio banco de dados ---
  const pagamentoLocal = await pagamentosDAO.buscarPorExternalReference(externalReference);
  if (!pagamentoLocal) {
    return { processado: false, motivo: "pagamento_local_nao_encontrado" };
  }

  const novoStatusPagamento = String(dadosPagamento.status || "pendente");

  // Atualiza o nosso banco de dados com o novo status (Ex: "approved" = Aprovado, "rejected" = Rejeitado)
  await pagamentosDAO.atualizarStatusPagamento({
    id: pagamentoLocal.id,
    status: novoStatusPagamento,
    paymentId: String(dadosPagamento.id || ""),
    statusDetalhe: String(dadosPagamento.status_detail || ""),
    brutoWebhook: JSON.stringify(dadosPagamento)
  });

  // Se o Mercado Pago confirmar de vez que o dinheiro tá na conta (approved), mudamos o status do Agendamento!
  if (novoStatusPagamento === "approved") {
    await agendamentosDAO.atualizarStatus(pagamentoLocal.agendamento_id, "agendado");
  }

  return { processado: true };
}

/**
 * FUNÇÃO: buscarPagamentoPorId
 * O QUE FAZ: Pega apenas o ID local do banco e devolve os dados para consulta.
 */
async function buscarPagamentoPorId(pagamentoId) {
  const id = Number(pagamentoId);
  if (!Number.isFinite(id)) {
    throw new Error("Pagamento invalido.");
  }

  const pagamento = await pagamentosDAO.buscarPagamentoPorId(id);
  if (!pagamento) {
    throw new Error("Pagamento nao encontrado.");
  }

  return pagamento;
}

/**
 * FUNÇÃO: reembolsarPagamento
 * O QUE FAZ: Devolve o dinheiro para o cliente em caso de cancelamento.
 */
async function reembolsarPagamento(paymentId) {
  // 1. Segurança: Se não enviaram nenhum ID de pagamento para estornar, desiste e sai silenciosamente.
  if (!paymentId) return;
  
  // 2. Carrega as nossas chaves do arquivo .env (aquela função que tem o 'obrigatorio').
  const config = obterConfigMercadoPago();
  
  // 3. O 'fetch' faz a ligação oficial para o servidor do Mercado Pago.
  // A URL diz: "Vá na versão 1 (v1), procure o pagamento com este ID, e crie um Reembolso (refunds)".
  const resposta = await fetch(`${config.baseUrl}/v1/payments/${paymentId}/refunds`, {
    // method "POST": Estamos ordenando que ele crie algo novo (um estorno) lá no sistema dele.
    method: "POST",
    // headers: São os dados de segurança do "envelope" da requisição.
    headers: {
      // Authorization: A nossa chave mestra para provar que somos os donos reais da conta.
      Authorization: `Bearer ${config.accessToken}`,
      // Content-Type: Avisa que a comunicação está no formato padrão da internet (JSON).
      "Content-Type": "application/json",
      // X-Idempotency-Key: É uma trava de segurança. Gera um código aleatório (ex: 7b3d-4c...) 
      // para carimbar essa tentativa exata de estorno, garantindo que a mesma ordem não se repita por falha na internet.
      "X-Idempotency-Key": require("crypto").randomUUID()
    }
  });

  // 4. "!resposta.ok": A resposta do Mercado Pago não foi de Sucesso (Não foi OK)? Deu erro?
  if (!resposta.ok) {
    // 5. Tenta ler qual foi a mensagem de erro específica que o Mercado Pago nos enviou para justificar o motivo.
    const errorData = await resposta.json().catch(() => ({}));
    // 6. Trava tudo (throw Error) e envia o motivo do erro para o Controller exibir na tela.
    throw new Error(errorData.message || "Erro ao processar reembolso no Mercado Pago.");
  }
  
  // 7. Se o estorno deu certo, converte a resposta de sucesso de Texto puro para um Objeto Javascript (json) e devolve.
  return resposta.json();
}

module.exports = {
  validarConfiguracaoMercadoPago,
  criarPreferenciaCheckout,
  processarWebhookMercadoPago,
  buscarPagamentoPorId,
  reembolsarPagamento
};
