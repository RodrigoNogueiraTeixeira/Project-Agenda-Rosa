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
  atualizarPerfil
};
