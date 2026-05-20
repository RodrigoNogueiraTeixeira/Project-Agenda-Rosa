const { get, run } = require("../../config/database");

// Busca cliente pelo id.
async function buscarPorId(id) {
  return get(
    `
      SELECT id, nome, email, telefone, cidade, bairro
      FROM clientes
      WHERE id = ?
    `,
    [id]
  );
}

// Busca cliente por e-mail para validar duplicidade.
async function buscarPorEmail(email) {
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

// Cadastra um novo cliente no banco.
async function cadastrarCliente({ nome, email, senha, telefone }) {
  const resultado = await run(
    `
      INSERT INTO clientes (nome, email, senha, telefone)
      VALUES (?, ?, ?, ?)
    `,
    [nome, email, senha, telefone]
  );

  return resultado.lastID;
}

// Atualiza os dados de perfil do cliente.
async function atualizarPerfil({ id, nome, email, telefone, cidade, bairro, senha }) {
  let sql = `
    UPDATE clientes
    SET nome = ?, email = ?, telefone = ?, cidade = ?, bairro = ?
  `;
  const params = [nome, email, telefone, cidade, bairro];

  if (senha) {
    sql += `, senha = ?`;
    params.push(senha);
  }

  sql += ` WHERE id = ?`;
  params.push(id);

  const resultado = await run(sql, params);
  return resultado.changes;
}

module.exports = {
  buscarPorId,
  buscarPorEmail,
  cadastrarCliente,
  atualizarPerfil
};
