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

module.exports = {
  buscarClientePorEmail
};
