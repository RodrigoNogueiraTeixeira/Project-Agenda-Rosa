const profissionalDAO = require("../dao/profissionalDAO");

// Envia os filtros de empresa e status para o DAO.
async function listarPorEmpresa(filtros) {
  return profissionalDAO.listarPorEmpresa(filtros);
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
