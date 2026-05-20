const authDAO = require("../dao/authDAO");
const passwordUtils = require("../../utils/password");

// Realiza a autenticação de acordo com o perfil selecionado.
async function login(payload) {
  const email = String(payload.email || "").trim();
  const senha = String(payload.senha || "").trim();
  const perfil = String(payload.perfil || "cliente").trim().toLowerCase();

  if (!email || !senha) {
    throw new Error("Email e senha sao obrigatorios.");
  }

  // 1. Perfil Administrador (Credenciais estáticas simplificadas)
  if (perfil === "administrador") {
    const adminEmail = "admin@agendarosa.com";
    const adminSenha = "admin123";

    if (email.toLowerCase() !== adminEmail || senha !== adminSenha) {
      throw new Error("Email ou senha de administrador invalidos.");
    }

    return {
      perfil: "administrador",
      usuario: {
        id: 0,
        nome: "Administradora",
        email: adminEmail
      }
    };
  }

  // 2. Perfil Empresa / Profissional (Senha hash PBKDF2 e aprovação do Admin)
  if (perfil === "empresa") {
    const empresa = await authDAO.buscarEmpresaPorEmail(email);
    if (!empresa) {
      throw new Error("Email ou senha invalidos.");
    }

    const senhaValida = await passwordUtils.verifyPassword(senha, empresa.senhaHash);
    if (!senhaValida) {
      throw new Error("Email ou senha invalidos.");
    }

    if (empresa.statusAprovacao === "pendente") {
      throw new Error("Sua conta ainda esta pendente de aprovacao pelo administrador.");
    }

    if (empresa.statusAprovacao === "reprovada") {
      throw new Error("Sua conta foi reprovada pelo administrador.");
    }

    return {
      perfil: "empresa",
      usuario: {
        id: Number(empresa.id),
        nome: empresa.nome,
        email: empresa.email
      }
    };
  }

  // 3. Perfil Cliente (Senha em texto puro)
  const cliente = await authDAO.buscarClientePorEmail(email);
  if (!cliente) {
    throw new Error("Email ou senha invalidos.");
  }

  if (String(cliente.senha || "") !== senha) {
    throw new Error("Email ou senha invalidos.");
  }

  return {
    perfil: "cliente",
    usuario: {
      id: Number(cliente.id),
      nome: cliente.nome,
      email: cliente.email
    }
  };
}

module.exports = {
  login
};
