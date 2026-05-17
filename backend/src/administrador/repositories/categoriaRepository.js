const { all, run } = require("../../config/database");

async function getCategorias() {
  return all("SELECT id, nome, descricao, status FROM categorias");
}

async function criarCategoria(dados) {
  const result = await run(
    "INSERT INTO categorias (nome, descricao, status) VALUES (?, ?, ?)",
    [
      String(dados.nome).trim(),
      String(dados.descricao || "").trim(),
      String(dados.status || "Ativa").trim()
    ]
  );
  return { id: result.lastID, ...dados };
}

module.exports = {
  getCategorias,
  criarCategoria
};
