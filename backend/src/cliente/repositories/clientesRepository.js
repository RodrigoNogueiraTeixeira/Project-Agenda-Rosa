const clientesDAO = require("../dao/clientesDAO");

// Busca perfil por id.
async function buscarPerfil(clienteId) {
  const id = Number(clienteId);
  const cliente = await clientesDAO.buscarPorId(id);

  if (!cliente) {
    return null;
  }

  return {
    id: Number(cliente.id),
    nome: cliente.nome,
    email: cliente.email,
    telefone: cliente.telefone,
    cidade: cliente.cidade,
    bairro: cliente.bairro
  };
}

// Atualiza perfil e devolve o resultado final.
async function atualizarPerfil(clienteId, payload) {
  const id = Number(clienteId);
  const atual = await clientesDAO.buscarPorId(id);

  if (!atual) {
    return null;
  }

  const nome = String(payload.nome || atual.nome || "").trim();
  const email = String(payload.email || atual.email || "").trim();
  const telefone = String(payload.telefone || atual.telefone || "").trim();
  const cidade = String(payload.cidade || atual.cidade || "").trim();
  const bairro = String(payload.bairro || atual.bairro || "").trim();
  const senha = payload.senha ? String(payload.senha).trim() : null;

  if (!nome || !email) {
    throw new Error("Nome e email sao obrigatorios.");
  }

  await clientesDAO.atualizarPerfil({ id, nome, email, telefone, cidade, bairro, senha });

  return {
    id,
    nome,
    email,
    telefone,
    cidade,
    bairro
  };
}

// Cadastra um novo cliente com validação de e-mail duplicado.
async function cadastrarCliente(payload) {
  const nome = String(payload.nome || "").trim();
  const email = String(payload.email || "").trim();
  const senha = String(payload.senha || "").trim();
  const telefone = String(payload.telefone || "").trim();

  if (!nome || !email || !senha) {
    throw new Error("Nome, email e senha sao obrigatorios.");
  }

  // Verifica se o e-mail já existe
  const clienteExistente = await clientesDAO.buscarPorEmail(email);
  if (clienteExistente) {
    throw new Error("E-mail ja cadastrado.");
  }

  const idCriado = await clientesDAO.cadastrarCliente({ nome, email, senha, telefone });

  return {
    id: idCriado,
    nome,
    email,
    telefone
  };
}

module.exports = {
  buscarPerfil,
  atualizarPerfil,
  cadastrarCliente
};
