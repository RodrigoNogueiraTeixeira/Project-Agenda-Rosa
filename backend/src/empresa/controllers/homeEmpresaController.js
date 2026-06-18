const homeEmpresaRepository = require("../repositories/homeEmpresaRepository");

// Retorna a data atual no formato usado nas consultas do banco.
function obterDataHoje() {
  const dataAtual = new Date();
  return dataAtual.toISOString().slice(0, 10);
}

// Retorna a hora atual para localizar o proximo atendimento do dia.
function obterHoraAtual() {
  const dataAtual = new Date();
  return dataAtual.toTimeString().slice(0, 5);
}

// Busca os indicadores usados na home da empresa.
async function buscarResumo(req, res) {
  try {
    const empresaId = req.query.empresaId;

    if (!empresaId) {
      return res.status(400).json({
        message: "Informe o ID da empresa.",
      });
    }

    const filtros = {
      empresaId: empresaId,
      dataHoje: obterDataHoje(),
      horaAtual: obterHoraAtual(),
    };

    const resumo = await homeEmpresaRepository.buscarResumo(filtros);

    return res.json(resumo);
  } catch (error) {
    console.error("Erro ao buscar resumo da home:", error);
    return res.status(500).json({
      message: "Erro interno ao buscar resumo da home.",
    });
  }
}

module.exports = {
  buscarResumo,
};
