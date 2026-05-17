const homeEmpresaDAO = require("../dao/homeEmpresaDAO");

async function buscarResumo(filtros) {
  return homeEmpresaDAO.buscarResumo(filtros);
}

module.exports = {
  buscarResumo,
};
