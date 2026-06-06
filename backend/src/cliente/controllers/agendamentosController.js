const agendamentosRepository = require("../repositories/agendamentosRepository");

function erroParaStatus(mensagem) {
  if (mensagem.includes("nao encontrado")) {
    return 404;
  }

  if (mensagem.includes("ja esta cancelado") || mensagem.includes("nao pode ser cancelado")) {
    return 409;
  }

  if (mensagem.includes("ocupado")) {
    return 409;
  }

  if (mensagem.includes("obrigatorios") || mensagem.includes("Selecione")) {
    return 400;
  }

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

  return 500;
}

// POST /api/agendamentos
async function criar(req, res) {
  try {
    const novo = await agendamentosRepository.criarAgendamento(req.body || {});
    res.status(201).json({ mensagem: "Agendamento criado com sucesso.", agendamento: novo });
  } catch (error) {
    const status = erroParaStatus(error.message || "");
    res.status(status).json({ erro: error.message || "Erro ao criar agendamento." });
  }
}

// GET /api/clientes/:id/agendamentos
async function listarPorCliente(req, res) {
  try {
    const lista = await agendamentosRepository.listarAgendamentosDoCliente(req.params.id);
    res.status(200).json({ agendamentos: lista });
  } catch (error) {
    const status = erroParaStatus(error.message || "");
    res.status(status).json({ erro: error.message || "Erro ao listar agendamentos." });
  }
}

// PATCH /api/agendamentos/:id/cancelar
async function cancelar(req, res) {
  try {
    const resultado = await agendamentosRepository.cancelarAgendamento(req.params.id);
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
