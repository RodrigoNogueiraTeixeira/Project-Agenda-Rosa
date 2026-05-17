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

// Define os campos retornados para o front-end com nomes padronizados em camelCase.
function selecionarCamposHorario() {
  return `SELECT
    id,
    empresa_id AS empresaId,
    dia_semana AS diaSemana,
    abre,
    horario_abertura AS horarioAbertura,
    horario_fechamento AS horarioFechamento,
    intervalo_inicio AS intervaloInicio,
    intervalo_fim AS intervaloFim
  FROM horarios_funcionamento`;
}

// Lista os horarios semanais cadastrados para uma empresa.
async function listarPorEmpresa(empresaId) {
  const db = getDatabase();

  try {
    return await consultarTodos(
      db,
      `${selecionarCamposHorario()}
      WHERE empresa_id = ?
      ORDER BY dia_semana`,
      [empresaId]
    );
  } finally {
    await fechar(db);
  }
}

// Salva uma linha de horario usando UPSERT para criar ou atualizar o mesmo dia.
async function salvarHorario(db, empresaId, horario) {
  return await executar(
    db,
    `INSERT INTO horarios_funcionamento (
      empresa_id,
      dia_semana,
      abre,
      horario_abertura,
      horario_fechamento,
      intervalo_inicio,
      intervalo_fim
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(empresa_id, dia_semana)
    DO UPDATE SET
      abre = excluded.abre,
      horario_abertura = excluded.horario_abertura,
      horario_fechamento = excluded.horario_fechamento,
      intervalo_inicio = excluded.intervalo_inicio,
      intervalo_fim = excluded.intervalo_fim`,
    [
      empresaId,
      horario.diaSemana,
      horario.abre ? 1 : 0,
      horario.abre ? horario.horarioAbertura : null,
      horario.abre ? horario.horarioFechamento : null,
      horario.abre ? horario.intervaloInicio || null : null,
      horario.abre ? horario.intervaloFim || null : null,
    ]
  );
}

// Salva todos os dias da semana dentro de uma transacao.
async function salvarTodos(empresaId, horarios) {
  const db = getDatabase();

  try {
    await executar(db, "BEGIN TRANSACTION");

    for (const horario of horarios) {
      await salvarHorario(db, empresaId, horario);
    }

    await executar(db, "COMMIT");
    return await listarPorEmpresa(empresaId);
  } catch (error) {
    await executar(db, "ROLLBACK");
    throw error;
  } finally {
    await fechar(db);
  }
}

// Exporta as operacoes usadas pelo controller de horario de funcionamento.
module.exports = {
  listarPorEmpresa,
  salvarTodos,
};
