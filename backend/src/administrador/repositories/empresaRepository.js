const { all, transaction, get } = require("../../config/database");

async function getEmpresasFiltradas(filtros = {}) {
  let sql = `
    SELECT 
      id, 
      nome_estabelecimento AS nome, 
      nome_responsavel AS responsavel, 
      cidade, 
      criado_em AS dataCadastro, 
      status_aprovacao AS status 
    FROM empresas 
    WHERE 1=1
  `;
  const params = [];

  if (filtros.status && filtros.status !== "Todos") {
    let val = filtros.status.toLowerCase();
    if (val === "aprovado") val = "aprovada";
    if (val === "reprovado") val = "reprovada";
    sql += " AND status_aprovacao = ?";
    params.push(val);
  }

  if (filtros.nome) {
    // Busca por nome do estabelecimento ou do responsável, insensível a maiúsculas/minúsculas
    sql += " AND (nome_estabelecimento ILIKE ? OR nome_responsavel ILIKE ?)";
    params.push(`%${filtros.nome}%`, `%${filtros.nome}%`);
  }

  if (filtros.data) {
    sql += " AND criado_em LIKE ?";
    params.push(`${filtros.data}%`);
  }

  sql += " ORDER BY criado_em DESC";

  return all(sql, params);
}

async function getEmpresasPendentes() {
  return getEmpresasFiltradas({ status: "Pendente" });
}

async function getEmpresaById(id) {
  return get(
    `SELECT 
      id, 
      nome_responsavel AS responsavel, 
      telefone, 
      email, 
      nome_estabelecimento AS nome, 
      categoria_principal AS categoria, 
      descricao, 
      cep, 
      endereco, 
      numero, 
      complemento, 
      bairro, 
      cidade, 
      status_aprovacao AS status, 
      criado_em AS dataCadastro 
    FROM empresas 
    WHERE id = ?`,
    [id]
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
  getEmpresasFiltradas,
  getEmpresaById,
  updateEmpresaStatus
};
