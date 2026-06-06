const bloqueioDAO = require("../dao/bloqueioDAO");

async function listarPorEmpresa(empresaId) {
  return bloqueioDAO.listarPorEmpresa(empresaId);
}

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

  return bloqueioDAO.criar({
    ...dados,
    profissionalNome: profissional.nome,
  });
}

async function excluir(id, empresaId) {
  return bloqueioDAO.excluir(id, empresaId);
}

module.exports = {
  listarPorEmpresa,
  criar,
  excluir,
};
