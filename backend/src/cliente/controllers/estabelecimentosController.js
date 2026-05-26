const estabelecimentosRepository = require("../repositories/estabelecimentosRepository");
const agendamentosDAO = require("../dao/agendamentosDAO");

// GET /api/estabelecimentos
async function listar(req, res) {
  try {
    const resultado = await estabelecimentosRepository.listarEstabelecimentosComFiltro({
      cidade: req.query.cidade,
      bairro: req.query.bairro,
      tipo: req.query.tipo,
      busca: req.query.q,
      page: req.query.page,
      limit: req.query.limit
    });

    res.status(200).json(resultado);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar estabelecimentos.", detalhes: error.message });
  }
}

// GET /api/estabelecimentos/:id
async function buscarPorId(req, res) {
  try {
    const estabelecimento = await estabelecimentosRepository.buscarEstabelecimentoPorId(req.params.id);

    if (!estabelecimento) {
      res.status(404).json({ erro: "Estabelecimento nao encontrado." });
      return;
    }

    res.status(200).json(estabelecimento);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar estabelecimento.", detalhes: error.message });
  }
}

// GET /api/estabelecimentos/:id/horarios-ocupados?data=YYYY-MM-DD
async function horariosOcupados(req, res) {
  try {
    const data = req.query.data;
    if (!data) {
      res.status(400).json({ erro: "A data e obrigatoria." });
      return;
    }
    const ocupados = await agendamentosDAO.listarHorariosOcupados(req.params.id, data);
    res.status(200).json({ ocupados });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar horarios ocupados.", detalhes: error.message });
  }
}

// GET /api/estabelecimentos/:id/horarios-disponiveis?data=YYYY-MM-DD&duracao=30
async function horariosDisponiveis(req, res) {
  try {
    const data = req.query.data;
    const duracaoMinutos = Number(req.query.duracao) || 30;

    if (!data) {
      res.status(400).json({ erro: "A data e obrigatoria." });
      return;
    }

    const disponiveis = await estabelecimentosRepository.calcularHorariosDisponiveis(req.params.id, data, duracaoMinutos);
    res.status(200).json({ horarios: disponiveis });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao calcular horarios disponiveis.", detalhes: error.message });
  }
}

module.exports = {
  listar,
  buscarPorId,
  horariosOcupados,
  horariosDisponiveis
};
