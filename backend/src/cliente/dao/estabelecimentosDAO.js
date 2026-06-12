// Importa as funções auxiliares de execução de query do banco de dados configurado (config/database.js).
// - all: executa consultas SQL que retornam múltiplas linhas de registros.
// - get: executa consultas SQL que retornam apenas uma única linha (ou nulo).
const { all, get } = require("../../config/database");

// Função: listarComFiltros
// Objetivo: Consulta estabelecimentos filtrando pelo tipo de serviço cadastrado, usando SQL parametrizado.
// Parâmetros:
// - tipos: array contendo as categorias de serviços para filtrar (ex: ['salao', 'cabeleireiro']).
async function listarComFiltros({ tipos }) {
  const condicoes = [];
  const params = [];

  // Se houver tipos especificados na busca:
  if (tipos && tipos.length > 0) {
    // Cria marcadores genéricos "?" separados por vírgula para segurança contra SQL Injection (ex: "?, ?").
    const marcadores = tipos.map(() => "?").join(", ");
    
    // Adiciona uma cláusula EXISTS para buscar estabelecimentos que possuam ao menos uma
    // correspondência na tabela relacionada 'estabelecimento_tipos'.
    condicoes.push(`
      EXISTS (
        SELECT 1
        FROM estabelecimento_tipos et
        WHERE et.estabelecimento_id = e.id
          AND LOWER(et.tipo) IN (${marcadores})
      )
    `);
    
    // Alimenta o array de parâmetros seguros com os tipos normalizados em minúsculas.
    params.push(...tipos.map((tipo) => String(tipo || "").toLowerCase()));
  }

  // Se houver condições, monta a cláusula WHERE conectando-as com AND. Caso contrário, monta string vazia.
  const whereSql = condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "";

  // Executa a consulta SELECT parametrizada buscando os campos básicos da loja.
  const rows = await all(
    `
      SELECT e.id, e.nome, e.cidade, e.bairro, e.endereco, e.cep, e.logo_url, e.latitude, e.longitude
      FROM estabelecimentos e
      ${whereSql}
      ORDER BY e.nome ASC
    `,
    params
  );

  // Retorna o resultado envelopado com o total de linhas encontradas.
  return {
    total: rows.length,
    estabelecimentos: rows
  };
}

// Função: buscarPorId
// Objetivo: Executa um SELECT simples para resgatar os dados de um estabelecimento a partir do seu ID numérico.
// Parâmetros:
// - id: ID do estabelecimento.
async function buscarPorId(id) {
  return get(
    `SELECT id, nome, cidade, bairro, endereco, cep, logo_url, latitude, longitude FROM estabelecimentos WHERE id = ?`,
    [id]
  );
}

