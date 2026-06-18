const profissionalDAO = require("../dao/profissionalDAO");

// Envia os filtros de empresa e status para o DAO.
async function listarPorEmpresa(filtros) {
  return profissionalDAO.listarPorEmpresa(filtros);
}

async function criar(dados) {
  // Cria o profissional junto com seus servicos atendidos.
  return profissionalDAO.criar(dados);
}

async function atualizar(id, dados) {
  // Atualiza dados cadastrais e vinculos de servicos.
  return profissionalDAO.atualizar(id, dados);
}

async function excluir(id, empresaId) {
  // Exclui o profissional respeitando o limite da empresa.
  return profissionalDAO.excluir(id, empresaId);
}

module.exports = {
  listarPorEmpresa,
  criar,
  atualizar,
  excluir,
};
