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
      SELECT id, estabelecimento_id, nome, preco, duracao_minutos
      FROM servicos
      WHERE estabelecimento_id IN (${marcadores})
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
      SELECT id, nome, preco, duracao_minutos
      FROM servicos
      WHERE estabelecimento_id = ?
        AND id IN (${marcadores})
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

module.exports = {
  listarComFiltros,
  buscarPorId,
  listarTiposPorEstabelecimentos,
  listarServicosPorEstabelecimentos,
  listarServicosSelecionados,
  atualizarCoordenadas
};
