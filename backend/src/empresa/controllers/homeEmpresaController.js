const homeEmpresaRepository = require("../repositories/homeEmpresaRepository");

function obterDataHoje() {
  return new Date().toISOString().slice(0, 10);
}

function obterHoraAtual() {
  return new Date().toTimeString().slice(0, 5);
}

async function buscarResumo(req, res) {
  try {
    const { empresaId } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const resumo = await homeEmpresaRepository.buscarResumo({
      empresaId,
      dataHoje: obterDataHoje(),
      horaAtual: obterHoraAtual(),
    });

    return res.json(resumo);
  } catch (error) {
    console.error("Erro ao buscar resumo da home:", error);
    return res.status(500).json({ message: "Erro interno ao buscar resumo da home." });
  }
}

module.exports = {
  buscarResumo,
};
