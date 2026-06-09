const authDAO = require("../dao/authDAO");
const passwordUtils = require("../../utils/password");

// Realiza o login conforme o perfil escolhido.
async function login(payload) {
  const email = String(payload.email || "").trim();
  const senha = String(payload.senha || "").trim();
  const perfil = String(payload.perfil || "cliente").trim().toLowerCase();

  if (!email || !senha) {
    throw new Error("Email e senha sao obrigatorios.");
  }

  // O administrador usa as credenciais configuradas no arquivo .env.
  if (perfil === "administrador") {
    const adminEmail = String(process.env.ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();
    const adminSenhaHash = String(
      process.env.ADMIN_PASSWORD_HASH || ""
    ).trim();

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
        email: adminEmail,
      },
    };
  }

  // A empresa precisa estar cadastrada e aprovada.
  if (perfil === "empresa") {
    const empresa = await authDAO.buscarEmpresaPorEmail(email);

    if (!empresa) {
      throw new Error("Email ou senha invalidos.");
    }

    const senhaValida = await passwordUtils.verifyPassword(
      senha,
      empresa.senhaHash
    );

    if (!senhaValida) {
      throw new Error("Email ou senha invalidos.");
    }

    if (empresa.statusAprovacao === "pendente") {
      throw new Error(
        "Sua conta ainda esta pendente de aprovacao pelo administrador."
      );
    }

    if (empresa.statusAprovacao === "reprovada") {
      throw new Error("Sua conta foi reprovada pelo administrador.");
    }

    return {
      perfil: "empresa",
      usuario: {
        id: Number(empresa.id),
        nome: empresa.nome,
        email: empresa.email,
      },
    };
  }

  // Busca o cliente e confere sua senha.
  const cliente = await authDAO.buscarClientePorEmail(email);

  if (!cliente) {
    throw new Error("Email ou senha invalidos.");
  }

  if (passwordUtils.isPasswordHash(cliente.senha)) {
    if (!passwordUtils.verifyPassword(senha, cliente.senha)) {
      throw new Error("Email ou senha invalidos.");
    }
  } else {
    // Atualiza senhas antigas que ainda estavam salvas sem hash.
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
      email: cliente.email,
    },
  };
}

module.exports = {
  login,
};
