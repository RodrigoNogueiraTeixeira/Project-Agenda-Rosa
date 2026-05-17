const { get } = require("../../config/database");

async function getRelatorio(tipo) {
  const totalClientes = await get("SELECT COUNT(*) AS total FROM clientes");
  const totalEmpresas = await get("SELECT COUNT(*) AS total FROM empresas WHERE status_aprovacao = 'aprovada'");
  const totalCancelados = await get("SELECT COUNT(*) AS total FROM agendamentos WHERE status LIKE '%cancel%'");

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
