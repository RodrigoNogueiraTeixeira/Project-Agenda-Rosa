// Importa a função 'get' do arquivo de configuração do banco de dados (usada para fazer SELECT de um único registro).
const { get } = require("../../config/database");

// Busca um cliente no banco de dados com base no e-mail fornecido.
async function buscarClientePorEmail(email) {
  return get(
    `
      -- Seleciona as colunas id, nome, email e a senha do cliente
      SELECT id, nome, email, senha
      -- A partir da tabela de clientes
      FROM clientes
      -- Converte o email gravado e o informado para minúsculas, evitando diferenciação de maiúsculas/minúsculas
      WHERE LOWER(email) = LOWER(?)
      -- Limita a consulta a apenas 1 resultado
      LIMIT 1
    `,
    [email] // Injeta o e-mail de forma parametrizada e segura contra SQL Injection
  );
}

// Busca uma empresa no banco de dados com base no e-mail fornecido.
async function buscarEmpresaPorEmail(email) {
  return get(
    `
      SELECT
        id,
        -- Retorna o nome do responsável mapeado com o alias 'nome'
        nome_responsavel AS nome,
        email,
        -- Mapeia a coluna senha_hash como 'senhaHash'
        senha_hash AS "senhaHash",
        -- Mapeia o status de aprovação administrativa como 'statusAprovacao'
        status_aprovacao AS "statusAprovacao"
      -- A partir da tabela de empresas
      FROM empresas
      -- Filtra desconsiderando letras maiúsculas/minúsculas no e-mail
      WHERE LOWER(email) = LOWER(?)
      -- Retorna apenas o primeiro registro correspondente
      LIMIT 1
    `,
    [email] // Injeta o e-mail de busca de forma segura
  );
}

// Salva um token de recuperação de senha no banco.
async function salvarTokenRecuperacao(email, perfil, token, expiracao) {
  // Importa a função 'run' para executar comandos do tipo INSERT/UPDATE/DELETE
  const { run } = require("../../config/database");
  return run(
    `
      -- Insere um novo registro de token de recuperação na tabela
      INSERT INTO tokens_recuperacao (email, perfil, token, expiracao)
      -- Valores informados para e-mail, perfil, token e a data de expiração
      VALUES (?, ?, ?, ?)
    `,
    [email, perfil, token, expiracao] // Parâmetros ordenados correspondentes às interrogações
  );
}

// Invalida todos os tokens ativos anteriores daquele e-mail e perfil (caso o usuário peça a recuperação várias vezes).
async function invalidarTokensRecuperacao(email, perfil) {
  const { run } = require("../../config/database");
  return run(
    `
      -- Atualiza a tabela de tokens
      UPDATE tokens_recuperacao
      -- Define o estado de utilização do token como 1 (utilizado/inválido)
      SET utilizado = 1
      -- Apenas para o e-mail solicitado (em minúsculas)
      WHERE LOWER(email) = LOWER(?)
        -- Que corresponda ao perfil do usuário
        AND perfil = ?
        -- E que ainda estava ativo (utilizado = 0)
        AND utilizado = 0
    `,
    [email, perfil] // Parâmetros injetados de forma segura
  );
}

// Busca as informações de um token de recuperação específico na base de dados.
async function buscarTokenRecuperacao(token) {
  return get(
    `
      -- Seleciona as informações cadastrais do token de recuperação
      SELECT id, email, perfil, token, expiracao, utilizado
      -- A partir da tabela de tokens de recuperação
      FROM tokens_recuperacao
      -- Onde o token seja idêntico ao informado por parâmetro
      WHERE token = ?
      -- Limita a consulta a apenas 1 resultado
      LIMIT 1
    `,
    [token] // Injeta o token de busca com segurança
  );
}

// Marca um token como utilizado após a redefinição de senha para impedir que seja reusado.
async function marcarTokenUtilizado(token) {
  const { run } = require("../../config/database");
  return run(
    `
      -- Atualiza a tabela de tokens
      UPDATE tokens_recuperacao
      -- Define a coluna utilizado como 1 (utilizado/inválido)
      SET utilizado = 1
      -- Filtra pelo token correspondente
      WHERE token = ?
    `,
    [token] // Injeta o token de forma parametrizada
  );
}

// Atualiza a senha do cliente na base de dados.
async function atualizarSenhaCliente(email, novaSenha) {
  const { run } = require("../../config/database");
  return run(
    `
      -- Atualiza a tabela de clientes
      UPDATE clientes
      -- Define a nova senha
      SET senha = ?
      -- Onde o e-mail seja idêntico ao procurado (convertido em minúsculas)
      WHERE LOWER(email) = LOWER(?)
    `,
    [novaSenha, email] // Parâmetros seguros injetados ordenadamente
  );
}

// Atualiza a senha da empresa na base de dados.
async function atualizarSenhaEmpresa(email, novaSenhaHash) {
  const { run } = require("../../config/database");
  return run(
    `
      -- Atualiza a tabela de empresas
      UPDATE empresas
      -- Define a nova senha criptografada (hash)
      SET senha_hash = ?
      -- Onde o e-mail coincida com o procurado (em minúsculas)
      WHERE LOWER(email) = LOWER(?)
    `,
    [novaSenhaHash, email] // Parâmetros seguros injetados ordenadamente
  );
}

// Exporta todas as funções de consulta e alteração do banco para uso em repositórios externos.
module.exports = {
  buscarClientePorEmail,
  buscarEmpresaPorEmail,
  salvarTokenRecuperacao,
  invalidarTokensRecuperacao,
  buscarTokenRecuperacao,
  marcarTokenUtilizado,
  atualizarSenhaCliente,
  atualizarSenhaEmpresa
};
