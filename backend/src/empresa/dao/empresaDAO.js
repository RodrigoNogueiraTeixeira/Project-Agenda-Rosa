const { run, get, transaction } = require("../../config/database");

/**
 * Busca uma empresa pelo e-mail.
 */
async function buscarPorEmail(email) {
  return get(
    "SELECT id, email FROM empresas WHERE LOWER(email) = LOWER(?)",
    [String(email).trim()]
  );
}

/**
 * Busca uma empresa pelo ID.
 */
async function buscarPorId(id) {
  return get(
    `SELECT
      id,
      nome_responsavel AS nomeResponsavel,
      telefone,
      email,
      nome_estabelecimento AS nomeEstabelecimento,
      status_aprovacao AS statusAprovacao,
      criado_em AS criadoEm
    FROM empresas
    WHERE id = ?`,
    [id]
  );
}

/**
 * Cria uma nova empresa.
 */
async function criar(dados) {
  const resultado = await run(
    `INSERT INTO empresas (
      nome_responsavel,
      telefone,
      email,
      nome_estabelecimento,
      senha_hash
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      String(dados.nomeResponsavel).trim(),
      String(dados.telefone).trim(),
      String(dados.email).trim().toLowerCase(),
      String(dados.nomeEstabelecimento).trim(),
      dados.senhaHash,
    ]
  );

  return buscarPorId(resultado.lastID);
}

async function buscarPerfil(empresaId) {
  return get(
    `SELECT
      e.id AS "empresaId",
      e.nome_estabelecimento AS "nomeEstabelecimento",
      e.categoria_principal AS "categoriaPrincipal",
      e.descricao,
      e.telefone,
      e.email,
      e.cep,
      e.endereco,
      e.numero,
      e.complemento,
      e.bairro,
      e.cidade,
      est.id AS "estabelecimentoId",
      est.logo_url AS "logoUrl"
    FROM empresas e
    LEFT JOIN estabelecimentos est ON est.empresa_id = e.id
    WHERE e.id = ?`,
    [empresaId]
  );
}

async function atualizarPerfil(dados) {
  return transaction(async (tx) => {
    const empresa = await tx.get(
      "SELECT id FROM empresas WHERE id = ?",
      [dados.empresaId]
    );

    if (!empresa) {
      return false;
    }

    const valor = (campo) => {
      const texto = String(campo || "").trim();
      return texto || null;
    };

    await tx.run(
      `UPDATE empresas
      SET
        nome_estabelecimento = ?,
        categoria_principal = ?,
        descricao = ?,
        telefone = ?,
        email = ?,
        cep = ?,
        endereco = ?,
        numero = ?,
        complemento = ?,
        bairro = ?,
        cidade = ?,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        valor(dados.nomeEstabelecimento),
        valor(dados.categoriaPrincipal),
        valor(dados.descricao),
        valor(dados.telefone),
        valor(dados.email).toLowerCase(),
        valor(dados.cep),
        valor(dados.endereco),
        valor(dados.numero),
        valor(dados.complemento),
        valor(dados.bairro),
        valor(dados.cidade),
        dados.empresaId,
      ]
    );

    const enderecoCompleto = [
      dados.endereco,
      dados.numero,
      dados.complemento,
    ]
      .map(valor)
      .filter(Boolean)
      .join(", ");

    const resultadoEstabelecimento = await tx.run(
      `INSERT INTO estabelecimentos (
        empresa_id,
        nome,
        cidade,
        bairro,
        endereco,
        cep,
        logo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (empresa_id)
      DO UPDATE SET
        nome = excluded.nome,
        cidade = excluded.cidade,
        bairro = excluded.bairro,
        endereco = excluded.endereco,
        cep = excluded.cep,
        logo_url = excluded.logo_url
      RETURNING id`,
      [
        dados.empresaId,
        valor(dados.nomeEstabelecimento),
        valor(dados.cidade),
        valor(dados.bairro),
        enderecoCompleto || null,
        valor(dados.cep),
        valor(dados.logoUrl),
      ]
    );

    const estabelecimentoId = resultadoEstabelecimento.lastID;

    await tx.run(
      "UPDATE servicos SET estabelecimento_id = ? WHERE empresa_id = ?",
      [estabelecimentoId, dados.empresaId]
    );
    await tx.run(
      "DELETE FROM estabelecimento_tipos WHERE estabelecimento_id = ?",
      [estabelecimentoId]
    );
    await tx.run(
      `INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo)
      VALUES (?, ?)`,
      [estabelecimentoId, valor(dados.categoriaPrincipal)]
    );

    return true;
  });
}

module.exports = {
  buscarPorEmail,
  buscarPorId,
  criar,
  buscarPerfil,
  atualizarPerfil,
};
