const { getDatabase } = require("../database/database");

// Executa comandos INSERT, UPDATE e DELETE no SQLite.
function executar(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Consulta apenas um registro no SQLite.
function consultarUm(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

// Fecha a conexao aberta com o banco.
function fechar(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

// Busca uma empresa pelo e-mail para validar duplicidade no cadastro.
async function buscarPorEmail(email) {
  const db = getDatabase();

  try {
    return await consultarUm(
      db,
      "SELECT id, email FROM empresas WHERE LOWER(email) = LOWER(?)",
      [String(email).trim()]
    );
  } finally {
    await fechar(db);
  }
}

// Busca uma empresa pelo ID e retorna somente dados seguros para a resposta da API.
async function buscarPorId(id) {
  const db = getDatabase();

  try {
    return await consultarUm(
      db,
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
  } finally {
    await fechar(db);
  }
}

// Cria uma empresa no banco de dados.
async function criar(dados) {
  const db = getDatabase();

  try {
    const resultado = await executar(
      db,
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

    // Depois de inserir, consulta o registro para retornar os dados formatados.
    return await buscarPorId(resultado.id);
  } finally {
    await fechar(db);
  }
}

// Exporta as operacoes de banco usadas pelo controller de empresa.
module.exports = {
  buscarPorEmail,
  criar,
};
