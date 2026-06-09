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
  servicos,
  // Campos de compatibilidade com o painel da empresa:
  empresaId = null,
  servicoId = null,
  profissionalId = null,
  nomeCliente = null,
  telefoneCliente = null,
  emailCliente = null,
  dataAgendamento = null,
  horarioInicio = null
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
          criado_em,
          empresa_id,
          servico_id,
          profissional_id,
          nome_cliente,
          telefone_cliente,
          email_cliente,
          data_agendamento,
          horario_inicio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        new Date().toISOString(),
        empresaId,
        servicoId,
        profissionalId,
        nomeCliente,
        telefoneCliente,
        emailCliente,
        dataAgendamento,
        horarioInicio
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

// Verifica se ja existe agendamento ativo no mesmo horario do estabelecimento (e profissional).
async function existeConflitoDeHorario({ estabelecimentoId, data, horario, horarioFim, profissionalId = null }) {
  // Se for um profissional especifico
  if (profissionalId && profissionalId !== "qualquer" && profissionalId !== "") {
    const conflito = await get(
      `
        SELECT id
        FROM agendamentos
        WHERE estabelecimento_id = ?
          AND COALESCE(data, data_agendamento) = ?
          AND (
            status IN ('agendado', 'confirmado', 'concluido', 'realizado')
            OR (status = 'pendente' AND criado_em::timestamptz >= NOW() - INTERVAL '15 minutes')
          )
          AND (
            profissional_id = ? 
            OR profissional = (SELECT nome FROM profissionais WHERE id = ?)
          )
          AND (
            (? < horario_fim AND ? > COALESCE(horario, horario_inicio))
            OR (horario_fim IS NULL AND COALESCE(horario, horario_inicio) = ?)
          )
        LIMIT 1
      `,
      [
        estabelecimentoId,
        data,
        Number(profissionalId),
        Number(profissionalId),
        horario,
        horarioFim,
        horario
      ]
    );
    return Boolean(conflito);
  }

  // Se for "Sem preferencia" (qualquer):
  // Um slot e livre se houver pelo menos um profissional livre.
  const estabelecimentosDAO = require("./estabelecimentosDAO");
  const profissionais = await estabelecimentosDAO.listarProfissionaisPorEstabelecimento(estabelecimentoId);

  if (profissionais.length === 0) {
    const conflito = await get(
      `
        SELECT id
        FROM agendamentos
        WHERE estabelecimento_id = ?
          AND COALESCE(data, data_agendamento) = ?
          AND (
            status IN ('agendado', 'confirmado', 'concluido', 'realizado')
            OR (status = 'pendente' AND criado_em::timestamptz >= NOW() - INTERVAL '15 minutes')
          )
          AND (
            (? < horario_fim AND ? > COALESCE(horario, horario_inicio))
            OR (horario_fim IS NULL AND COALESCE(horario, horario_inicio) = ?)
          )
        LIMIT 1
      `,
      [estabelecimentoId, data, horario, horarioFim, horario]
    );
    return Boolean(conflito);
  }

  for (const prof of profissionais) {
    const conflitoProf = await get(
      `
        SELECT id
        FROM agendamentos
        WHERE estabelecimento_id = ?
          AND COALESCE(data, data_agendamento) = ?
          AND (
            status IN ('agendado', 'confirmado', 'concluido', 'realizado')
            OR (status = 'pendente' AND criado_em::timestamptz >= NOW() - INTERVAL '15 minutes')
          )
          AND (
            profissional_id = ? 
            OR profissional = ?
          )
          AND (
            (? < horario_fim AND ? > COALESCE(horario, horario_inicio))
            OR (horario_fim IS NULL AND COALESCE(horario, horario_inicio) = ?)
          )
        LIMIT 1
      `,
      [
        estabelecimentoId,
        data,
        prof.id,
        prof.nome,
        horario,
        horarioFim,
        horario
      ]
    );

    if (!conflitoProf) {
      return false; // Achamos pelo menos um profissional livre!
    }
  }

  return true; // Todos os profissionais ocupados
}

// Busca todos os horários ocupados para uma data e estabelecimento (e profissional) específicos
async function listarHorariosOcupados(estabelecimentoId, data, profissionalId = null) {
  let query = `
    SELECT 
      COALESCE(horario, horario_inicio) AS horario, 
      horario_fim, 
      profissional_id, 
      profissional
    FROM agendamentos
    WHERE estabelecimento_id = ?
      AND COALESCE(data, data_agendamento) = ?
      AND (
        status IN ('agendado', 'confirmado', 'concluido', 'realizado')
        OR (status = 'pendente' AND criado_em::timestamptz >= NOW() - INTERVAL '15 minutes')
      )
  `;
  const params = [estabelecimentoId, data];

  if (profissionalId && profissionalId !== "qualquer") {
    query += " AND (profissional_id = ? OR profissional = (SELECT nome FROM profissionais WHERE id = ?))";
    params.push(Number(profissionalId), Number(profissionalId));
  }

  const rows = await all(query, params);
  return rows.map((row) => ({
    horario: row.horario,
    horario_fim: row.horario_fim,
    profissionalId: row.profissional_id,
    profissional: row.profissional
  }));
}

// Cancela o agendamento (se possivel).
async function cancelarPorId(id) {
  const resultado = await run(
    `
      UPDATE agendamentos
      SET status = ?, cancelado_em = ?, atualizado_em = ?
      WHERE id = ?
    `,
    ["cancelado", new Date().toISOString(), new Date().toISOString(), id]
  );

  return resultado.changes;
}

// Atualiza o status do agendamento
async function atualizarStatus(id, status) {
  const resultado = await run(
    `
      UPDATE agendamentos
      SET status = ?, atualizado_em = ?
      WHERE id = ?
    `,
    [status, new Date().toISOString(), id]
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
