const agendamentoDAO = require("../dao/agendamentoEmpresaDAO");

async function listarPorEmpresa(filtros) {
  return agendamentoDAO.listarPorEmpresa(filtros);
}

async function listarProfissionaisAtivos(empresaId) {
  return agendamentoDAO.listarProfissionaisAtivos(empresaId);
}

async function buscarServicoDaEmpresa(servicoId, empresaId) {
  return agendamentoDAO.buscarServicoDaEmpresa(servicoId, empresaId);
}

async function buscarHorarioFuncionamento(empresaId, diaSemana) {
  return agendamentoDAO.buscarHorarioFuncionamento(empresaId, diaSemana);
}

async function existeBloqueioNoHorario(dados) {
  return agendamentoDAO.existeBloqueioNoHorario(dados);
}

async function existeAgendamentoNoHorario(dados) {
  return agendamentoDAO.existeAgendamentoNoHorario(dados);
}

async function criar(dados) {
  return agendamentoDAO.criar(dados);
}

async function buscarPorId(id, empresaId) {
  return agendamentoDAO.buscarPorId(id, empresaId);
}

async function atualizarStatus(id, empresaId, status) {
  return agendamentoDAO.atualizarStatus(id, empresaId, status);
}

module.exports = {
  listarPorEmpresa,
  listarProfissionaisAtivos,
  buscarServicoDaEmpresa,
  buscarHorarioFuncionamento,
  existeBloqueioNoHorario,
  existeAgendamentoNoHorario,
  criar,
  buscarPorId,
  atualizarStatus,
};
