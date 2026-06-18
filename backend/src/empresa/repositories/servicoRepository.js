const servicoDAO = require("../dao/servicoEmpresaDAO");

// Lista os servicos cadastrados pela empresa.
async function listarPorEmpresa(empresaId) {
  return servicoDAO.listarPorEmpresa(empresaId);
}

// Envia um novo servico para persistencia.
async function criar(dados) {
  return servicoDAO.criar(dados);
}

// Atualiza o servico dentro da empresa informada.
async function atualizar(id, dados) {
  return servicoDAO.atualizar(id, dados);
}

// Remove o servico quando pertence a empresa.
async function excluir(id, empresaId) {
  return servicoDAO.excluir(id, empresaId);
}

module.exports = {
  listarPorEmpresa,
  criar,
  atualizar,
  excluir,
};
