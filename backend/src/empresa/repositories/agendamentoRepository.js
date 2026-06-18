const agendamentoDAO = require("../dao/agendamentoEmpresaDAO");

// Repassa os filtros de agenda para a consulta do DAO.
async function listarPorEmpresa(filtros) {
  return agendamentoDAO.listarPorEmpresa(filtros);
}

// Busca profissionais ativos usados na tela de agendamento.
async function listarProfissionaisAtivos(empresaId) {
  return agendamentoDAO.listarProfissionaisAtivos(empresaId);
}

// Garante que o servico pertence a empresa antes do agendamento.
async function buscarServicoDaEmpresa(servicoId, empresaId) {
  return agendamentoDAO.buscarServicoDaEmpresa(servicoId, empresaId);
}

// Consulta a regra de funcionamento para o dia escolhido.
async function buscarHorarioFuncionamento(empresaId, diaSemana) {
  return agendamentoDAO.buscarHorarioFuncionamento(empresaId, diaSemana);
}

// Verifica se existe bloqueio sobre o periodo solicitado.
async function existeBloqueioNoHorario(dados) {
  return agendamentoDAO.existeBloqueioNoHorario(dados);
}

// Verifica se ja existe outro agendamento no mesmo periodo.
async function existeAgendamentoNoHorario(dados) {
  return agendamentoDAO.existeAgendamentoNoHorario(dados);
}

// Persiste o agendamento validado pelo controller.
async function criar(dados) {
  return agendamentoDAO.criar(dados);
}

// Busca o agendamento dentro da empresa informada.
async function buscarPorId(id, empresaId) {
  return agendamentoDAO.buscarPorId(id, empresaId);
}

// Salva o novo status do agendamento.
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
