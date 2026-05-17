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

// Fecha a conexao com o banco ao final da operacao.
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
function selecionarCamposBloqueio() {
  return `SELECT
    bh.id,
    bh.empresa_id AS empresaId,
    bh.profissional_id AS profissionalId,
    COALESCE(p.nome, bh.profissional_nome) AS profissionalNome,
    bh.data_bloqueio AS dataBloqueio,
    bh.horario_inicio AS horarioInicio,
    bh.horario_fim AS horarioFim,
    bh.motivo,
    bh.criado_em AS criadoEm
  FROM bloqueios_horarios bh
  LEFT JOIN profissionais p ON p.id = bh.profissional_id`;
}

// Lista todos os bloqueios de horario da empresa.
async function listarPorEmpresa(empresaId) {
  const db = getDatabase();

  try {
    return await consultarTodos(
      db,
      `${selecionarCamposBloqueio()}
      WHERE bh.empresa_id = ?
      ORDER BY bh.data_bloqueio, bh.horario_inicio`,
      [empresaId]
    );
  } finally {
    await fechar(db);
  }
}

// Busca um bloqueio por ID e empresa.
async function buscarPorId(id, empresaId) {
  const db = getDatabase();

  try {
    return await consultarUm(
      db,
      `${selecionarCamposBloqueio()}
      WHERE bh.id = ? AND bh.empresa_id = ?`,
      [id, empresaId]
    );
  } finally {
    await fechar(db);
  }
}

// Cria um novo bloqueio de horario no banco.
async function criar(dados) {
  const db = getDatabase();

  try {
    const resultado = await executar(
      db,
      `INSERT INTO bloqueios_horarios (
        empresa_id,
        profissional_id,
        profissional_nome,
        data_bloqueio,
        horario_inicio,
        horario_fim,
        motivo
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        dados.empresaId,
        dados.profissionalId,
        dados.profissionalNome ? String(dados.profissionalNome).trim() : null,
        dados.dataBloqueio,
        dados.horarioInicio,
        dados.horarioFim,
        dados.motivo ? String(dados.motivo).trim() : null,
      ]
    );

    return await buscarPorId(resultado.id, dados.empresaId);
  } finally {
    await fechar(db);
  }
}

// Remove um bloqueio de horario da empresa.
async function excluir(id, empresaId) {
  const db = getDatabase();

  try {
    const resultado = await executar(
      db,
      "DELETE FROM bloqueios_horarios WHERE id = ? AND empresa_id = ?",
      [id, empresaId]
    );

    return resultado.changes > 0;
  } finally {
    await fechar(db);
  }
}

// Exporta as operacoes usadas pelo controller de bloqueios.
module.exports = {
  listarPorEmpresa,
  criar,
  excluir,
};
