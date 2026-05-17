const { run, get, all } = require("../../config/database");

function selecionarCamposAgendamento() {
  return `SELECT
    ag.id,
    ag.empresa_id AS empresaId,
    ag.servico_id AS servicoId,
    ag.profissional_id AS profissionalId,
    ag.cliente_id AS clienteId,
    ag.nome_cliente AS nomeCliente,
    ag.telefone_cliente AS telefoneCliente,
    ag.email_cliente AS emailCliente,
    ag.data_agendamento AS dataAgendamento,
    ag.horario_inicio AS horarioInicio,
    ag.horario_fim AS horarioFim,
    ag.status,
    ag.observacoes,
    ag.criado_em AS criadoEm,
    ag.atualizado_em AS atualizadoEm,
    s.nome AS servicoNome,
    s.duracao_minutos AS duracaoMinutos,
    p.nome AS profissionalNome
  FROM agendamentos ag
  INNER JOIN servicos s ON s.id = ag.servico_id
  LEFT JOIN profissionais p ON p.id = ag.profissional_id`;
}

async function listarPorEmpresa(filtros) {
  const params = [filtros.empresaId];
  const where = ["ag.empresa_id = ?"];

  if (filtros.dataInicial) {
    where.push("ag.data_agendamento >= ?");
    params.push(filtros.dataInicial);
  }

  if (filtros.dataFinal) {
    where.push("ag.data_agendamento <= ?");
    params.push(filtros.dataFinal);
  }

  if (filtros.profissionalId && filtros.profissionalId !== "todos") {
    where.push("ag.profissional_id = ?");
    params.push(filtros.profissionalId);
  }

  if (filtros.cliente) {
    where.push("LOWER(ag.nome_cliente) LIKE LOWER(?)");
    params.push(`%${filtros.cliente}%`);
  }

  return all(
    `${selecionarCamposAgendamento()}
    WHERE ${where.join(" AND ")}
    ORDER BY ag.data_agendamento, ag.horario_inicio`,
    params
  );
}

async function buscarPorId(id, empresaId) {
  return get(
    `${selecionarCamposAgendamento()}
    WHERE ag.id = ? AND ag.empresa_id = ?`,
    [id, empresaId]
  );
}

async function listarProfissionaisAtivos(empresaId) {
  return all(
    `SELECT
      id,
      nome
    FROM profissionais
    WHERE empresa_id = ? AND ativo = 1
    ORDER BY nome`,
    [empresaId]
  );
}

async function buscarServicoDaEmpresa(servicoId, empresaId) {
  return get(
    `SELECT
      id,
      empresa_id AS empresaId,
      nome,
      duracao_minutos AS duracaoMinutos,
      status
    FROM servicos
    WHERE id = ? AND empresa_id = ?`,
    [servicoId, empresaId]
  );
}

async function buscarHorarioFuncionamento(empresaId, diaSemana) {
  return get(
    `SELECT
      abre,
      horario_abertura AS horarioAbertura,
      horario_fechamento AS horarioFechamento,
      intervalo_inicio AS intervaloInicio,
      intervalo_fim AS intervaloFim
    FROM horarios_funcionamento
    WHERE empresa_id = ? AND dia_semana = ?`,
    [empresaId, diaSemana]
  );
}

async function existeBloqueioNoHorario(dados) {
  const params = [
    dados.empresaId,
    dados.dataAgendamento,
    dados.horarioFim,
    dados.horarioInicio,
  ];
  let filtroProfissional = "";

  if (dados.profissionalId) {
    filtroProfissional = "AND (profissional_id IS NULL OR profissional_id = ?)";
    params.push(dados.profissionalId);
  }

  const bloqueio = await get(
    `SELECT id
    FROM bloqueios_horarios
    WHERE empresa_id = ?
      AND data_bloqueio = ?
      AND horario_inicio < ?
      AND horario_fim > ?
      ${filtroProfissional}
    LIMIT 1`,
    params
  );

  return Boolean(bloqueio);
}

async function existeAgendamentoNoHorario(dados) {
  const params = [
    dados.empresaId,
    dados.dataAgendamento,
    dados.horarioFim,
    dados.horarioInicio,
  ];
  let filtroProfissional = "";

  if (dados.profissionalId) {
    filtroProfissional = "AND profissional_id = ?";
    params.push(dados.profissionalId);
  }

  const agendamento = await get(
    `SELECT id
    FROM agendamentos
    WHERE empresa_id = ?
      AND data_agendamento = ?
      AND horario_inicio < ?
      AND horario_fim > ?
      AND status IN ('pendente', 'confirmado')
      ${filtroProfissional}
    LIMIT 1`,
    params
  );

  return Boolean(agendamento);
}

async function criar(dados) {
  const resultado = await run(
    `INSERT INTO agendamentos (
      empresa_id,
      servico_id,
      profissional_id,
      cliente_id,
      nome_cliente,
      telefone_cliente,
      email_cliente,
      data_agendamento,
      horario_inicio,
      horario_fim,
      observacoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dados.empresaId,
      dados.servicoId,
      dados.profissionalId,
      dados.clienteId,
      String(dados.nomeCliente).trim(),
      dados.telefoneCliente ? String(dados.telefoneCliente).trim() : null,
      dados.emailCliente ? String(dados.emailCliente).trim() : null,
      dados.dataAgendamento,
      dados.horarioInicio,
      dados.horarioFim,
      dados.observacoes ? String(dados.observacoes).trim() : null,
    ]
  );

  return buscarPorId(resultado.lastID, dados.empresaId);
}

async function atualizarStatus(id, empresaId, status) {
  await run(
    `UPDATE agendamentos
    SET status = ?, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ? AND empresa_id = ?`,
    [status, id, empresaId]
  );

  return buscarPorId(id, empresaId);
}

module.exports = {
  listarPorEmpresa,
  buscarPorId,
  listarProfissionaisAtivos,
  buscarServicoDaEmpresa,
  buscarHorarioFuncionamento,
  existeBloqueioNoHorario,
  existeAgendamentoNoHorario,
  criar,
  atualizarStatus,
};
