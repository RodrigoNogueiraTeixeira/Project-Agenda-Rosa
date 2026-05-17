const horarioDAO = require("../dao/horarioDAO");

async function listarPorEmpresa(empresaId) {
  return horarioDAO.listarPorEmpresa(empresaId);
}

async function salvarTodos(empresaId, horarios) {
  return horarioDAO.salvarTodos(empresaId, horarios);
}

module.exports = {
  listarPorEmpresa,
  salvarTodos,
};
