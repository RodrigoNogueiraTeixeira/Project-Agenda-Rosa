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
async function atualizarPerfil({ id, nome, email, telefone, cidade, bairro }) {
  const resultado = await run(
    `
      UPDATE clientes
      SET nome = ?, email = ?, telefone = ?, cidade = ?, bairro = ?
      WHERE id = ?
    `,
    [nome, email, telefone, cidade, bairro, id]
  );

  return resultado.changes;
}

module.exports = {
  buscarPorId,
  atualizarPerfil
};