// Função: listarTiposPorEstabelecimentos
// Objetivo: Busca em lote (batch query) as especialidades/tipos de uma lista de estabelecimentos.
// Parâmetros:
// - ids: array de IDs numéricos de estabelecimentos (ex: [1, 2, 3]).
async function listarTiposPorEstabelecimentos(ids) {
  // Verificação de segurança para evitar consultas SQL malformadas com arrays vazios.
  if (!ids || ids.length === 0) {
    return [];
  }

  // Gera marcadores "?" baseados na quantidade de IDs do array.
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

// Função: listarServicosPorEstabelecimentos
// Objetivo: Busca em lote os serviços cadastrados e ativos para uma lista de estabelecimentos.
// Parâmetros:
// - ids: array de IDs de estabelecimentos.
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

// Função: listarServicosSelecionados
// Objetivo: Busca uma lista de serviços específicos de um determinado estabelecimento que estejam ativos no banco.
// Parâmetros:
// - estabelecimentoId: ID do estabelecimento.
// - servicosIds: lista contendo os IDs numéricos dos serviços selecionados na tela (ex: [5, 12]).
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

// Função: atualizarCoordenadas
// Objetivo: Executa um comando SQL UPDATE para salvar as coordenadas de geolocalização (latitude e longitude) de uma loja.
// Parâmetros:
// - id: ID do estabelecimento.
// - latitude, longitude: coordenadas decimais.
async function atualizarCoordenadas(id, latitude, longitude) {
  // Importa a função utilitária de alteração/execução no banco de dados.
  const { run } = require("../../config/database");
  return run(
    `UPDATE estabelecimentos SET latitude = ?, longitude = ? WHERE id = ?`,
    [latitude, longitude, id]
  );
}

// Função: listarProfissionaisPorEstabelecimento
// Objetivo: Lista os profissionais ativos da empresa correspondente ao estabelecimento.
// Se uma lista de IDs de serviços for enviada, garante que apenas profissionais habilitados a prestar
// TODOS os serviços selecionados sejam retornados.
// Parâmetros:
// - estabelecimentoId: ID da loja.
// - servicosIds: array contendo IDs de serviços selecionados (opcional).
async function listarProfissionaisPorEstabelecimento(estabelecimentoId, servicosIds = []) {
  // 1. Busca a 'empresa_id' atrelada ao estabelecimento:
  const estabelecimento = await get(
    "SELECT empresa_id FROM estabelecimentos WHERE id = ?",
    [estabelecimentoId]
  );

  let empresaId = estabelecimento ? estabelecimento.empresa_id : null;

  // 2. Fallback de Segurança:
  // Se a empresa_id estiver nula no estabelecimento, tenta recuperar através de algum serviço cadastrado.
  if (!empresaId) {
    const servico = await get(
      "SELECT DISTINCT empresa_id FROM servicos WHERE estabelecimento_id = ? AND empresa_id IS NOT NULL LIMIT 1",
      [estabelecimentoId]
    );
    empresaId = servico ? servico.empresa_id : estabelecimentoId;
  }

  // 3. Filtragem Avançada de Profissionais por Habilidades (Serviços):
  // Se o usuário selecionou serviços específicos na tela de agendamento:
  if (servicosIds.length > 0) {
    const marcadores = servicosIds.map(() => "?").join(", ");

    // O profissional precisa estar vinculado e habilitado a executar a totalidade dos serviços selecionados.
    // Usamos INNER JOINs entre as tabelas profissionais, profissional_servicos e servicos.
    // A cláusula 'HAVING COUNT(DISTINCT ps.servico_id) = ?' valida se a quantidade de correspondências
    // bate com o tamanho do array enviado pelo frontend.
    const resultado = await all(
      `
        SELECT p.id, p.nome, p.especialidade
        FROM profissionais p
        INNER JOIN profissional_servicos ps ON ps.profissional_id = p.id
        INNER JOIN servicos s ON s.id = ps.servico_id
        WHERE p.empresa_id = ?
          AND p.ativo = 1
          AND s.estabelecimento_id = ?
          AND ps.servico_id IN (${marcadores})
        GROUP BY p.id, p.nome, p.especialidade
        HAVING COUNT(DISTINCT ps.servico_id) = ?
        ORDER BY p.nome
      `,
      [empresaId, estabelecimentoId, ...servicosIds, servicosIds.length]
    );

    // Se encontrou profissionais qualificados em lote, retorna-os imediatamente.
    if (resultado && resultado.length > 0) {
      return resultado;
    }
  }

  // 4. Fallback Geral (Sem serviços especificados ou sem correspondências exclusivas):
  // Retorna todos os profissionais ativos associados à empresa do estabelecimento ordenados por nome.
  return all(
    "SELECT id, nome, especialidade FROM profissionais WHERE empresa_id = ? AND ativo = 1 ORDER BY nome",
    [empresaId]
  );
}

// Função: buscarHorarioFuncionamento
// Objetivo: Consulta as definições de horários e intervalos de expediente da empresa de um estabelecimento
// filtrando por um dia da semana específico (0 = Domingo, 1 = Segunda, ..., 6 = Sábado).
// Parâmetros:
// - estabelecimentoId: ID do estabelecimento.
// - diaSemana: número inteiro representando o dia da semana.
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

// Função: listarBloqueiosPorData
// Objetivo: Consulta bloqueios pontuais de agenda (feriados, recessos ou folgas de profissionais)
// cadastrados para a empresa do estabelecimento em uma determinada data.
// Parâmetros:
// - estabelecimentoId: ID do estabelecimento.
// - data: string da data no formato "YYYY-MM-DD".
async function listarBloqueiosPorData(estabelecimentoId, data) {
  // 1. Localiza a empresa associada ao estabelecimento:
  const estabelecimento = await get(
    "SELECT empresa_id FROM estabelecimentos WHERE id = ?",
    [estabelecimentoId]
  );

  let empresaId = estabelecimento ? estabelecimento.empresa_id : null;

  // 2. Fallback de Segurança:
  if (!empresaId) {
    const servico = await get(
      "SELECT DISTINCT empresa_id FROM servicos WHERE estabelecimento_id = ? AND empresa_id IS NOT NULL LIMIT 1",
      [estabelecimentoId]
    );
    empresaId = servico ? servico.empresa_id : estabelecimentoId;
  }

  // 3. Consulta Bloqueios na Data:
  // Retorna a lista de bloqueios cadastrados com início e fim para a data correspondente.
  return all(
    `SELECT
      bh.profissional_id,
      bh.profissional_nome,
      bh.horario_inicio,
      bh.horario_fim
    FROM bloqueios_horarios bh
    WHERE bh.empresa_id = ?
      AND bh.data_bloqueio = ?
    ORDER BY bh.horario_inicio`,
    [empresaId, data]
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
