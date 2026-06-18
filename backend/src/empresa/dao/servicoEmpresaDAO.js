const { run, get, all } = require("../../config/database");

// Define os campos retornados para servicos da empresa.
function selecionarCamposServico() {
  return `SELECT
    id,
    empresa_id AS "empresaId",
    nome,
    categoria,
    preco,
    preco_centavos AS "precoCentavos",
    duracao_minutos AS "duracaoMinutos",
    descricao,
    status,
    criado_em AS "criadoEm",
    atualizado_em AS "atualizadoEm"
  FROM servicos`;
}

async function listarPorEmpresa(empresaId) {
  // Lista os servicos da empresa em ordem alfabetica.
  return all(
    `${selecionarCamposServico()}
    WHERE empresa_id = ?
    ORDER BY nome`,
    [empresaId]
  );
}

async function buscarPorId(id, empresaId) {
  // Busca um servico especifico dentro da empresa.
  return get(
    `${selecionarCamposServico()}
    WHERE id = ? AND empresa_id = ?`,
    [id, empresaId]
  );
}

async function criar(dados) {
  // Cria o servico ja associado ao estabelecimento da empresa.
  const resultado = await run(
    `INSERT INTO servicos (
      empresa_id,
      estabelecimento_id,
      nome,
      categoria,
      preco,
      preco_centavos,
      duracao_minutos,
      descricao,
      status
    ) VALUES (
      ?,
      (SELECT id FROM estabelecimentos WHERE empresa_id = ?),
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?
    )`,
    [
      dados.empresaId,
      dados.empresaId,
      String(dados.nome).trim(),
      String(dados.categoria).trim(),
      dados.precoCentavos / 100,
      dados.precoCentavos,
      dados.duracaoMinutos,
      dados.descricao ? String(dados.descricao).trim() : null,
      dados.status,
    ]
  );

  return buscarPorId(resultado.lastID, dados.empresaId);
}

async function atualizar(id, dados) {
  // Atualiza os dados principais de um servico existente.
  const resultado = await run(
    `UPDATE servicos
    SET
      nome = ?,
      categoria = ?,
      preco = ?,
      preco_centavos = ?,
      duracao_minutos = ?,
      descricao = ?,
      status = ?,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ? AND empresa_id = ?`,
    [
      String(dados.nome).trim(),
      String(dados.categoria).trim(),
      dados.precoCentavos / 100,
      dados.precoCentavos,
      dados.duracaoMinutos,
      dados.descricao ? String(dados.descricao).trim() : null,
      dados.status,
      id,
      dados.empresaId,
    ]
  );

  if (resultado.changes === 0) {
    return null;
  }

  return buscarPorId(id, dados.empresaId);
}

async function excluir(id, empresaId) {
  // Remove o servico apenas quando ele pertence a empresa.
  const resultado = await run(
    "DELETE FROM servicos WHERE id = ? AND empresa_id = ?",
    [id, empresaId]
  );

  return resultado.changes > 0;
}

module.exports = {
  listarPorEmpresa,
  buscarPorId,
  criar,
  atualizar,
  excluir,
};
