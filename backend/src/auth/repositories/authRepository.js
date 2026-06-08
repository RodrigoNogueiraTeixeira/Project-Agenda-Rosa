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

  // 1. Perfil Administrador (credenciais configuradas no ambiente)
  if (perfil === "administrador") {
    const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const adminSenhaHash = String(process.env.ADMIN_PASSWORD_HASH || "").trim();

    if (!adminEmail || !passwordUtils.isPasswordHash(adminSenhaHash)) {
      throw new Error("Acesso administrativo nao configurado.");
    }

    if (
      email.toLowerCase() !== adminEmail ||
      !passwordUtils.verifyPassword(senha, adminSenhaHash)
    ) {
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

  // 2. Perfil Empresa (senha hash PBKDF2 e aprovacao do Admin)
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

  // 3. Perfil Cliente (PBKDF2, com migracao automatica de senhas antigas)
  const cliente = await authDAO.buscarClientePorEmail(email);
  if (!cliente) {
    throw new Error("Email ou senha invalidos.");
  }

  if (passwordUtils.isPasswordHash(cliente.senha)) {
    if (!passwordUtils.verifyPassword(senha, cliente.senha)) {
      throw new Error("Email ou senha invalidos.");
    }
  } else {
    if (String(cliente.senha || "") !== senha) {
      throw new Error("Email ou senha invalidos.");
    }

    const senhaHash = passwordUtils.hashPassword(senha);
    await authDAO.atualizarSenhaCliente(cliente.email, senhaHash);
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
