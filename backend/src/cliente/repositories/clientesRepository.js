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

  if (!nome || !email) {
    throw new Error("Nome e email sao obrigatorios.");
  }

  await clientesDAO.atualizarPerfil({ id, nome, email, telefone, cidade, bairro });

  return {
    id,
    nome,
    email,
    telefone,
    cidade,
    bairro
  };
}

module.exports = {
  buscarPerfil,
  atualizarPerfil
};
