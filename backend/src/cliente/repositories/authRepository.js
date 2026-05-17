const authDAO = require("../dao/authDAO");

// Realiza validacoes basicas de login.
async function loginCliente(payload) {
  const email = String(payload.email || "").trim();
  const senha = String(payload.senha || "").trim();

  if (!email || !senha) {
    throw new Error("Email e senha sao obrigatorios.");
  }

  const cliente = await authDAO.buscarClientePorEmail(email);
  if (!cliente) {
    throw new Error("Email ou senha invalidos.");
  }

  if (String(cliente.senha || "") !== senha) {
    throw new Error("Email ou senha invalidos.");
  }

  return {
    id: Number(cliente.id),
    nome: cliente.nome,
    email: cliente.email
  };
}

module.exports = {
  loginCliente
};
