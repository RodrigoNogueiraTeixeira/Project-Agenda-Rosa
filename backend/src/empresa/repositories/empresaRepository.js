const empresaDAO = require("../dao/empresaDAO");
const passwordUtils = require("../../utils/password");

async function cadastrarEmpresa(dados) {
  const empresaExistente = await empresaDAO.buscarPorEmail(dados.email);

  if (empresaExistente) {
    throw new Error("E-mail ja cadastrado por outra empresa.");
  }

  const senhaHash = await passwordUtils.hashPassword(dados.senha);

  return empresaDAO.criar({
    nomeResponsavel: dados.nomeResponsavel,
    telefone: dados.telefone,
    email: dados.email,
    nomeEstabelecimento: dados.nomeEstabelecimento,
    senhaHash,
  });
}

async function buscarPerfil(empresaId) {
  return empresaDAO.buscarPerfil(empresaId);
}

async function atualizarPerfil(dados) {
  const empresaComEmail = await empresaDAO.buscarPorEmail(dados.email);

  if (empresaComEmail && Number(empresaComEmail.id) !== Number(dados.empresaId)) {
    throw new Error("E-mail ja cadastrado por outra empresa.");
  }

  await empresaDAO.atualizarPerfil(dados);
  return empresaDAO.buscarPerfil(dados.empresaId);
}

module.exports = {
  cadastrarEmpresa,
  buscarPerfil,
  atualizarPerfil,
};
