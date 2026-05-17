const profissionalDAO = require("../dao/profissionalDAO");

async function listarPorEmpresa(empresaId) {
  return profissionalDAO.listarPorEmpresa(empresaId);
}

async function criar(dados) {
  return profissionalDAO.criar(dados);
}

async function atualizar(id, dados) {
  return profissionalDAO.atualizar(id, dados);
}

async function excluir(id, empresaId) {
  return profissionalDAO.excluir(id, empresaId);
}

module.exports = {
  listarPorEmpresa,
  criar,
  atualizar,
  excluir,
};
