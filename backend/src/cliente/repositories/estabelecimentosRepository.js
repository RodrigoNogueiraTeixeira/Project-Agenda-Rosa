const estabelecimentosDAO = require("../dao/estabelecimentosDAO");
const { normalizarTexto, obterSinonimosTipo } = require("../../utils/texto");

// Converte lista de linhas em mapa por estabelecimento.
function agruparPorEstabelecimento(rows, campoId) {
  const mapa = new Map();

  for (const row of rows) {
    const id = Number(row[campoId]);
    if (!mapa.has(id)) {
      mapa.set(id, []);
    }
    mapa.get(id).push(row);
  }

  return mapa;
}

// Aplica regra de busca e devolve resultado pronto para o front.
async function listarEstabelecimentosComFiltro({ cidade, bairro, tipo, busca, page, limit }) {
  const pagina = Number(page) > 0 ? Number(page) : 1;
  const limite = Number(limit) > 0 ? Number(limit) : 2;

  const cidadeNormalizada = normalizarTexto(cidade);
  const bairroNormalizado = normalizarTexto(bairro);
  const buscaNormalizada = normalizarTexto(busca);
  const tipoNormalizado = normalizarTexto(tipo);

  const tipos = tipoNormalizado ? obterSinonimosTipo(tipoNormalizado) : [];

  const base = await estabelecimentosDAO.listarComFiltros({ tipos });
  const todos = Array.isArray(base.estabelecimentos) ? base.estabelecimentos : [];

  // Filtro textual no repository para comparar acentos de forma confiavel.
  const filtrados = todos.filter((item) => {
    const cidadeItem = normalizarTexto(item.cidade);
    const bairroItem = normalizarTexto(item.bairro);
    const nomeItem = normalizarTexto(item.nome);

    const atendeCidade = !cidadeNormalizada || cidadeItem.includes(cidadeNormalizada);
    const atendeBairro = !bairroNormalizado || bairroItem.includes(bairroNormalizado);
    const atendeBusca = !buscaNormalizada || nomeItem.includes(buscaNormalizada);

    return atendeCidade && atendeBairro && atendeBusca;
  });

  const offset = (pagina - 1) * limite;
  const paginados = filtrados.slice(offset, offset + limite);
  const ids = paginados.map((item) => Number(item.id));

  const tiposRows = await estabelecimentosDAO.listarTiposPorEstabelecimentos(ids);
  const servicosRows = await estabelecimentosDAO.listarServicosPorEstabelecimentos(ids);

  const tiposMap = agruparPorEstabelecimento(tiposRows, "estabelecimento_id");
  const servicosMap = agruparPorEstabelecimento(servicosRows, "estabelecimento_id");

  const itens = paginados.map((estabelecimento) => {
    const id = Number(estabelecimento.id);
    const tiposDoEstabelecimento = (tiposMap.get(id) || []).map((row) => row.tipo);
    const servicosDoEstabelecimento = (servicosMap.get(id) || []).map((row) => ({
      id: row.id,
      nome: row.nome,
      preco: Number(row.preco || 0)
    }));

    return {
      id,
      nome: estabelecimento.nome,
      cidade: estabelecimento.cidade,
      bairro: estabelecimento.bairro,
      endereco: estabelecimento.endereco,
      logoUrl: estabelecimento.logo_url || "",
      tipos: tiposDoEstabelecimento,
      servicos: servicosDoEstabelecimento
    };
  });

  return {
    pagina,
    limite,
    total: filtrados.length,
    totalPaginas: Math.max(1, Math.ceil(filtrados.length / limite)),
    estabelecimentos: itens
  };
}

// Busca detalhada de um estabelecimento especifico.
async function buscarEstabelecimentoPorId(id) {
  const estabelecimento = await estabelecimentosDAO.buscarPorId(id);

  if (!estabelecimento) {
    return null;
  }

  const tiposRows = await estabelecimentosDAO.listarTiposPorEstabelecimentos([id]);
  const servicosRows = await estabelecimentosDAO.listarServicosPorEstabelecimentos([id]);

  return {
    id: Number(estabelecimento.id),
    nome: estabelecimento.nome,
    cidade: estabelecimento.cidade,
    bairro: estabelecimento.bairro,
    endereco: estabelecimento.endereco,
    logoUrl: estabelecimento.logo_url || "",
    tipos: tiposRows.map((row) => row.tipo),
    servicos: servicosRows.map((row) => ({
      id: row.id,
      nome: row.nome,
      preco: Number(row.preco || 0)
    }))
  };
}

// Busca servicos validos de um estabelecimento para uso no agendamento.
async function buscarServicosSelecionados(estabelecimentoId, servicosIds) {
  const servicos = await estabelecimentosDAO.listarServicosSelecionados(estabelecimentoId, servicosIds);
  return servicos.map((item) => ({
    id: Number(item.id),
    nome: item.nome,
    preco: Number(item.preco || 0)
  }));
}

module.exports = {
  listarEstabelecimentosComFiltro,
  buscarEstabelecimentoPorId,
  buscarServicosSelecionados
};
