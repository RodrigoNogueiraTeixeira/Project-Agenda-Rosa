// Importa o módulo Data Access Object (DAO) de autenticação para realizar consultas de banco de dados.
const authDAO = require("../dao/authDAO");
// Importa utilitários de criptografia e tratamento de senhas (como gerar hashes e validar).
const passwordUtils = require("../../utils/password");

/**
 * Função responsável por autenticar um usuário no sistema com base nas suas credenciais e perfil.
 * 
 * @param {Object} payload - Objeto contendo os dados recebidos na requisição (email, senha e perfil).
 * @returns {Promise<Object>} Dados do perfil logado e objeto do usuário.
 */
async function login(payload) {
  // Converte o e-mail recebido em String, remove espaços nas pontas (.trim()) e guarda na constante 'email'.
  const email = String(payload.email || "").trim();
  // Converte a senha recebida em String, remove espaços e guarda na constante 'senha'.
  const senha = String(payload.senha || "").trim();
  // Converte o perfil em String (padrão é 'cliente'), remove espaços e coloca tudo em letras minúsculas.
  const perfil = String(payload.perfil || "cliente").trim().toLowerCase();

  // Verifica se o e-mail ou a senha estão vazios...
  if (!email || !senha) {
    // Dispara um erro que será interceptado pelo bloco catch da controller.
    throw new Error("Email e senha sao obrigatorios.");
  }

  // Se o perfil solicitado for 'administrador'...
  if (perfil === "administrador") {
    // Obtém o e-mail do administrador configurado nas variáveis de ambiente do servidor (.env), higienizando o valor.
    const adminEmail = String(process.env.ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();
    // Obtém o hash da senha do administrador configurado nas variáveis de ambiente (.env).
    const adminSenhaHash = String(
      process.env.ADMIN_PASSWORD_HASH || ""
    ).trim();

    // Validação de segurança: se o e-mail do administrador não foi definido ou o hash da senha não for válido...
    if (!adminEmail || !passwordUtils.isPasswordHash(adminSenhaHash)) {
      // Lança erro indicando falta de configuração no ambiente do servidor.
      throw new Error("Acesso administrativo nao configurado.");
    }

    // Se o e-mail digitado for diferente do configurado OU se a verificação da senha contra o hash falhar...
    if (
      email.toLowerCase() !== adminEmail ||
      !passwordUtils.verifyPassword(senha, adminSenhaHash)
    ) {
      // Lança um erro de credenciais inválidas.
      throw new Error("Email ou senha de administrador invalidos.");
    }

    // Se a autenticação passar, retorna o perfil de administrador com dados estáticos (ID 0).
    return {
      perfil: "administrador",
      usuario: {
        id: 0,
        nome: "Administradora",
        email: adminEmail,
      },
    };
  }

  // Se o perfil solicitado for 'empresa'...
  if (perfil === "empresa") {
    // Consulta o banco de dados via DAO para buscar os dados cadastrados da empresa pelo e-mail.
    const empresa = await authDAO.buscarEmpresaPorEmail(email);

    // Se a empresa não for encontrada...
    if (!empresa) {
      // Lança erro genérico por segurança (para não revelar se o e-mail está ou não cadastrado).
      throw new Error("Email ou senha invalidos.");
    }

    // Compara a senha digitada com a senha criptografada (hash) do banco de dados de forma assíncrona.
    const senhaValida = await passwordUtils.verifyPassword(
      senha,
      empresa.senhaHash
    );

    // Se as senhas não coincidirem...
    if (!senhaValida) {
      // Lança o mesmo erro genérico de email ou senha inválidos.
      throw new Error("Email ou senha invalidos.");
    }

    // Se a conta da empresa estiver aguardando aprovação administrativa:
    if (empresa.statusAprovacao === "pendente") {
      // Lança erro explicando que o cadastro ainda está pendente de aprovação.
      throw new Error(
        "Sua conta ainda esta pendente de aprovacao pelo administrador."
      );
    }

    // Se o cadastro da empresa foi recusado pelo administrador:
    if (empresa.statusAprovacao === "reprovada") {
      // Lança erro explicando que a conta foi reprovada.
      throw new Error("Sua conta foi reprovada pelo administrador.");
    }

    // Se tudo estiver correto, retorna o perfil e os dados públicos da empresa logada.
    return {
      perfil: "empresa",
      usuario: {
        id: Number(empresa.id),
        nome: empresa.nome,
        email: empresa.email,
      },
    };
  }

  // Consulta o banco de dados via DAO para buscar os dados cadastrados do cliente pelo e-mail.
  const cliente = await authDAO.buscarClientePorEmail(email);

  // Se o cliente não for encontrado...
  if (!cliente) {
    // Lança erro genérico por motivos de segurança contra varredura de e-mails.
    throw new Error("Email ou senha invalidos.");
  }

  // Verifica se a senha armazenada no banco já é um hash criptografado (padrão seguro atual).
  if (passwordUtils.isPasswordHash(cliente.senha)) {
    // Compara a senha digitada com a senha criptografada de forma segura e assíncrona.
    if (!passwordUtils.verifyPassword(senha, cliente.senha)) {
      // Se não coincidir, dispara o erro de autenticação.
      throw new Error("Email ou senha invalidos.");
    }
  // Se a senha no banco for antiga (texto limpo, sem hash)...
  } else {
    // Compara diretamente a senha de texto puro com a senha digitada.
    if (String(cliente.senha || "") !== senha) {
      // Se forem diferentes, dispara o erro de autenticação.
      throw new Error("Email ou senha invalidos.");
    }

    // Se o login for bem-sucedido, gera o hash seguro para a senha digitada.
    const senhaHash = passwordUtils.hashPassword(senha);
    // Atualiza a senha no banco de dados para o formato criptografado (migração de segurança automática).
    await authDAO.atualizarSenhaCliente(cliente.email, senhaHash);
  }

  // Retorna o perfil de cliente e os dados públicos associados para compor a resposta.
  return {
    perfil: "cliente",
    usuario: {
      id: Number(cliente.id),
      nome: cliente.nome,
      email: cliente.email,
    },
  };
}

// Exporta as funções do repositório para que possam ser utilizadas na controller (authController).
module.exports = {
  login,
};
