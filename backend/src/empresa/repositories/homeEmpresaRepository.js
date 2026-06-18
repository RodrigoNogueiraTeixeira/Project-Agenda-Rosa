const homeEmpresaDAO = require("../dao/homeEmpresaDAO");

// Centraliza a chamada que monta os indicadores da home.
async function buscarResumo(filtros) {
  return homeEmpresaDAO.buscarResumo(filtros);
}

module.exports = {
  buscarResumo,
};
