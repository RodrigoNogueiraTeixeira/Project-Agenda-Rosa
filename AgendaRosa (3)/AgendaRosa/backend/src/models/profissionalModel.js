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

// Consulta uma lista de registros no SQLite.
function consultarTodos(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
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

// Fecha a conexao com o banco ao fim da operacao.
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

// Padroniza os campos retornados para o front-end.
function selecionarCamposProfissional() {
  return `SELECT
    id,
    empresa_id AS empresaId,
    nome,
    telefone,
    email,
    especialidade,
    ativo,
    criado_em AS criadoEm,
    atualizado_em AS atualizadoEm
  FROM profissionais`;
}

// Lista profissionais cadastrados por empresa.
async function listarPorEmpresa(filtros) {
  const db = getDatabase();
  const params = [filtros.empresaId];
  let filtroAtivo = "";

  if (filtros.somenteAtivos) {
    filtroAtivo = "AND ativo = 1";
  }

  try {
    return await consultarTodos(
      db,
      `${selecionarCamposProfissional()}
      WHERE empresa_id = ?
      ${filtroAtivo}
      ORDER BY nome`,
      params
    );
  } finally {
    await fechar(db);
  }
}

// Busca um profissional especifico pelo ID e empresa.
async function buscarPorId(id, empresaId) {
  const db = getDatabase();

  try {
    return await consultarUm(
      db,
      `${selecionarCamposProfissional()}
      WHERE id = ? AND empresa_id = ?`,
      [id, empresaId]
    );
  } finally {
    await fechar(db);
  }
}

// Cria um profissional no banco.
async function criar(dados) {
  const db = getDatabase();

  try {
    const resultado = await executar(
      db,
      `INSERT INTO profissionais (
        empresa_id,
        nome,
        telefone,
        email,
        especialidade,
        ativo
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        dados.empresaId,
        String(dados.nome).trim(),
        dados.telefone ? String(dados.telefone).trim() : null,
        dados.email ? String(dados.email).trim() : null,
        dados.especialidade ? String(dados.especialidade).trim() : null,
        dados.status === "inativo" ? 0 : 1,
      ]
    );

    return await buscarPorId(resultado.id, dados.empresaId);
  } finally {
    await fechar(db);
  }
}

// Atualiza um profissional existente.
async function atualizar(id, dados) {
  const db = getDatabase();

  try {
    const resultado = await executar(
      db,
      `UPDATE profissionais
      SET
        nome = ?,
        telefone = ?,
        email = ?,
        especialidade = ?,
        ativo = ?,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ? AND empresa_id = ?`,
      [
        String(dados.nome).trim(),
        dados.telefone ? String(dados.telefone).trim() : null,
        dados.email ? String(dados.email).trim() : null,
        dados.especialidade ? String(dados.especialidade).trim() : null,
        dados.status === "inativo" ? 0 : 1,
        id,
        dados.empresaId,
      ]
    );

    if (resultado.changes === 0) {
      return null;
    }

    return await buscarPorId(id, dados.empresaId);
  } finally {
    await fechar(db);
  }
}

// Remove um profissional da empresa.
async function excluir(id, empresaId) {
  const db = getDatabase();

  try {
    const resultado = await executar(
      db,
      "DELETE FROM profissionais WHERE id = ? AND empresa_id = ?",
      [id, empresaId]
    );

    return resultado.changes > 0;
  } finally {
    await fechar(db);
  }
}

// Exporta as operacoes usadas pelo controller de profissionais.
module.exports = {
  listarPorEmpresa,
  criar,
  atualizar,
  excluir,
};
