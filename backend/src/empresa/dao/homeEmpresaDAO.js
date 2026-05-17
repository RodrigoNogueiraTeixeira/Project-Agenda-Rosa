const { get } = require("../../config/database");

async function contarAgendamentosHoje(empresaId, dataHoje) {
  const resultado = await get(
    `SELECT COUNT(*) AS total
    FROM agendamentos
    WHERE empresa_id = ?
      AND data_agendamento = ?
      AND status IN ('pendente', 'confirmado', 'agendado')`, // Adicionei 'agendado' por compatibilidade
    [empresaId, dataHoje]
  );

  return resultado.total;
}

async function buscarProximoAtendimento(empresaId, dataHoje, horaAtual) {
  return get(
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
      AND ag.status IN ('pendente', 'confirmado', 'agendado')
    ORDER BY ag.horario_inicio
    LIMIT 1`,
    [empresaId, dataHoje, horaAtual]
  );
}

async function contarBloqueiosHoje(empresaId, dataHoje) {
  const resultado = await get(
    `SELECT COUNT(*) AS total
    FROM bloqueios_horarios
    WHERE empresa_id = ?
      AND data_bloqueio = ?`,
    [empresaId, dataHoje]
  );

  return resultado.total;
}

async function buscarResumo(filtros) {
  const totalAgendamentosHoje = await contarAgendamentosHoje(
    filtros.empresaId,
    filtros.dataHoje
  );
  const proximoAtendimento = await buscarProximoAtendimento(
    filtros.empresaId,
    filtros.dataHoje,
    filtros.horaAtual
  );
  const totalBloqueiosHoje = await contarBloqueiosHoje(
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
}

module.exports = {
  buscarResumo,
};
