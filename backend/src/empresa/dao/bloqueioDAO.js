const { run, get, all } = require("../../config/database");

function selecionarCamposBloqueio() {
  return `SELECT
    bh.id,
    bh.empresa_id AS empresaId,
    bh.profissional_id AS profissionalId,
    COALESCE(p.nome, bh.profissional_nome) AS profissionalNome,
    bh.data_bloqueio AS dataBloqueio,
    bh.horario_inicio AS horarioInicio,
    bh.horario_fim AS horarioFim,
    bh.motivo,
    bh.criado_em AS criadoEm
  FROM bloqueios_horarios bh
  LEFT JOIN profissionais p ON p.id = bh.profissional_id`;
}

async function listarPorEmpresa(empresaId) {
  return all(
    `${selecionarCamposBloqueio()}
    WHERE bh.empresa_id = ?
    ORDER BY bh.data_bloqueio, bh.horario_inicio`,
    [empresaId]
  );
}

async function buscarPorId(id, empresaId) {
  return get(
    `${selecionarCamposBloqueio()}
    WHERE bh.id = ? AND bh.empresa_id = ?`,
    [id, empresaId]
  );
}

async function criar(dados) {
  const resultado = await run(
    `INSERT INTO bloqueios_horarios (
      empresa_id,
      profissional_id,
      profissional_nome,
      data_bloqueio,
      horario_inicio,
      horario_fim,
      motivo
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      dados.empresaId,
      dados.profissionalId,
      dados.profissionalNome ? String(dados.profissionalNome).trim() : null,
      dados.dataBloqueio,
      dados.horarioInicio,
      dados.horarioFim,
      dados.motivo ? String(dados.motivo).trim() : null,
    ]
  );

  return buscarPorId(resultado.lastID, dados.empresaId);
}

async function buscarProfissionalDaEmpresa(profissionalId, empresaId) {
  return get(
    `SELECT id, nome
    FROM profissionais
    WHERE id = ?
      AND empresa_id = ?
      AND ativo = 1`,
    [profissionalId, empresaId]
  );
}

async function existeSobreposicao(dados) {
  return get(
    `SELECT id
    FROM bloqueios_horarios
    WHERE empresa_id = ?
      AND data_bloqueio = ?
      AND horario_inicio < ?
      AND horario_fim > ?
      AND profissional_id = ?
    LIMIT 1`,
    [
      dados.empresaId,
      dados.dataBloqueio,
      dados.horarioFim,
      dados.horarioInicio,
      dados.profissionalId,
    ]
  );
}

async function excluir(id, empresaId) {
  const resultado = await run(
    "DELETE FROM bloqueios_horarios WHERE id = ? AND empresa_id = ?",
    [id, empresaId]
  );

  return resultado.changes > 0;
}

module.exports = {
  listarPorEmpresa,
  buscarId: buscarPorId, // Nota: Usei buscarPorId internamente
  buscarProfissionalDaEmpresa,
  existeSobreposicao,
  criar,
  excluir,
};
