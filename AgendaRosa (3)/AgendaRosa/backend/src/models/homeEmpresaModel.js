const { getDatabase } = require("../database/database");

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

// Conta quantos agendamentos ativos existem para hoje.
async function contarAgendamentosHoje(db, empresaId, dataHoje) {
  const resultado = await consultarUm(
    db,
    `SELECT COUNT(*) AS total
    FROM agendamentos
    WHERE empresa_id = ?
      AND data_agendamento = ?
      AND status IN ('pendente', 'confirmado')`,
    [empresaId, dataHoje]
  );

  return resultado.total;
}

// Busca o proximo atendimento de hoje a partir do horario atual.
async function buscarProximoAtendimento(db, empresaId, dataHoje, horaAtual) {
  return await consultarUm(
    db,
    `SELECT
      ag.horario_inicio AS horarioInicio,
      ag.nome_cliente AS nomeCliente,
      s.nome AS servicoNome,
      p.nome AS profissionalNome
    FROM agendamentos ag
    INNER JOIN servicos s ON s.id = ag.servico_id
    LEFT JOIN profissionais p ON p.id = ag.profissional_id
    WHERE ag.empresa_id = ?
      AND ag.data_agendamento = ?
      AND ag.horario_inicio >= ?
      AND ag.status IN ('pendente', 'confirmado')
    ORDER BY ag.horario_inicio
    LIMIT 1`,
    [empresaId, dataHoje, horaAtual]
  );
}

// Conta bloqueios manuais cadastrados para hoje.
async function contarBloqueiosHoje(db, empresaId, dataHoje) {
  const resultado = await consultarUm(
    db,
    `SELECT COUNT(*) AS total
    FROM bloqueios_horarios
    WHERE empresa_id = ?
      AND data_bloqueio = ?`,
    [empresaId, dataHoje]
  );

  return resultado.total;
}

// Agrupa todos os indicadores usados pela home da empresa.
async function buscarResumo(filtros) {
  const db = getDatabase();

  try {
    const totalAgendamentosHoje = await contarAgendamentosHoje(
      db,
      filtros.empresaId,
      filtros.dataHoje
    );
    const proximoAtendimento = await buscarProximoAtendimento(
      db,
      filtros.empresaId,
      filtros.dataHoje,
      filtros.horaAtual
    );
    const totalBloqueiosHoje = await contarBloqueiosHoje(
      db,
      filtros.empresaId,
      filtros.dataHoje
    );

    return {
      dataReferencia: filtros.dataHoje,
      horaReferencia: filtros.horaAtual,
      totalAgendamentosHoje,
      proximoAtendimento,
      totalBloqueiosHoje,
    };
  } finally {
    await fechar(db);
  }
}

// Exporta as consultas usadas pelo controller da home.
module.exports = {
  buscarResumo,
};
