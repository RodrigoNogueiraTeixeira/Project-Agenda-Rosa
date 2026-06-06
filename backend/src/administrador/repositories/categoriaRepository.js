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

async function editarCategoria(id, dados) {
  await run(
    "UPDATE categorias SET nome = ?, descricao = ?, status = ? WHERE id = ?",
    [
      String(dados.nome).trim(),
      String(dados.descricao || "").trim(),
      String(dados.status || "Ativa").trim(),
      id
    ]
  );
  return { id, ...dados };
}

async function excluirCategoria(id) {
  const result = await run("DELETE FROM categorias WHERE id = ?", [id]);
  return result.changes > 0;
}

module.exports = {
  getCategorias,
  criarCategoria,
  editarCategoria,
  excluirCategoria
};
