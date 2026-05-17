const { run, get } = require("../../config/database");

/**
 * Busca uma empresa pelo e-mail.
 */
async function buscarPorEmail(email) {
  return get(
    "SELECT id, email FROM empresas WHERE LOWER(email) = LOWER(?)",
    [String(email).trim()]
  );
}

/**
 * Busca uma empresa pelo ID.
 */
async function buscarPorId(id) {
  return get(
    `SELECT
      id,
      nome_responsavel AS nomeResponsavel,
      telefone,
      email,
      nome_estabelecimento AS nomeEstabelecimento,
      status_aprovacao AS statusAprovacao,
      criado_em AS criadoEm
    FROM empresas
    WHERE id = ?`,
    [id]
  );
}

/**
 * Cria uma nova empresa.
 */
async function criar(dados) {
  const resultado = await run(
    `INSERT INTO empresas (
      nome_responsavel,
      telefone,
      email,
      nome_estabelecimento,
      senha_hash
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      String(dados.nomeResponsavel).trim(),
      String(dados.telefone).trim(),
      String(dados.email).trim().toLowerCase(),
      String(dados.nomeEstabelecimento).trim(),
      dados.senhaHash,
    ]
  );

  return buscarPorId(resultado.lastID);
}

module.exports = {
  buscarPorEmail,
  buscarPorId,
  criar,
};
