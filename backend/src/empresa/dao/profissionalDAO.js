const { run, get, all } = require("../../config/database");

function selecionarCamposProfissional() {
  return `SELECT
    id,
    empresa_id AS empresaId,
    nome,
    telefone,
    email,
    especialidade,
    ativo,
    criado_em AS criadoEm,
    atualizado_em AS atualizadoEm
  FROM profissionais`;
}

async function listarPorEmpresa(filtros) {
  const params = [filtros.empresaId];
  let filtroAtivo = "";

  if (filtros.somenteAtivos) {
    filtroAtivo = "AND ativo = 1";
  }

  return all(
    `${selecionarCamposProfissional()}
    WHERE empresa_id = ?
    ${filtroAtivo}
    ORDER BY nome`,
    params
  );
}

async function buscarPorId(id, empresaId) {
  return get(
    `${selecionarCamposProfissional()}
    WHERE id = ? AND empresa_id = ?`,
    [id, empresaId]
  );
}

async function criar(dados) {
  const resultado = await run(
    `INSERT INTO profissionais (
      empresa_id,
      nome,
      telefone,
      email,
      especialidade,
      ativo
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      dados.empresaId,
      String(dados.nome).trim(),
      dados.telefone ? String(dados.telefone).trim() : null,
      dados.email ? String(dados.email).trim() : null,
      dados.especialidade ? String(dados.especialidade).trim() : null,
      dados.status === "inativo" ? 0 : 1,
    ]
  );

  return buscarPorId(resultado.lastID, dados.empresaId);
}

async function atualizar(id, dados) {
  const resultado = await run(
    `UPDATE profissionais
    SET
      nome = ?,
      telefone = ?,
      email = ?,
      especialidade = ?,
      ativo = ?,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ? AND empresa_id = ?`,
    [
      String(dados.nome).trim(),
      dados.telefone ? String(dados.telefone).trim() : null,
      dados.email ? String(dados.email).trim() : null,
      dados.especialidade ? String(dados.especialidade).trim() : null,
      dados.status === "inativo" ? 0 : 1,
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
  const resultado = await run(
    "DELETE FROM profissionais WHERE id = ? AND empresa_id = ?",
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
