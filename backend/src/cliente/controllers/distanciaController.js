// Importa a camada de repositório (Repository) que lida com a lógica de mapas e geolocalização.
const distanciaRepository = require("../repositories/distanciaRepository");

/**
 * FUNÇÃO: calcular
 * OBJETIVO: Receber um endereço de origem e um de destino e calcular a distância viária real (em metros/km) e tempo de viagem (em minutos/segundos).
 */
async function calcular(req, res) {
  // 'try': Inicia o bloco de proteção contra erros inesperados na consulta de mapas.
  try {
    // Chama o repositório para calcular a distância física passando os dados de endereço do corpo da requisição (req.body).
    const dados = await distanciaRepository.calcularDistanciaPorEndereco(req.body || {});
    // Se a distância foi calculada com sucesso, responde com status HTTP 200 (OK) enviando os dados.
    res.status(200).json({ distancia: dados });
  // 'catch': Captura problemas (como endereços inválidos ou falhas na API de mapas).
  } catch (error) {
    // Captura a mensagem de erro específica.
    const mensagem = error.message || "Erro ao calcular distancia.";
    // Responde com status HTTP 400 (Pedido Inválido / Bad Request) enviando a descrição do erro.
    res.status(400).json({ erro: mensagem });
  }
}

/**
 * FUNÇÃO: filtrarPorRaio
 * OBJETIVO: Buscar e filtrar estabelecimentos que estão localizados dentro de um raio de distância em Km (ex: até 5km da casa da cliente).
 */
async function filtrarPorRaio(req, res) {
  // 'try': Inicia o bloco de proteção.
  try {
    // Chama o repositório para listar e filtrar as lojas que estão dentro do raio indicado em req.body.
    const lista = await distanciaRepository.filtrarEstabelecimentosPorRaio(req.body || {});
    // Devolve status HTTP 200 (OK) com a lista das lojas encontradas no raio e a quantidade total delas.
    res.status(200).json({ estabelecimentos: lista, total: lista.length });
  // 'catch': Captura erros de validação (ex: raio inválido ou falha ao geocodificar o ponto de origem).
  } catch (error) {
    const mensagem = error.message || "Erro ao filtrar por raio.";
    // Responde com status HTTP 400 (Pedido Inválido) informando o que deu errado.
    res.status(400).json({ erro: mensagem });
  }
}

// Exporta as funções para serem plugadas nas rotas.
module.exports = {
  calcular,
  filtrarPorRaio
};
