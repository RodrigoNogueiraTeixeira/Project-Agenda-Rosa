const { all, run } = require("../../config/database");

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

  const result = await run(
    "UPDATE empresas SET status_aprovacao = ? WHERE id = ?",
    [dbStatus, id]
  );
  return result.changes > 0;
}

module.exports = {
  getEmpresasPendentes,
  updateEmpresaStatus
};
