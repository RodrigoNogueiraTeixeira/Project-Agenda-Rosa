const { get } = require("../../config/database");

// Busca cliente por email para etapa de login.
async function buscarClientePorEmail(email) {
  return get(
    `
      SELECT id, nome, email, senha
      FROM clientes
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `,
    [email]
  );
}

// Busca empresa por email para etapa de login.
async function buscarEmpresaPorEmail(email) {
  return get(
    `
      SELECT id, nome_responsavel AS nome, email, senha_hash AS senhaHash, status_aprovacao AS statusAprovacao
      FROM empresas
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `,
    [email]
  );
}

// Salva um token de recuperação de senha no banco.
async function salvarTokenRecuperacao(email, perfil, token, expiracao) {
  const { run } = require("../../config/database");
  return run(
    `INSERT INTO tokens_recuperacao (email, perfil, token, expiracao) VALUES (?, ?, ?, ?)`,
    [email, perfil, token, expiracao]
  );
}

async function invalidarTokensRecuperacao(email, perfil) {
  const { run } = require("../../config/database");
  return run(
    `UPDATE tokens_recuperacao
    SET utilizado = 1
    WHERE LOWER(email) = LOWER(?)
      AND perfil = ?
      AND utilizado = 0`,
    [email, perfil]
  );
}

// Busca um token de recuperação.
async function buscarTokenRecuperacao(token) {
  return get(
    `SELECT id, email, perfil, token, expiracao, utilizado FROM tokens_recuperacao WHERE token = ? LIMIT 1`,
    [token]
  );
}

// Marca um token como utilizado.
async function marcarTokenUtilizado(token) {
  const { run } = require("../../config/database");
  return run(
    `UPDATE tokens_recuperacao SET utilizado = 1 WHERE token = ?`,
    [token]
  );
}

// Atualiza a senha do cliente.
async function atualizarSenhaCliente(email, novaSenha) {
  const { run } = require("../../config/database");
  return run(
    `UPDATE clientes SET senha = ? WHERE LOWER(email) = LOWER(?)`,
    [novaSenha, email]
  );
}

// Atualiza a senha da empresa.
async function atualizarSenhaEmpresa(email, novaSenhaHash) {
  const { run } = require("../../config/database");
  return run(
    `UPDATE empresas SET senha_hash = ? WHERE LOWER(email) = LOWER(?)`,
    [novaSenhaHash, email]
  );
}

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
