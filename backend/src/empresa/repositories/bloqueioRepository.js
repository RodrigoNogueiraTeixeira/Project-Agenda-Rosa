const bloqueioDAO = require("../dao/bloqueioDAO");

// Lista os bloqueios cadastrados para a empresa.
async function listarPorEmpresa(empresaId) {
  return bloqueioDAO.listarPorEmpresa(empresaId);
}

// Confere o profissional e conflitos antes de cadastrar.
async function criar(dados) {
  const profissional = await bloqueioDAO.buscarProfissionalDaEmpresa(
    dados.profissionalId,
    dados.empresaId
  );

  if (!profissional) {
    throw new Error("Profissional nao pertence a esta empresa ou esta inativo.");
  }

  const bloqueioExistente = await bloqueioDAO.existeSobreposicao(dados);

  if (bloqueioExistente) {
    throw new Error("Ja existe um bloqueio neste periodo para o profissional.");
  }

  const dadosDoBloqueio = {
    empresaId: dados.empresaId,
    profissionalId: dados.profissionalId,
    profissionalNome: profissional.nome,
    dataBloqueio: dados.dataBloqueio,
    horarioInicio: dados.horarioInicio,
    horarioFim: dados.horarioFim,
    motivo: dados.motivo,
  };

  return bloqueioDAO.criar(dadosDoBloqueio);
}

// Remove o bloqueio dentro do escopo da empresa.
async function excluir(id, empresaId) {
  return bloqueioDAO.excluir(id, empresaId);
}

module.exports = {
  listarPorEmpresa,
  criar,
  excluir,
};
