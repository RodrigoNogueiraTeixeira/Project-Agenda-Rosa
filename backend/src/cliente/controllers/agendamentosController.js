const agendamentosRepository = require("../repositories/agendamentosRepository");

/**
 * FUNÇÃO: erroParaStatus
 * CONTEXTO: O "Mão na Massa" (Repository) apenas lança textos de erro simples (Ex: "throw new Error('Horário ocupado')").
 * Ele não sabe o que é internet, então não entende Códigos HTTP.
 * O papel do Controller é "traduzir" esses textos para o Idioma Padrão da Internet (Códigos de Status HTTP) 
 * para que o aplicativo de celular entenda o que deu errado (se foi culpa do usuário, do banco, ou conflito).
 */
function erroParaStatus(mensagem) {
  // 404 (Not Found / Não Encontrado): 
  // O aplicativo tentou buscar/alterar algo que não existe no banco de dados. (Ex: "Cliente nao encontrado").
  if (mensagem.includes("nao encontrado")) {
    return 404;
  }

  // 409 (Conflict / Conflito): 
  // A requisição é válida, mas esbarrou em uma regra do sistema que gera conflito de estado.
  // Ex: A manicure tentou cancelar um agendamento que já havia sido cancelado ontem.
  if (mensagem.includes("ja esta cancelado") || mensagem.includes("nao pode ser cancelado")) {
    return 409;
  }

  // 409 (Conflict / Conflito de Agenda): 
  // Duas clientes tentaram marcar o mesmo horário exato, e uma apertou o botão milissegundos antes. Deu conflito!
  if (mensagem.includes("ocupado")) {
    return 409;
  }

  // 400 (Bad Request / Pedido Mal Feito): 
  // O cliente mandou o formulário incompleto ou errado. A culpa é do usuário que deixou em branco.
  // Ex: Esqueceu de preencher a data ou não selecionou nenhum serviço.
  if (mensagem.includes("obrigatorios") || mensagem.includes("Selecione")) {
    return 400;
  }

  // 400 (Bad Request / Quebra de Regra de Negócio):
  // O formulário veio preenchido, mas as escolhas são absurdas/proibidas pelas regras do salão.
  // Ex: Agendar pro passado, agendar pro domingo (dia que o salão não abre), ou no horário de almoço.
  if (
    mensagem.includes("passado") ||
    mensagem.includes("2 meses") ||
    mensagem.includes("invalida") ||
    mensagem.includes("nao abre") ||
    mensagem.includes("fora do funcionamento") ||
    mensagem.includes("intervalo") ||
    mensagem.includes("bloqueado")
  ) {
    return 400;
  }

  // 500 (Internal Server Error / Erro do Servidor):
  // Se a mensagem não bateu com nenhuma regra acima, significa que o erro NÃO foi culpa da cliente,
  // mas sim um "bug" no código (ex: banco de dados caiu, erro de digitação do programador). A culpa é do nosso servidor!
  return 500;
}

// POST /api/agendamentos
async function criar(req, res) {
  try {
    const payload = req.body || {};
    // Garante que o clienteId é o do token logado (Prevenção de IDOR)
    payload.clienteId = req.user.id;
    const novo = await agendamentosRepository.criarAgendamento(payload);
    res.status(201).json({ mensagem: "Agendamento criado com sucesso.", agendamento: novo });
  } catch (error) {
    const status = erroParaStatus(error.message || "");
    res.status(status).json({ erro: error.message || "Erro ao criar agendamento." });
  }
}

// GET /api/clientes/:id/agendamentos
async function listarPorCliente(req, res) {
  try {
    // Busca agendamentos do cliente logado (IDOR fix)
    const lista = await agendamentosRepository.listarAgendamentosDoCliente(req.user.id);
    res.status(200).json({ agendamentos: lista });
  } catch (error) {
    const status = erroParaStatus(error.message || "");
    res.status(status).json({ erro: error.message || "Erro ao listar agendamentos." });
  }
}

// PATCH /api/agendamentos/:id/cancelar
async function cancelar(req, res) {
  try {
    // Passa o ID do cliente logado para validar posse (IDOR fix)
    const resultado = await agendamentosRepository.cancelarAgendamento(req.params.id, req.user.id);
    res.status(200).json({ mensagem: "Agendamento cancelado com sucesso.", agendamento: resultado });
  } catch (error) {
    const status = erroParaStatus(error.message || "");
    res.status(status).json({ erro: error.message || "Erro ao cancelar agendamento." });
  }
}

module.exports = {
  criar,
  listarPorCliente,
  cancelar
};
