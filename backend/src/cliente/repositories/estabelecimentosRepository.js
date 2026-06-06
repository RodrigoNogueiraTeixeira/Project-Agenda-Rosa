const estabelecimentosDAO = require("../dao/estabelecimentosDAO");
const { normalizarTexto, obterSinonimosTipo } = require("../../utils/texto");

function adicionarMinutos(horarioStr, minutos) {
  if (!horarioStr || !horarioStr.includes(":")) return horarioStr;
  const [h, m] = horarioStr.split(":").map(Number);
  let totalMinutos = h * 60 + m + minutos;
  const novosH = Math.floor(totalMinutos / 60);
  const novosM = totalMinutos % 60;
  return `${String(novosH).padStart(2, '0')}:${String(novosM).padStart(2, '0')}`;
}

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
      duracao_minutos: Number(row.duracao_minutos || 30),
      categoria: row.categoria || ""
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
      duracao_minutos: Number(row.duracao_minutos || 30),
      categoria: row.categoria || ""
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
    duracao_minutos: Number(item.duracao_minutos || 30),
    categoria: item.categoria || ""
  }));
}

// Calcula horários disponíveis dinamicamente com base na duração dos serviços e filtros de profissionais
async function calcularHorariosDisponiveis(estabelecimentoId, data, duracaoMinutos, profissionalId = null) {
  const agendamentosDAO = require("../dao/agendamentosDAO");
  const estabelecimentosDAO = require("../dao/estabelecimentosDAO");

  // Buscar todos os profissionais ativos do estabelecimento para saber quem está disponível
  const profissionais = await estabelecimentosDAO.listarProfissionaisPorEstabelecimento(estabelecimentoId);

  // Se o profissionalId estiver selecionado e for um ID válido (não "qualquer", não vazio)
  const temProfissionalEspecifico = profissionalId && profissionalId !== "qualquer" && profissionalId !== "";

  if (
    temProfissionalEspecifico &&
    !profissionais.some((profissional) => Number(profissional.id) === Number(profissionalId))
  ) {
    return [];
  }

  // 1. Obter os agendamentos ocupados no dia
  // Se for "Sem preferência" (ou não houver profissionalId especificado), buscamos TODOS os agendamentos ocupados do estabelecimento
  // Se for um profissional específico, buscamos apenas os agendamentos daquele profissional
  const ocupados = await agendamentosDAO.listarHorariosOcupados(estabelecimentoId, data, temProfissionalEspecifico ? profissionalId : null);
  const diaSemana = new Date(`${data}T00:00:00`).getDay();
  const configuracao = await estabelecimentosDAO.buscarHorarioFuncionamento(
    estabelecimentoId,
    diaSemana
  );
  const bloqueios = await estabelecimentosDAO.listarBloqueiosPorData(
    estabelecimentoId,
    data
  );

  if (configuracao?.empresa_id && (!configuracao.abre || !configuracao.horario_abertura)) {
    return [];
  }

  // Idealmente, buscaríamos de horarios_funcionamento para a empresa_id e dia da semana.
  // Por enquanto, vamos adotar um padrão de 09:00 às 19:00 para suportar a lógica, 
  // já que o app de cliente (mockado) não está linkado completamente à tabela horarios_funcionamento.
  
  const horarioAbertura = configuracao?.horario_abertura || "09:00";
  const horarioFechamento = configuracao?.horario_fechamento || "19:00";
  const intervaloInicio = configuracao?.intervalo_inicio || null;
  const intervaloFim = configuracao?.intervalo_fim || null;
  
  const [aberturaH, aberturaM] = horarioAbertura.split(":").map(Number);
  const [fechamentoH, fechamentoM] = horarioFechamento.split(":").map(Number);
  
  const inicioMinutos = aberturaH * 60 + aberturaM;
  const fimMinutos = fechamentoH * 60 + fechamentoM;
  
  const stepMinutos = 30; // Intervalo padrão de geração de slots
  
  // 2. Reunir candidatos a horários de início
  // Geramos os horários padrão a cada 30 min.
  // Além disso, adicionamos o horário de término de cada consulta ocupada no dia como um candidato!
  const candidatosMinutosSet = new Set();
  
  for (let m = inicioMinutos; m <= fimMinutos; m += stepMinutos) {
    candidatosMinutosSet.add(m);
  }
  
  // Para cada consulta ocupada, adicionamos o horario de inicio e o horario_fim como possiveis candidatos de inicio
  for (const o of ocupados) {
    if (o.horario && o.horario.includes(":")) {
      const [hI, mI] = o.horario.split(":").map(Number);
      const minutosInicio = hI * 60 + mI;
      if (minutosInicio >= inicioMinutos && minutosInicio <= fimMinutos) {
        candidatosMinutosSet.add(minutosInicio);
      }
    }
    const oFim = o.horario_fim || adicionarMinutos(o.horario, 30);
    if (oFim && oFim.includes(":")) {
      const [hF, mF] = oFim.split(":").map(Number);
      const minutosFim = hF * 60 + mF;
      if (minutosFim >= inicioMinutos && minutosFim <= fimMinutos) {
        candidatosMinutosSet.add(minutosFim);
      }
    }
  }
  
  // Converter Set para array ordenado
  const candidatosMinutos = Array.from(candidatosMinutosSet).sort((a, b) => a - b);
  
  const slotsLivres = [];
  
  const dataHoje = new Date();
  const dataSelecionadaObj = new Date(`${data}T00:00:00`);
  
  const isHoje = dataHoje.toDateString() === dataSelecionadaObj.toDateString();
  const agoraMinutos = dataHoje.getHours() * 60 + dataHoje.getMinutes();

  const sobrepoe = (inicioA, fimA, inicioB, fimB) => {
    return inicioA < fimB && fimA > inicioB;
  };

  const bloqueioGlobal = (bloqueio) => {
    return !bloqueio.profissional_id && !bloqueio.profissional_nome;
  };

  const profissionalBloqueado = (idProfissional, slotInicio, slotFim) => {
    return bloqueios.some((bloqueio) => {
      const pertenceAoProfissional = Number(bloqueio.profissional_id) === Number(idProfissional);
      return (bloqueioGlobal(bloqueio) || pertenceAoProfissional)
        && sobrepoe(slotInicio, slotFim, bloqueio.horario_inicio, bloqueio.horario_fim);
    });
  };
  
  for (const m of candidatosMinutos) {
    if (m + duracaoMinutos > fimMinutos) {
      continue; // Não cabe dentro do horário de expediente
    }
    
    const passado = isHoje && m <= agoraMinutos;
    
    const slotInicioStr = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const slotFimMinutos = m + duracaoMinutos;
    const slotFimStr = `${String(Math.floor(slotFimMinutos / 60)).padStart(2, '0')}:${String(slotFimMinutos % 60).padStart(2, '0')}`;

    if (
      intervaloInicio &&
      intervaloFim &&
      sobrepoe(slotInicioStr, slotFimStr, intervaloInicio, intervaloFim)
    ) {
      slotsLivres.push({ hora: slotInicioStr, disponivel: false, passado });
      continue;
    }
    
    // 3. Verificar conflito
    if (temProfissionalEspecifico) {
      // Para um profissional específico, o horário está livre se não houver intersecção com nenhum de seus agendamentos ocupados
      let conflito = false;
      for (const o of ocupados) {
        const oFim = o.horario_fim || adicionarMinutos(o.horario, 30);
        if (slotInicioStr < oFim && slotFimStr > o.horario) {
          conflito = true;
          break;
        }
      }
      const bloqueado = profissionalBloqueado(
        profissionalId,
        slotInicioStr,
        slotFimStr
      );
      slotsLivres.push({
        hora: slotInicioStr,
        disponivel: !passado && !conflito && !bloqueado,
        passado
      });
    } else {
      // Se for "Sem preferência" (Qualquer):
      // O horário está livre se houver pelo menos UM profissional ativo livre.
      // Se o salão não tiver nenhum profissional ativo cadastrado ainda, fazemos a checagem global contra todos os agendamentos ocupados.
      if (profissionais.length === 0) {
        let conflitoGlobal = false;
        for (const o of ocupados) {
          const oFim = o.horario_fim || adicionarMinutos(o.horario, 30);
          if (slotInicioStr < oFim && slotFimStr > o.horario) {
            conflitoGlobal = true;
            break;
          }
        }
        const bloqueadoGlobal = bloqueios.some((bloqueio) => {
          return bloqueioGlobal(bloqueio)
            && sobrepoe(
              slotInicioStr,
              slotFimStr,
              bloqueio.horario_inicio,
              bloqueio.horario_fim
            );
        });
        slotsLivres.push({
          hora: slotInicioStr,
          disponivel: !passado && !conflitoGlobal && !bloqueadoGlobal,
          passado
        });
      } else {
        // Se houver profissionais cadastrados, verificamos cada um individualmente.
        // O slot de tempo está disponível se pelo menos um profissional estiver livre durante todo o intervalo [slotInicioStr, slotFimStr].
        let peloMenosUmLivre = false;
        
        for (const prof of profissionais) {
          let profOcupado = false;
          
          for (const o of ocupados) {
            // Verifica se este agendamento ocupado pertence a este profissional
            const ehDesteProf = Number(o.profissionalId) === Number(prof.id) || o.profissional === prof.nome;
            if (!ehDesteProf) continue;
            
            const oFim = o.horario_fim || adicionarMinutos(o.horario, 30);
            if (slotInicioStr < oFim && slotFimStr > o.horario) {
              profOcupado = true;
              break;
            }
          }

          if (profissionalBloqueado(prof.id, slotInicioStr, slotFimStr)) {
            profOcupado = true;
          }
          
          if (!profOcupado) {
            peloMenosUmLivre = true;
            break; // Achou um profissional livre!
          }
        }
        
        slotsLivres.push({
          hora: slotInicioStr,
          disponivel: !passado && peloMenosUmLivre,
          passado
        });
      }
    }
  }
  
  return slotsLivres;
}

async function listarProfissionais(estabelecimentoId) {
  return estabelecimentosDAO.listarProfissionaisPorEstabelecimento(estabelecimentoId);
}

module.exports = {
  listarEstabelecimentosComFiltro,
  buscarEstabelecimentoPorId,
  buscarServicosSelecionados,
  calcularHorariosDisponiveis,
  listarProfissionais
};
