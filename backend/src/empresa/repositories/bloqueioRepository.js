const bloqueioDAO = require("../dao/bloqueioDAO");

async function listarPorEmpresa(empresaId) {
  return bloqueioDAO.listarPorEmpresa(empresaId);
}

async function criar(dados) {
  return bloqueioDAO.criar(dados);
}

async function excluir(id, empresaId) {
  return bloqueioDAO.excluir(id, empresaId);
}

module.exports = {
  listarPorEmpresa,
  criar,
  excluir,
};
