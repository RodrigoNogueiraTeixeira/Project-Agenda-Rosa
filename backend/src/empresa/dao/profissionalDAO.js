const { run, get, all, transaction } = require("../../config/database");

// Define os campos basicos retornados para profissionais.
function selecionarCamposProfissional() {
  return `SELECT
    id,
    empresa_id AS "empresaId",
    nome,
    telefone,
    email,
    ativo,
    criado_em AS "criadoEm",
    atualizado_em AS "atualizadoEm"
  FROM profissionais`;
}

// Adiciona os servicos atendidos em cada profissional.
async function adicionarServicos(profissionais, empresaId) {
  if (profissionais.length === 0) {
    return profissionais;
  }

  const vinculos = await all(
    `SELECT
      ps.profissional_id AS "profissionalId",
      s.id,
      s.nome
    FROM profissional_servicos ps
    INNER JOIN profissionais p ON p.id = ps.profissional_id
    INNER JOIN servicos s ON s.id = ps.servico_id
    WHERE p.empresa_id = ?
    ORDER BY s.nome`,
    [empresaId]
  );

  for (const profissional of profissionais) {
    profissional.servicos = [];

    for (const vinculo of vinculos) {
      if (Number(vinculo.profissionalId) === Number(profissional.id)) {
        profissional.servicos.push({
          id: Number(vinculo.id),
          nome: vinculo.nome,
        });
      }
    }
  }

  return profissionais;
}

async function listarPorEmpresa(filtros) {
  // Aplica o filtro de ativos quando solicitado pela tela.
  const params = [filtros.empresaId];
  let filtroAtivo = "";

  if (filtros.somenteAtivos) {
    filtroAtivo = "AND ativo = 1";
  }

  const profissionais = await all(
    `${selecionarCamposProfissional()}
    WHERE empresa_id = ?
    ${filtroAtivo}
    ORDER BY nome`,
    params
  );

  return adicionarServicos(profissionais, filtros.empresaId);
}

async function buscarPorId(id, empresaId) {
  // Busca o profissional e adiciona seus servicos vinculados.
  const profissional = await get(
    `${selecionarCamposProfissional()}
    WHERE id = ? AND empresa_id = ?`,
    [id, empresaId]
  );

  if (!profissional) {
    return null;
  }

  const profissionais = await adicionarServicos(
    [profissional],
    empresaId
  );

  return profissionais[0];
}

function montarMarcadores(quantidade) {
  // Gera os placeholders usados no IN da consulta.
  const marcadores = [];

  for (let indice = 0; indice < quantidade; indice += 1) {
    marcadores.push("?");
  }

  return marcadores.join(", ");
}

// Confere se todos os servicos pertencem a empresa.
async function validarServicos(tx, empresaId, servicosIds) {
  const marcadores = montarMarcadores(servicosIds.length);
  const servicos = await tx.all(
    `SELECT id
    FROM servicos
    WHERE empresa_id = ?
      AND id IN (${marcadores})`,
    [empresaId, ...servicosIds]
  );

  if (servicos.length !== servicosIds.length) {
    throw new Error("Selecione somente servicos cadastrados pela empresa.");
  }
}

async function salvarVinculos(tx, profissionalId, servicosIds) {
  // Cadastra os servicos atendidos pelo profissional.
  for (const servicoId of servicosIds) {
    await tx.run(
      `INSERT INTO profissional_servicos (profissional_id, servico_id)
      VALUES (?, ?)`,
      [profissionalId, servicoId]
    );
  }
}

async function criar(dados) {
  // Cria profissional e vinculos em uma unica transacao.
  const profissionalId = await transaction(async function (tx) {
    await validarServicos(tx, dados.empresaId, dados.servicosIds);

    const resultado = await tx.run(
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
        null,
        dados.status === "inativo" ? 0 : 1,
      ]
    );

    await salvarVinculos(tx, resultado.lastID, dados.servicosIds);
    return resultado.lastID;
  });

  return buscarPorId(profissionalId, dados.empresaId);
}

async function atualizar(id, dados) {
  // Atualiza o profissional e recria seus vinculos de servicos.
  const atualizado = await transaction(async function (tx) {
    const profissional = await tx.get(
      "SELECT id FROM profissionais WHERE id = ? AND empresa_id = ?",
      [id, dados.empresaId]
    );

    if (!profissional) {
      return false;
    }

    await validarServicos(tx, dados.empresaId, dados.servicosIds);

    await tx.run(
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
        null,
        dados.status === "inativo" ? 0 : 1,
        id,
        dados.empresaId,
      ]
    );

    await tx.run(
      "DELETE FROM profissional_servicos WHERE profissional_id = ?",
      [id]
    );
    await salvarVinculos(tx, id, dados.servicosIds);

    return true;
  });

  if (!atualizado) {
    return null;
  }

  return buscarPorId(id, dados.empresaId);
}

async function excluir(id, empresaId) {
  // Exclui somente se o profissional pertencer a empresa.
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
