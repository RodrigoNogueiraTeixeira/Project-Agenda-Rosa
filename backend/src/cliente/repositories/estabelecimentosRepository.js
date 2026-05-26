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
      preco: Number(row.preco || 0),
      duracao_minutos: Number(row.duracao_minutos || 30)
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
      preco: Number(row.preco || 0),
      duracao_minutos: Number(row.duracao_minutos || 30)
    }))
  };
}

// Busca servicos validos de um estabelecimento para uso no agendamento.
async function buscarServicosSelecionados(estabelecimentoId, servicosIds) {
  const servicos = await estabelecimentosDAO.listarServicosSelecionados(estabelecimentoId, servicosIds);
  return servicos.map((item) => ({
    id: Number(item.id),
    nome: item.nome,
    preco: Number(item.preco || 0),
    duracao_minutos: Number(item.duracao_minutos || 30)
  }));
}

// Calcula horários disponíveis dinamicamente com base na duração dos serviços
async function calcularHorariosDisponiveis(estabelecimentoId, data, duracaoMinutos) {
  // Buscar horários ocupados já com os campos horario e horario_fim
  // Lembrete: agendamentosDAO.listarHorariosOcupados agora retorna objetos com {horario, horario_fim}
  const agendamentosDAO = require("../dao/agendamentosDAO");
  const ocupados = await agendamentosDAO.listarHorariosOcupados(estabelecimentoId, data);

  // Idealmente, buscaríamos de horarios_funcionamento para a empresa_id e dia da semana.
  // Por enquanto, vamos adotar um padrão de 09:00 às 19:00 para suportar a lógica, 
  // já que o app de cliente (mockado) não está linkado completamente à tabela horarios_funcionamento.
  
  const horarioAbertura = "09:00";
  const horarioFechamento = "19:00";
  
  const [aberturaH, aberturaM] = horarioAbertura.split(":").map(Number);
  const [fechamentoH, fechamentoM] = horarioFechamento.split(":").map(Number);
  
  const inicioMinutos = aberturaH * 60 + aberturaM;
  const fimMinutos = fechamentoH * 60 + fechamentoM;
  
  const stepMinutos = 30; // Intervalo padrão de geração de slots
  
  const slotsLivres = [];
  
  const dataHoje = new Date();
  const dataSelecionadaObj = new Date(`${data}T00:00:00`);
  
  const isHoje = dataHoje.toDateString() === dataSelecionadaObj.toDateString();
  const agoraMinutos = dataHoje.getHours() * 60 + dataHoje.getMinutes();
  
  for (let m = inicioMinutos; m + duracaoMinutos <= fimMinutos; m += stepMinutos) {
    if (isHoje && m <= agoraMinutos) {
      continue; // Passou da hora de hoje
    }
    
    const slotFimMinutos = m + duracaoMinutos;
    
    // Converter minutos para string HH:mm
    const slotInicioStr = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const slotFimStr = `${String(Math.floor(slotFimMinutos / 60)).padStart(2, '0')}:${String(slotFimMinutos % 60).padStart(2, '0')}`;
    
    // Verificar se existe sobreposição com algum ocupado
    let conflito = false;
    for (const ocupado of ocupados) {
      const oFim = ocupado.horario_fim || ocupado.horario; // fallback caso antigo não tenha fim
      
      // Existe interseção se (inicio < ocupadoFim) E (fim > ocupadoInicio)
      if (slotInicioStr < oFim && slotFimStr > ocupado.horario) {
        conflito = true;
        break;
      }
    }
    
    if (!conflito) {
      slotsLivres.push(slotInicioStr);
    }
  }
  
  return slotsLivres;
}

module.exports = {
  listarEstabelecimentosComFiltro,
  buscarEstabelecimentoPorId,
  buscarServicosSelecionados,
  calcularHorariosDisponiveis
};
