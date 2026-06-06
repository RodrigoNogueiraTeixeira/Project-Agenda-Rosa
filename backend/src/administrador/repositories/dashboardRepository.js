const { get } = require("../../config/database");

async function getStats() {
  const totalClientes = await get("SELECT COUNT(*) AS total FROM clientes");
  const totalEmpresas = await get("SELECT COUNT(*) AS total FROM empresas WHERE status_aprovacao = 'aprovada'");
  const empresasPendentes = await get("SELECT COUNT(*) AS total FROM empresas WHERE status_aprovacao = 'pendente'");
  const totalAgendamentos = await get("SELECT COUNT(*) AS total FROM agendamentos");

  return {
    totalClientes: totalClientes ? totalClientes.total : 0,
    totalEmpresas: totalEmpresas ? totalEmpresas.total : 0,
    empresasPendentes: empresasPendentes ? empresasPendentes.total : 0,
    totalAgendamentos: totalAgendamentos ? totalAgendamentos.total : 0,
    agendamentosPeriodo: 0
  };
}

async function getAgendamentosPeriodo(dataInicial, dataFinal) {
  const resultado = await get(
    "SELECT COUNT(*) AS total FROM agendamentos WHERE data_agendamento BETWEEN ? AND ?",
    [dataInicial, dataFinal]
  );
  return resultado ? resultado.total : 0;
}

module.exports = {
  getStats,
  getAgendamentosPeriodo
};
