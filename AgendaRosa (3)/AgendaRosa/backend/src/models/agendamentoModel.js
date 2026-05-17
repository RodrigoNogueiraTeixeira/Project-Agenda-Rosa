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

// Define os campos retornados para a tela de agenda.
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

// Lista agendamentos da empresa aplicando os filtros da tela.
async function listarPorEmpresa(filtros) {
  const db = getDatabase();
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

  try {
    return await consultarTodos(
      db,
      `${selecionarCamposAgendamento()}
      WHERE ${where.join(" AND ")}
      ORDER BY ag.data_agendamento, ag.horario_inicio`,
      params
    );
  } finally {
    await fechar(db);
  }
}

// Busca um agendamento especifico por ID e empresa.
async function buscarPorId(id, empresaId) {
  const db = getDatabase();

  try {
    return await consultarUm(
      db,
      `${selecionarCamposAgendamento()}
      WHERE ag.id = ? AND ag.empresa_id = ?`,
      [id, empresaId]
    );
  } finally {
    await fechar(db);
  }
}

// Lista profissionais ativos da empresa para preencher os filtros da agenda.
async function listarProfissionaisAtivos(empresaId) {
  const db = getDatabase();

  try {
    return await consultarTodos(
      db,
      `SELECT
        id,
        nome
      FROM profissionais
      WHERE empresa_id = ? AND ativo = 1
      ORDER BY nome`,
      [empresaId]
    );
  } finally {
    await fechar(db);
  }
}

// Busca o servico para garantir que ele pertence a empresa e esta disponivel.
async function buscarServicoDaEmpresa(servicoId, empresaId) {
  const db = getDatabase();

  try {
    return await consultarUm(
      db,
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
  } finally {
    await fechar(db);
  }
}

// Busca o horario de funcionamento da empresa para um dia da semana.
async function buscarHorarioFuncionamento(empresaId, diaSemana) {
  const db = getDatabase();

  try {
    return await consultarUm(
      db,
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
  } finally {
    await fechar(db);
  }
}

// Verifica se existe bloqueio manual no mesmo intervalo.
async function existeBloqueioNoHorario(dados) {
  const db = getDatabase();
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

  try {
    const bloqueio = await consultarUm(
      db,
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
  } finally {
    await fechar(db);
  }
}

// Verifica se ja existe agendamento ativo no mesmo intervalo.
async function existeAgendamentoNoHorario(dados) {
  const db = getDatabase();
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

  try {
    const agendamento = await consultarUm(
      db,
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
  } finally {
    await fechar(db);
  }
}

// Cria um novo agendamento no banco.
async function criar(dados) {
  const db = getDatabase();

  try {
    const resultado = await executar(
      db,
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

    return await buscarPorId(resultado.id, dados.empresaId);
  } finally {
    await fechar(db);
  }
}

// Atualiza apenas o status do agendamento pela tela da empresa.
async function atualizarStatus(id, empresaId, status) {
  const db = getDatabase();

  try {
    await executar(
      db,
      `UPDATE agendamentos
      SET status = ?, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ? AND empresa_id = ?`,
      [status, id, empresaId]
    );

    return await buscarPorId(id, empresaId);
  } finally {
    await fechar(db);
  }
}

// Exporta as operacoes usadas pelo controller de agendamentos.
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
