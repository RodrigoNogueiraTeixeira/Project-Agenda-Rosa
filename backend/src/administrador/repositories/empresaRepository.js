const { all, transaction } = require("../../config/database");

async function getEmpresasPendentes() {
  return all(
    `SELECT 
      id, 
      nome_estabelecimento AS nome, 
      nome_responsavel AS responsavel, 
      cidade, 
      criado_em AS dataCadastro, 
      status_aprovacao AS status 
    FROM empresas 
    WHERE status_aprovacao = 'pendente'`
  );
}

async function updateEmpresaStatus(id, newStatus) {
  let dbStatus = "pendente";
  if (newStatus.toLowerCase().includes("aprov")) {
    dbStatus = "aprovada";
  } else if (newStatus.toLowerCase().includes("reprov")) {
    dbStatus = "reprovada";
  }

  return transaction(async (tx) => {
    const empresa = await tx.get(
      `SELECT
        id,
        nome_estabelecimento,
        categoria_principal,
        cidade,
        bairro,
        endereco,
        numero,
        complemento,
        cep
      FROM empresas
      WHERE id = ?`,
      [id]
    );

    if (!empresa) {
      return false;
    }

    await tx.run(
      `UPDATE empresas
      SET status_aprovacao = ?, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [dbStatus, id]
    );

    if (dbStatus !== "aprovada") {
      return true;
    }

    const enderecoCompleto = [
      empresa.endereco,
      empresa.numero,
      empresa.complemento,
    ]
      .map((parte) => String(parte || "").trim())
      .filter(Boolean)
      .join(", ") || null;

    const resultadoEstabelecimento = await tx.run(
      `INSERT INTO estabelecimentos (
        empresa_id,
        nome,
        cidade,
        bairro,
        endereco,
        cep
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (empresa_id)
      DO UPDATE SET
        nome = excluded.nome,
        cidade = excluded.cidade,
        bairro = excluded.bairro,
        endereco = excluded.endereco,
        cep = excluded.cep
      RETURNING id`,
      [
        empresa.id,
        empresa.nome_estabelecimento,
        empresa.cidade,
        empresa.bairro,
        enderecoCompleto,
        empresa.cep,
      ]
    );

    const estabelecimentoId = resultadoEstabelecimento.lastID;

    await tx.run(
      `UPDATE servicos
      SET estabelecimento_id = ?
      WHERE empresa_id = ?`,
      [estabelecimentoId, empresa.id]
    );

    if (empresa.categoria_principal) {
      const tipoExistente = await tx.get(
        `SELECT id
        FROM estabelecimento_tipos
        WHERE estabelecimento_id = ?
          AND LOWER(tipo) = LOWER(?)
        LIMIT 1`,
        [estabelecimentoId, empresa.categoria_principal]
      );

      if (!tipoExistente) {
        await tx.run(
          `INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo)
          VALUES (?, ?)`,
          [estabelecimentoId, empresa.categoria_principal]
        );
      }
    }

    return true;
  });
}

module.exports = {
  getEmpresasPendentes,
  updateEmpresaStatus
};
