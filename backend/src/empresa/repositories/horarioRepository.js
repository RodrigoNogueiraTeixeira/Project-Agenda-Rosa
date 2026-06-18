const horarioDAO = require("../dao/horarioDAO");

// Consulta os horarios salvos para a empresa.
async function listarPorEmpresa(empresaId) {
  return horarioDAO.listarPorEmpresa(empresaId);
}

// Salva todos os dias de funcionamento de uma vez.
async function salvarTodos(empresaId, horarios) {
  return horarioDAO.salvarTodos(empresaId, horarios);
}

module.exports = {
  listarPorEmpresa,
  salvarTodos,
};
