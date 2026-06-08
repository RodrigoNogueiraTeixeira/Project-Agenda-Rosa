const authDAO = require("../dao/authDAO");
const passwordUtils = require("../../utils/password");

// Realiza a autenticação de acordo com o perfil selecionado (administrador, empresa ou cliente).
async function login(payload) {
  // Limpa e formata os dados de entrada para evitar problemas com espaços extras ou letras maiúsculas/minúsculas.
  const email = String(payload.email || "").trim();
  const senha = String(payload.senha || "").trim();
  const perfil = String(payload.perfil || "cliente").trim().toLowerCase();

  // Validação básica de presença dos campos obrigatórios.
  if (!email || !senha) {
    throw new Error("Email e senha sao obrigatorios.");
  }

  // =========================================================================
  // 1. Perfil Administrador (Credenciais configuradas nas variáveis do ambiente)
  // =========================================================================
  if (perfil === "administrador") {
    // Recupera as credenciais seguras definidas no painel do servidor (ex: Render ou arquivo .env).
    const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const adminSenhaHash = String(process.env.ADMIN_PASSWORD_HASH || "").trim();

    // Se as variáveis de ambiente necessárias não foram configuradas ou o hash for inválido:
    if (!adminEmail || !passwordUtils.isPasswordHash(adminSenhaHash)) {
      throw new Error("Acesso administrativo nao configurado.");
    }

    // Compara o e-mail (insensível a maiúsculas) e valida a senha usando PBKDF2.
    if (
      email.toLowerCase() !== adminEmail ||
      !passwordUtils.verifyPassword(senha, adminSenhaHash)
    ) {
      throw new Error("Email ou senha de administrador invalidos.");
    }

    // Usuário administrador é "virtual" (não fica no BD), por isso definimos ID fixo 0.
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
    // Busca a empresa cadastrada no banco de dados através do e-mail.
    const empresa = await authDAO.buscarEmpresaPorEmail(email);
    if (!empresa) {
      throw new Error("Email ou senha invalidos.");
    }

    // Verifica a senha digitada comparando-a com o hash PBKDF2 persistido.
    const senhaValida = await passwordUtils.verifyPassword(senha, empresa.senhaHash);
    if (!senhaValida) {
      throw new Error("Email ou senha invalidos.");
    }

    // Empresas recém-cadastradas iniciam com status "pendente" e precisam ser aprovadas pelo administrador.
    if (empresa.statusAprovacao === "pendente") {
      throw new Error("Sua conta ainda esta pendente de aprovacao pelo administrador.");
    }

    // Se o administrador rejeitar a empresa, o status muda para "reprovada".
    if (empresa.statusAprovacao === "reprovada") {
      throw new Error("Sua conta foi reprovada pelo administrador.");
    }

    // Retorna os dados da empresa.
    return {
      perfil: "empresa",
      usuario: {
        id: Number(empresa.id),
        nome: empresa.nome,
        email: empresa.email
      }
    };
  }

  // =========================================================================
  // 3. Perfil Cliente (Autenticação com Migração Inteligente de Senhas antigas)
  // =========================================================================
  // Busca o cliente no banco de dados pelo e-mail.
  const cliente = await authDAO.buscarClientePorEmail(email);
  if (!cliente) {
    throw new Error("Email ou senha invalidos.");
  }

  // =========================================================================
  // MUTAÇÃO/MIGRAÇÃO DE SENHAS DE CLIENTES ANTIGOS (Para maior segurança)
  // =========================================================================
  // Como o sistema foi atualizado recentemente para usar criptografia, temos dois tipos de senhas no banco:
  // - Clientes antigos: têm a senha salva em texto limpo (ex: "minhasenha123").
  // - Clientes novos (ou atualizados): têm a senha em formato de Hash criptografado (ex: "salt:hash").
  
  // O teste abaixo verifica: a senha atual salva no banco de dados tem o formato de Hash criptografado?
  if (passwordUtils.isPasswordHash(cliente.senha)) {
    // CASO A: Se for um Hash criptografado, precisamos usar uma função especial de comparação.
    // O 'verifyPassword' vai aplicar o algoritmo PBKDF2 na senha digitada e validar se bate com o hash salvo no banco.
    if (!passwordUtils.verifyPassword(senha, cliente.senha)) {
      throw new Error("Email ou senha invalidos.");
    }
  } else {
    // CASO B: Se NÃO for um Hash (significa que é uma senha antiga em texto puro/limpo):
    // 1. Compara a senha digitada pelo usuário diretamente com a senha em texto limpo salva no banco.
    if (String(cliente.senha || "") !== senha) {
      throw new Error("Email ou senha invalidos.");
    }

    // 2. MIGRAÇÃO DE SEGURANÇA: Se o login deu certo com a senha antiga, aproveitamos a senha 
    // digitada neste exato momento (que sabemos ser a correta) para gerar um Hash criptografado seguro (PBKDF2).
    const senhaHash = passwordUtils.hashPassword(senha);
    
    // 3. Atualiza o cadastro do cliente no banco de dados, substituindo a senha em texto limpo 
    // pela nova versão criptografada. No próximo login deste usuário, o sistema entrará direto no CASO A (com hash).
    await authDAO.atualizarSenhaCliente(cliente.email, senhaHash);
  }

  // Retorna os dados do cliente autenticado.
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
