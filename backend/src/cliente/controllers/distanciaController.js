const distanciaRepository = require("../repositories/distanciaRepository");

async function calcular(req, res) {
  try {
    const dados = await distanciaRepository.calcularDistanciaPorEndereco(req.body || {});
    res.status(200).json({ distancia: dados });
  } catch (error) {
    const mensagem = error.message || "Erro ao calcular distancia.";
    res.status(400).json({ erro: mensagem });
  }
}

async function filtrarPorRaio(req, res) {
  try {
    const lista = await distanciaRepository.filtrarEstabelecimentosPorRaio(req.body || {});
    res.status(200).json({ estabelecimentos: lista, total: lista.length });
  } catch (error) {
    const mensagem = error.message || "Erro ao filtrar por raio.";
    res.status(400).json({ erro: mensagem });
  }
}

module.exports = {
  calcular,
  filtrarPorRaio
};
