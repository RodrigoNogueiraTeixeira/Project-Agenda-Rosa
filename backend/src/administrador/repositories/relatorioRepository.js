const { get } = require("../../config/database");

async function getRelatorio(tipo, dataInicial = '', dataFinal = '') {
  let sqlClientes = "SELECT COUNT(*) AS total FROM clientes WHERE 1=1";
  let sqlEmpresas = "SELECT COUNT(*) AS total FROM empresas WHERE status_aprovacao = 'aprovada'";
  let sqlCancelados = "SELECT COUNT(*) AS total FROM agendamentos WHERE status LIKE '%cancel%'";

  const paramsClientes = [];
  const paramsEmpresas = [];
  const paramsCancelados = [];

  if (dataInicial && dataFinal) {
    sqlEmpresas += " AND criado_em BETWEEN ? AND ?";
    paramsEmpresas.push(dataInicial, `${dataFinal} 23:59:59`);

    sqlCancelados += " AND criado_em BETWEEN ? AND ?";
    paramsCancelados.push(dataInicial, `${dataFinal} 23:59:59`);
  }

  const totalClientes = await get(sqlClientes, paramsClientes);
  const totalEmpresas = await get(sqlEmpresas, paramsEmpresas);
  const totalCancelados = await get(sqlCancelados, paramsCancelados);

  const formattedClientes = totalClientes ? totalClientes.total.toLocaleString("pt-BR") : "0";
  const formattedEmpresas = totalEmpresas ? totalEmpresas.total.toLocaleString("pt-BR") : "0";
  const formattedCancelados = totalCancelados ? totalCancelados.total.toLocaleString("pt-BR") : "0";

  if (tipo.toLowerCase() === "usuarios") {
    return {
      usuariosCadastrados: formattedClientes,
      empresasAprovadas: "N/A",
      cancelamentos: "N/A"
    };
  }

  if (tipo.toLowerCase() === "empresas") {
    return {
      usuariosCadastrados: "N/A",
      empresasAprovadas: formattedEmpresas,
      cancelamentos: formattedCancelados
    };
  }

  return {
    usuariosCadastrados: formattedClientes,
    empresasAprovadas: formattedEmpresas,
    cancelamentos: formattedCancelados
  };
}

module.exports = {
  getRelatorio
};
