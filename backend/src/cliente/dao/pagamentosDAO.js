/**
 * ARQUIVO: pagamentosDAO.js
 * OBJETIVO: O "Arquivista". É o único lugar do sistema de pagamentos que tem permissão para fuçar no banco de dados.
 * CONCEITO (O que é DAO?): Data Access Object (Objeto de Acesso a Dados). 
 * Uma boa prática de programação onde centralizamos todas as operações de banco de dados (INSERT, SELECT, UPDATE) em um único arquivo.
 */

// Importa as 3 funções principais que a biblioteca do SQLite sabe fazer:
// - all: Pega uma lista de resultados (Ex: Todos os pagamentos já feitos).
// - get: Pega apenas 1 resultado (Ex: O pagamento ID 5).
// - run: Executa uma ação que muda algo no banco (INSERT, UPDATE, DELETE).
const { all, get, run } = require("../../config/database");

/**
 * FUNÇÃO: criarPedidoPagamento
 * O QUE FAZ: Quando o cliente clica em "Pagar", essa função anota no caderninho (banco de dados) que foi gerado 
 * um pedido de pagamento com o status inicial "PENDENTE". E também salva o link oficial de pagamento do Mercado Pago (initPoint).
 * 
 * SEGURANÇA BÁSICA DE SQL: Você percebe que o código está cheio de '?' ao invés de colocar as variáveis direto ali?
 * Isso é de propósito! Chama-se "Prevenção contra SQL Injection". Evita que um hacker digite comandos de banco de dados
 * no meio do formulário do site tentando apagar nosso banco. O SQLite substitui as interrogações de forma 100% segura.
 */
async function criarPedidoPagamento({
  agendamentoId,
  clienteId,
  valorTotal,
  descricao,
  status,
  preferenceId,
  initPoint,
  sandboxInitPoint,
  externalReference
}) {
  const resultado = await run(
    `
      INSERT INTO pagamentos (
        agendamento_id,
        cliente_id,
        valor_total,
        descricao,
        status,
        preference_id,
        init_point,
        sandbox_init_point,
        external_reference,
        criado_em,
        atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      agendamentoId,
      clienteId,
      valorTotal,
      descricao,
      status,
      preferenceId,
      initPoint,
      sandboxInitPoint,
      externalReference,
      new Date().toISOString(), // Grava a hora exata da criação
      new Date().toISOString()
    ]
  );

  // lastID é o número da linha (o número do ID) que acabou de ser criada no banco.
  return resultado.lastID;
}

/**
 * FUNÇÃO: buscarPagamentoPorId
 * O QUE FAZ: Pega o recibo de 1 pagamento específico usando o ID dele do nosso banco.
 * FLUXO: Usa a função 'get' porque sabemos que o 'id' é único (só existe 1 no mundo).
 */
async function buscarPagamentoPorId(id) {
  return get(`SELECT * FROM pagamentos WHERE id = ?`, [id]);
}

/**
 * FUNÇÃO: buscarPorExternalReference
 * O QUE FAZ: O "externalReference" é aquela placa de identificação que colamos na cobrança (Ex: agenda-rosa-5-1234).
 * FLUXO: Quando o Mercado Pago nos avisa "A placa agenda-rosa-5-1234 foi paga", usamos essa função 
 * para varrer o banco de dados, achar a cobrança certa e atualizá-la.
 */
async function buscarPorExternalReference(externalReference) {
  return get(`SELECT * FROM pagamentos WHERE external_reference = ? LIMIT 1`, [externalReference]);
}

/**
 * FUNÇÃO: atualizarStatusPagamento
 * O QUE FAZ: Muda a situação do pagamento (Ex: de "PENDENTE" para "APROVADO" ou "RECUSADO").
 * FLUXO: Usa a função 'run' para rodar um UPDATE no banco de dados. 
 * Também salva o 'brutoWebhook', que é o "pacotão" inteiro de dados que o Mercado Pago mandou (caso precisemos auditar algum bug depois).
 */
async function atualizarStatusPagamento({ id, status, paymentId, statusDetalhe, brutoWebhook }) {
  await run(
    `
      UPDATE pagamentos
      SET status = ?,
          mp_payment_id = ?,
          status_detalhe = ?,
          bruto_webhook = ?,
          atualizado_em = ?
      WHERE id = ?
    `,
    [status, paymentId || null, statusDetalhe || "", brutoWebhook || "", new Date().toISOString(), id]
  );
}

/**
 * FUNÇÃO: salvarEventoWebhook
 * O QUE FAZ: Funciona como a "Caixa Preta" do avião. Salva uma cópia exata de TUDO que o Mercado Pago mandar para nós.
 * POR QUE ISSO É BOM? Se o sistema bugar e o cliente jurar que pagou o Pix (mostrando o comprovante do Itaú),
 * o programador pode abrir a tabela 'pagamentos_webhooks' e ver se o Mercado Pago realmente nos enviou algum aviso de pagamento ou não.
 */
async function salvarEventoWebhook({ topic, action, dataId, payload }) {
  await run(
    `
      INSERT INTO pagamentos_webhooks (topic, action, data_id, payload, criado_em)
      VALUES (?, ?, ?, ?, ?)
    `,
    [topic || "", action || "", dataId || "", payload || "", new Date().toISOString()]
  );
}

/**
 * FUNÇÃO: listarPagamentosPorCliente
 * O QUE FAZ: Devolve o histórico completo de tudo que um cliente específico já pagou (ou tentou pagar).
 * FLUXO: Usa a função 'all' porque o resultado é uma lista grande (várias linhas). O 'ORDER BY id DESC' coloca a compra mais recente no topo.
 */
async function listarPagamentosPorCliente(clienteId) {
  return all(
    `
      SELECT *
      FROM pagamentos
      WHERE cliente_id = ?
      ORDER BY id DESC
    `,
    [clienteId]
  );
}

/**
 * FUNÇÃO: buscarPagamentoAprovadoPorAgendamento
 * O QUE FAZ: Verifica se um agendamento específico já teve o Pix ou Cartão aprovado com sucesso.
 * FLUXO: Muito usado antes de deixar o profissional iniciar um serviço. Se essa função não achar nada no banco, 
 * o sistema sabe que a cliente ainda está devendo o agendamento.
 */
async function buscarPagamentoAprovadoPorAgendamento(agendamentoId) {
  return get(
    `SELECT * FROM pagamentos WHERE agendamento_id = ? AND status = 'approved' ORDER BY id DESC LIMIT 1`,
    [agendamentoId]
  );
}

// Exporta as ferramentas para que o Repository possa usá-las para conversar com o banco.
module.exports = {
  criarPedidoPagamento,
  buscarPagamentoPorId,
  buscarPorExternalReference,
  atualizarStatusPagamento,
  salvarEventoWebhook,
  listarPagamentosPorCliente,
  buscarPagamentoAprovadoPorAgendamento
};
