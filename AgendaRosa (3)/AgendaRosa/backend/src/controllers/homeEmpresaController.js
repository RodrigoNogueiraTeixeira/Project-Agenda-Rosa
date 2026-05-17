const homeEmpresaModel = require("../models/homeEmpresaModel");

// Formata a data atual no padrao YYYY-MM-DD usado pelo SQLite.
function obterDataHoje() {
  return new Date().toISOString().slice(0, 10);
}

// Formata a hora atual no padrao HH:MM para comparar com horarios do banco.
function obterHoraAtual() {
  return new Date().toTimeString().slice(0, 5);
}

// Controller responsavel por montar os indicadores exibidos na home da empresa.
async function buscarResumo(req, res) {
  try {
    const { empresaId } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const resumo = await homeEmpresaModel.buscarResumo({
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

// Exporta os controllers usados pelas rotas da home da empresa.
module.exports = {
  buscarResumo,
};
