const { run, get, all } = require("../../config/database");

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

async function listarPorEmpresa(empresaId) {
  return all(
    `${selecionarCamposHorario()}
    WHERE empresa_id = ?
    ORDER BY dia_semana`,
    [empresaId]
  );
}

async function salvarTodos(empresaId, horarios) {
  try {
    await run("BEGIN TRANSACTION");

    for (const horario of horarios) {
      await run(
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

    await run("COMMIT");
    return listarPorEmpresa(empresaId);
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
}

module.exports = {
  listarPorEmpresa,
  salvarTodos,
};
