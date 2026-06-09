const { all, get } = require("../../config/database");

// Busca estabelecimentos com filtro de tipo (filtros textuais ficam no repository).
async function listarComFiltros({ tipos }) {
  const condicoes = [];
  const params = [];

  if (tipos && tipos.length > 0) {
    const marcadores = tipos.map(() => "?").join(", ");
    condicoes.push(`
      EXISTS (
        SELECT 1
        FROM estabelecimento_tipos et
        WHERE et.estabelecimento_id = e.id
          AND LOWER(et.tipo) IN (${marcadores})
      )
    `);
    params.push(...tipos.map((tipo) => String(tipo || "").toLowerCase()));
  }

  const whereSql = condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "";

  const rows = await all(
    `
      SELECT e.id, e.nome, e.cidade, e.bairro, e.endereco, e.cep, e.logo_url, e.latitude, e.longitude
      FROM estabelecimentos e
      ${whereSql}
      ORDER BY e.nome ASC
    `,
    params
  );

  return {
    total: rows.length,
    estabelecimentos: rows
  };
}

// Busca um estabelecimento pelo id.
async function buscarPorId(id) {
  return get(
    `SELECT id, nome, cidade, bairro, endereco, cep, logo_url, latitude, longitude FROM estabelecimentos WHERE id = ?`,
    [id]
  );
}

// Busca os tipos para uma lista de estabelecimentos.
async function listarTiposPorEstabelecimentos(ids) {
  if (!ids || ids.length === 0) {
    return [];
  }

  const marcadores = ids.map(() => "?").join(", ");
  return all(
    `
      SELECT estabelecimento_id, tipo
      FROM estabelecimento_tipos
      WHERE estabelecimento_id IN (${marcadores})
      ORDER BY id ASC
    `,
    ids
  );
}

// Busca os servicos para uma lista de estabelecimentos.
async function listarServicosPorEstabelecimentos(ids) {
  if (!ids || ids.length === 0) {
    return [];
  }

  const marcadores = ids.map(() => "?").join(", ");
  return all(
    `
      SELECT id, estabelecimento_id, nome, preco, duracao_minutos, categoria
      FROM servicos
      WHERE estabelecimento_id IN (${marcadores})
        AND (status = 'ativo' OR status IS NULL)
      ORDER BY id ASC
    `,
    ids
  );
}

// Busca servicos validos de um estabelecimento por lista de IDs.
async function listarServicosSelecionados(estabelecimentoId, servicosIds) {
  if (!servicosIds || servicosIds.length === 0) {
    return [];
  }

  const marcadores = servicosIds.map(() => "?").join(", ");
  return all(
    `
      SELECT id, nome, preco, duracao_minutos, categoria
      FROM servicos
      WHERE estabelecimento_id = ?
        AND id IN (${marcadores})
        AND (status = 'ativo' OR status IS NULL)
      ORDER BY id ASC
    `,
    [estabelecimentoId, ...servicosIds]
  );
}

// Atualiza as coordenadas do estabelecimento.
async function atualizarCoordenadas(id, latitude, longitude) {
  const { run } = require("../../config/database");
  return run(
    `UPDATE estabelecimentos SET latitude = ?, longitude = ? WHERE id = ?`,
    [latitude, longitude, id]
  );
}

// Busca profissionais ativos da empresa do estabelecimento.
async function listarProfissionaisPorEstabelecimento(estabelecimentoId, servicosIds = []) {
  const estabelecimento = await get(
    "SELECT empresa_id FROM estabelecimentos WHERE id = ?",
    [estabelecimentoId]
  );

  let empresaId = estabelecimento ? estabelecimento.empresa_id : null;

  if (!empresaId) {
    const servico = await get(
      "SELECT DISTINCT empresa_id FROM servicos WHERE estabelecimento_id = ? AND empresa_id IS NOT NULL LIMIT 1",
      [estabelecimentoId]
    );
    empresaId = servico ? servico.empresa_id : estabelecimentoId;
  }

  if (servicosIds.length > 0) {
    const marcadores = servicosIds.map(() => "?").join(", ");

    // O profissional precisa estar vinculado a todos os servicos selecionados.
    const resultado = await all(
      `
        SELECT p.id, p.nome
        FROM profissionais p
        INNER JOIN profissional_servicos ps ON ps.profissional_id = p.id
        INNER JOIN servicos s ON s.id = ps.servico_id
        WHERE p.empresa_id = ?
          AND p.ativo = 1
          AND s.estabelecimento_id = ?
          AND ps.servico_id IN (${marcadores})
        GROUP BY p.id, p.nome
        HAVING COUNT(DISTINCT ps.servico_id) = ?
        ORDER BY p.nome
      `,
      [empresaId, estabelecimentoId, ...servicosIds, servicosIds.length]
    );

    if (resultado && resultado.length > 0) {
      return resultado;
    }
  }

  // Fallback: se nenhum profissional atende aos serviços específicos (ou se nenhum serviço foi passado),
  // retorna todos os profissionais ativos cadastrados pela empresa do estabelecimento.
  return all(
    "SELECT id, nome, especialidade FROM profissionais WHERE empresa_id = ? AND ativo = 1 ORDER BY nome",
    [empresaId]
  );
}

async function buscarHorarioFuncionamento(estabelecimentoId, diaSemana) {
  return get(
    `SELECT
      e.empresa_id,
      h.abre,
      h.horario_abertura,
      h.horario_fechamento,
      h.intervalo_inicio,
      h.intervalo_fim
    FROM estabelecimentos e
    LEFT JOIN horarios_funcionamento h
      ON h.empresa_id = e.empresa_id
      AND h.dia_semana = ?
    WHERE e.id = ?`,
    [diaSemana, estabelecimentoId]
  );
}

async function listarBloqueiosPorData(estabelecimentoId, data) {
  return all(
    `SELECT
      bh.profissional_id,
      bh.profissional_nome,
      bh.horario_inicio,
      bh.horario_fim
    FROM bloqueios_horarios bh
    INNER JOIN estabelecimentos e ON e.empresa_id = bh.empresa_id
    WHERE e.id = ?
      AND bh.data_bloqueio = ?
    ORDER BY bh.horario_inicio`,
    [estabelecimentoId, data]
  );
}

module.exports = {
  listarComFiltros,
  buscarPorId,
  listarTiposPorEstabelecimentos,
  listarServicosPorEstabelecimentos,
  listarServicosSelecionados,
  atualizarCoordenadas,
  listarProfissionaisPorEstabelecimento,
  buscarHorarioFuncionamento,
  listarBloqueiosPorData
};
