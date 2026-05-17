const servicoDAO = require("../dao/servicoEmpresaDAO");

async function listarPorEmpresa(empresaId) {
  return servicoDAO.listarPorEmpresa(empresaId);
}

async function criar(dados) {
  return servicoDAO.criar(dados);
}

async function atualizar(id, dados) {
  return servicoDAO.atualizar(id, dados);
}

async function excluir(id, empresaId) {
  return servicoDAO.excluir(id, empresaId);
}

module.exports = {
  listarPorEmpresa,
  criar,
  atualizar,
  excluir,
};
