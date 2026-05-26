const { all, get, run, transaction } = require("../../config/database");

// Salva um agendamento e seus servicos no banco.
async function criarAgendamento({
  clienteId,
  estabelecimentoId,
  estabelecimentoNome,
  data,
  horario,
  profissional,
  observacoes,
  total,
  horarioFim,
  servicos
}) {
  return transaction(async (tx) => {
    const resultadoInsert = await tx.run(
      `
        INSERT INTO agendamentos (
          cliente_id,
          estabelecimento_id,
          estabelecimento_nome,
          data,
          horario,
          profissional,
          observacoes,
          total,
          horario_fim,
          status,
          criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        clienteId,
        estabelecimentoId,
        estabelecimentoNome,
        data,
        horario,
        profissional,
        observacoes,
        total,
        horarioFim,
        "pendente",
        new Date().toISOString()
      ]
    );

    const agendamentoId = resultadoInsert.lastID;

    for (const servico of servicos) {
      await tx.run(
        `
          INSERT INTO agendamento_servicos (agendamento_id, servico_id, nome, preco)
          VALUES (?, ?, ?, ?)
        `,
        [agendamentoId, servico.id, servico.nome, servico.preco]
      );
    }

    return agendamentoId;
  });
}

// Lista os agendamentos de um cliente.
async function listarPorCliente(clienteId) {
  return all(
    `
      SELECT
        a.id,
        a.cliente_id,
        a.estabelecimento_id,
        a.estabelecimento_nome,
        a.data,
        a.horario,
        a.profissional,
        a.observacoes,
        a.total,
        a.status,
        a.criado_em,
        a.cancelado_em,
        e.latitude as estabelecimento_lat,
        e.longitude as estabelecimento_lng,
        e.endereco as estabelecimento_endereco,
        (SELECT init_point FROM pagamentos p WHERE p.agendamento_id = a.id ORDER BY p.id DESC LIMIT 1) as pagamento_url
      FROM agendamentos a
      LEFT JOIN estabelecimentos e ON a.estabelecimento_id = e.id
      WHERE a.cliente_id = ?
      ORDER BY a.id DESC
    `,
    [clienteId]
  );
}

// Lista os servicos de varios agendamentos.
async function listarServicosPorAgendamentos(agendamentoIds) {
  if (!agendamentoIds || agendamentoIds.length === 0) {
    return [];
  }

  const marcadores = agendamentoIds.map(() => "?").join(", ");

  return all(
    `
      SELECT id, agendamento_id, servico_id, nome, preco
      FROM agendamento_servicos
      WHERE agendamento_id IN (${marcadores})
      ORDER BY id ASC
    `,
    agendamentoIds
  );
}

// Busca um agendamento pelo id.
async function buscarPorId(id) {
  return get(
    `
      SELECT id, cliente_id, estabelecimento_id, estabelecimento_nome, total, status
      FROM agendamentos
      WHERE id = ?
    `,
    [id]
  );
}

// Verifica se ja existe agendamento ativo no mesmo horario do estabelecimento.
async function existeConflitoDeHorario({ estabelecimentoId, data, horario, horarioFim }) {
  const conflito = await get(
    `
      SELECT id
      FROM agendamentos
      WHERE estabelecimento_id = ?
        AND data = ?
        AND (
          status IN ('agendado', 'concluido')
          OR (status = 'pendente' AND criado_em::timestamptz >= NOW() - INTERVAL '15 minutes')
        )
        AND (
          -- Verifica se existe intersecção de horários: 
          -- (Novo Início < Existente Fim) E (Novo Fim > Existente Início)
          -- OR fallback para agendamentos antigos que nao tinham horario_fim
          (? < horario_fim AND ? > horario)
          OR (horario_fim IS NULL AND horario = ?)
        )
      LIMIT 1
    `,
    [estabelecimentoId, data, horario, horarioFim, horario]
  );

  return Boolean(conflito);
}

// Busca todos os horários ocupados para uma data e estabelecimento específicos
async function listarHorariosOcupados(estabelecimentoId, data) {
  const rows = await all(
    `
      SELECT horario, horario_fim
      FROM agendamentos
      WHERE estabelecimento_id = ?
        AND data = ?
        AND (
          status IN ('agendado', 'concluido')
          OR (status = 'pendente' AND criado_em::timestamptz >= NOW() - INTERVAL '15 minutes')
        )
    `,
    [estabelecimentoId, data]
  );
  return rows.map((row) => ({
    horario: row.horario,
    horario_fim: row.horario_fim
  }));
}

// Cancela o agendamento (se possivel).
async function cancelarPorId(id) {
  const resultado = await run(
    `
      UPDATE agendamentos
      SET status = ?, cancelado_em = ?
      WHERE id = ?
    `,
    ["cancelado", new Date().toISOString(), id]
  );

  return resultado.changes;
}

// Atualiza o status do agendamento
async function atualizarStatus(id, status) {
  const resultado = await run(
    `
      UPDATE agendamentos
      SET status = ?
      WHERE id = ?
    `,
    [status, id]
  );
  return resultado.changes;
}

module.exports = {
  criarAgendamento,
  listarPorCliente,
  listarServicosPorAgendamentos,
  buscarPorId,
  cancelarPorId,
  existeConflitoDeHorario,
  listarHorariosOcupados,
  atualizarStatus
};
