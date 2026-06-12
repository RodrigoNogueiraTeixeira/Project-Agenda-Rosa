// Importa o Data Access Object (DAO) para realizar consultas SQL na tabela de estabelecimentos.
const estabelecimentosDAO = require("../dao/estabelecimentosDAO");
// Importa utilitários de texto:
// - normalizarTexto: remove acentos, cedilhas e deixa a string em caixa baixa (ex: "São José" vira "sao jose").
// - obterSinonimosTipo: retorna lista de sinônimos/equivalências de categorias de serviço para aprimorar as buscas.
const { normalizarTexto, obterSinonimosTipo } = require("../../utils/texto");

// Função Utilitária Interna (Helper): adicionarMinutos
// Objetivo: Soma uma quantidade de minutos a um horário no formato "HH:MM" e retorna o novo horário formatado.
// Parâmetros:
// - horarioStr: string contendo o horário inicial (ex: "14:30").
// - minutos: número inteiro de minutos a serem somados (ex: 45).
function adicionarMinutos(horarioStr, minutos) {
  // Verificação de segurança: se o formato não contiver os dois pontos (:), aborta e retorna o próprio valor original.
  if (!horarioStr || !horarioStr.includes(":")) return horarioStr;
  
  // Divide a string "HH:MM" em horas e minutos numéricos usando .split() e convertendo para Number.
  const [h, m] = horarioStr.split(":").map(Number);
  
  // Converte o horário total para minutos absolutos e soma os minutos adicionais.
  let totalMinutos = h * 60 + m + minutos;
  
  // Calcula a nova hora dividindo por 60 e arredondando para baixo (Math.floor).
  const novosH = Math.floor(totalMinutos / 60);
  // O resto da divisão corresponde aos minutos restantes.
  const novosM = totalMinutos % 60;
  
  // Retorna a hora e minuto formatados com 2 dígitos, preenchendo com zeros à esquerda (ex: "09:05").
  return `${String(novosH).padStart(2, '0')}:${String(novosM).padStart(2, '0')}`;
}

// Função Utilitária Interna (Helper): agruparPorEstabelecimento
// Objetivo: Agrupa uma lista plana de linhas de banco de dados (como serviços ou tipos) em um Map indexado pelo ID do estabelecimento.
// Parâmetros:
// - rows: array de objetos/linhas vindos do banco de dados SQLite.
// - campoId: o nome da coluna que identifica o ID do estabelecimento (ex: "estabelecimento_id").
function agruparPorEstabelecimento(rows, campoId) {
  // Cria uma nova instância de Map (dicionário chave-valor altamente performático).
  const mapa = new Map();

  for (const row of rows) {
    // Extrai o ID do estabelecimento convertendo-o para número seguro.
    const id = Number(row[campoId]);
    
    // Se o Map ainda não possui uma entrada para esse estabelecimento ID, inicializa uma lista vazia.
    if (!mapa.has(id)) {
      mapa.set(id, []);
    }
    
    // Adiciona o registro atual na lista correspondente ao ID do estabelecimento.
    mapa.get(id).push(row);
  }

  // Retorna o Map populado. Exemplo de estrutura: Map { 1 => [row1, row2], 2 => [row3] }
  return mapa;
}

// Função Principal de Listagem: listarEstabelecimentosComFiltro
// Objetivo: Busca estabelecimentos no banco, aplica filtros avançados (cidade, bairro, tipo, texto de busca),
// faz a paginação lógica e estrutura os objetos no formato final que o frontend do cliente necessita.
// Parâmetros recebidos (desestruturados de um único objeto):
// - cidade, bairro, tipo, busca (filtros enviados pelo usuário).
// - page (página solicitada, padrão 1).
// - limit (quantidade de itens por página, padrão 6).
async function listarEstabelecimentosComFiltro({ cidade, bairro, tipo, busca, page, limit }) {
  // 1. Normalização e Fallback dos parâmetros de Paginação:
  const pagina = Number(page) > 0 ? Number(page) : 1;
  const limite = Number(limit) > 0 ? Number(limit) : 6;

  // 2. Normalização Textual dos Filtros para busca insensível a acentos/maiúsculas:
  const cidadeNormalizada = normalizarTexto(cidade);
  const bairroNormalizado = normalizarTexto(bairro);
  const buscaNormalizada = normalizarTexto(busca);
  const tipoNormalizado = normalizarTexto(tipo);

  // 3. Obtenção de Sinônimos para a Categoria de Serviço:
  // Se o usuário filtrou por "Salão", o helper retorna tipos semelhantes como ["salao", "cabeleireiro", "estetica"].
  const tipos = tipoNormalizado ? obterSinonimosTipo(tipoNormalizado) : [];

  // 4. Consulta Inicial ao Banco via DAO (Filtro por Categoria):
  // Busca todas as lojas no banco de dados que possuem os tipos de serviços fornecidos.
  const base = await estabelecimentosDAO.listarComFiltros({ tipos });
  const todos = Array.isArray(base.estabelecimentos) ? base.estabelecimentos : [];

  // 5. Filtragem em Memória (Cidade, Bairro e Nome da Loja):
  // Compara os termos normalizados com as propriedades normalizadas de cada loja.
  const filtrados = todos.filter((item) => {
    const cidadeItem = normalizarTexto(item.cidade);
    const bairroItem = normalizarTexto(item.bairro);
    const nomeItem = normalizarTexto(item.nome);

    // Avalia as condições: se o filtro não foi informado, passa automático (true).
    // Se informado, verifica se o valor da loja inclui o termo pesquisado.
    const atendeCidade = !cidadeNormalizada || (cidadeItem && (cidadeItem.includes(cidadeNormalizada) || cidadeNormalizada.includes(cidadeItem)));
    const atendeBairro = !bairroNormalizado || (bairroItem && (bairroItem.includes(bairroNormalizado) || bairroNormalizado.includes(bairroItem)));
    const atendeBusca = !buscaNormalizada || (nomeItem && (nomeItem.includes(buscaNormalizada) || buscaNormalizada.includes(nomeItem)));

    // Retorna true somente se atender simultaneamente a todos os filtros ativos.
    return atendeCidade && atendeBairro && atendeBusca;
  });

  // 6. Paginação em Memória (Fatiamento):
  // Calcula o índice inicial (offset) com base na página atual.
  // Ex: página 2 com limite 6 -> offset = (2-1)*6 = 6. Pega a partir do 6º elemento.
  const offset = (pagina - 1) * limite;
  // Extrai apenas a fatia correspondente à página atual.
  const paginados = filtrados.slice(offset, offset + limite);
  
  // Extrai um array contendo apenas os IDs numéricos dos estabelecimentos da página atual.
  const ids = paginados.map((item) => Number(item.id));

  // 7. Busca Relacionada de Tipos e Serviços:
  // Para evitar fazer uma consulta SQL para cada loja (problema de performance N+1),
  // fazemos apenas duas consultas em lote (batch queries) passando os IDs das lojas da página atual.
  const tiposRows = await estabelecimentosDAO.listarTiposPorEstabelecimentos(ids);
  const servicosRows = await estabelecimentosDAO.listarServicosPorEstabelecimentos(ids);

  // 8. Agrupamento em Mapas para Acesso Rápido:
  const tiposMap = agruparPorEstabelecimento(tiposRows, "estabelecimento_id");
  const servicosMap = agruparPorEstabelecimento(servicosRows, "estabelecimento_id");

  // 9. Construção do Objeto Final Mapeado:
  const itens = paginados.map((estabelecimento) => {
    const id = Number(estabelecimento.id);
    
    // Resgata os tipos/categorias e os serviços da loja atual a partir dos Mapas de cache criados acima.
    const tiposDoEstabelecimento = (tiposMap.get(id) || []).map((row) => row.tipo);
    const servicosDoEstabelecimento = (servicosMap.get(id) || []).map((row) => ({
      id: row.id,
      nome: row.nome,
      preco: Number(row.preco || 0),
      duracao_minutos: Number(row.duracao_minutos || 30),
      categoria: row.categoria || ""
    }));

    // Retorna o objeto com a estrutura limpa e tratada esperada pelo frontend.
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

  // 10. Retorno Estruturado de Paginação:
  return {
    pagina,
    limite,
    total: filtrados.length, // total absoluto de itens após filtragem.
    totalPaginas: Math.max(1, Math.ceil(filtrados.length / limite)), // número máximo de páginas geradas.
    estabelecimentos: itens // a lista final de estabelecimentos processados.
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

  if (configuracao?.empresa_id && configuracao.abre === 0) {
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
  // 2. Reunir candidatos a horários de início:
  // Para evitar testar cada minuto do dia (o que seria extremamente lento), nós geramos um conjunto de horários candidatos.
  // Usamos um 'Set' (conjunto de valores únicos) para evitar que o mesmo minuto de início seja inserido mais de uma vez.
  const candidatosMinutosSet = new Set();
  
  // Primeiro, inserimos no Set os horários de início padrão gerados a cada 30 minutos (definido por 'stepMinutos').
  // O loop começa nos minutos de abertura e vai até os minutos de fechamento.
  for (let m = inicioMinutos; m <= fimMinutos; m += stepMinutos) {
    candidatosMinutosSet.add(m);
  }
  
  // Para cada agendamento ocupado cadastrado nesse dia, também adicionamos seu horário de término como um candidato.
  // Isso é importante porque se um profissional termina um serviço às 14:15, o horário das 14:15 torna-se livre
  // e elegível para iniciar um novo agendamento, mesmo que não seja um múltiplo exato de 30 minutos.
  for (const o of ocupados) {
    if (o.horario && o.horario.includes(":")) {
      const [hI, mI] = o.horario.split(":").map(Number);
      const minutosInicio = hI * 60 + mI;
      // Garante que o horário do compromisso está dentro da faixa de funcionamento do salão.
      if (minutosInicio >= inicioMinutos && minutosInicio <= fimMinutos) {
        candidatosMinutosSet.add(minutosInicio);
      }
    }
    // Determina o horário de término do agendamento (usa 'horario_fim' ou assume duração de 30 min como fallback).
    const oFim = o.horario_fim || adicionarMinutos(o.horario, 30);
    if (oFim && oFim.includes(":")) {
      const [hF, mF] = oFim.split(":").map(Number);
      const minutosFim = hF * 60 + mF;
      // Garante que o horário de término do agendamento está dentro do expediente do estabelecimento.
      if (minutosFim >= inicioMinutos && minutosFim <= fimMinutos) {
        candidatosMinutosSet.add(minutosFim);
      }
    }
  }
  
  // Converte o Set (com valores únicos e sem duplicados) em um array regular do JS e o ordena numericamente de forma crescente.
  const candidatosMinutos = Array.from(candidatosMinutosSet).sort((a, b) => a - b);
  
  const slotsLivres = [];
  
  // Captura os objetos de data atual e data selecionada para fazer validações contra agendamentos no passado.
  const dataHoje = new Date();
  const dataSelecionadaObj = new Date(`${data}T00:00:00`);
  
  // Compara se o dia selecionado é hoje.
  const isHoje = dataHoje.toDateString() === dataSelecionadaObj.toDateString();
  // Converte a hora atual do sistema em minutos absolutos (ex: 10:15 da manhã vira 615 minutos).
  const agoraMinutos = dataHoje.getHours() * 60 + dataHoje.getMinutes();

  // Função utilitária interna para checar se dois intervalos de tempo possuem sobreposição/conflito.
  // Retorna true se houver qualquer intersecção (colisão) entre o intervalo A e o intervalo B.
  const sobrepoe = (inicioA, fimA, inicioB, fimB) => {
    return inicioA < fimB && fimA > inicioB;
  };

  // Função utilitária interna para verificar se um bloqueio da agenda é global (se aplica a todos, não apenas a um profissional específico).
  const bloqueioGlobal = (bloqueio) => {
    return !bloqueio.profissional_id && !bloqueio.profissional_nome;
  };

  // Função utilitária interna para verificar se um profissional específico está bloqueado (de férias, atestado, folga, etc.) no slot de tempo verificado.
  const profissionalBloqueado = (idProfissional, slotInicio, slotFim) => {
    return bloqueios.some((bloqueio) => {
      const pertenceAoProfissional = Number(bloqueio.profissional_id) === Number(idProfissional);
      // O profissional está indisponível se houver um bloqueio global da empresa OU um bloqueio específico dele
      // que se sobreponha ao horário do slot analisado.
      return (bloqueioGlobal(bloqueio) || pertenceAoProfissional)
        && sobrepoe(slotInicio, slotFim, bloqueio.horario_inicio, bloqueio.horario_fim);
    });
  };
  
  // 3. Validação de cada Horário Candidato:
  for (const m of candidatosMinutos) {
    // Se o horário candidato somado com a duração do serviço exceder o horário de encerramento do estabelecimento, ignora.
    if (m + duracaoMinutos > fimMinutos) {
      continue;
    }
    
    // Verifica se o horário candidato está no passado (caso o agendamento esteja sendo feito para o dia de hoje).
    const passado = isHoje && m <= agoraMinutos;
    
    // Formata o minuto absoluto de início de volta para a string textual "HH:MM".
    const slotInicioStr = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const slotFimMinutos = m + duracaoMinutos;
    // Formata o minuto absoluto de término do slot para a string textual "HH:MM".
    const slotFimStr = `${String(Math.floor(slotFimMinutos / 60)).padStart(2, '0')}:${String(slotFimMinutos % 60).padStart(2, '0')}`;

    // Validação de intervalo de descanso/almoço da loja:
    // Se o estabelecimento possui horário de intervalo e o slot de agendamento colidir com ele, 
    // adiciona o slot na lista marcado como indisponível e pula para o próximo candidato.
    if (
      intervaloInicio &&
      intervaloFim &&
      sobrepoe(slotInicioStr, slotFimStr, intervaloInicio, intervaloFim)
    ) {
      slotsLivres.push({ hora: slotInicioStr, disponivel: false, passado });
      continue;
    }
    
    // 4. Verificação de Conflitos de Agendamentos e Bloqueios:
    if (temProfissionalEspecifico) {
      // Caso o cliente tenha escolhido um profissional específico:
      // O slot estará disponível apenas se não houver conflito com nenhum agendamento daquele profissional
      // e o profissional não possuir bloqueios ativos no horário.
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
      // Caso o cliente selecione "Sem preferência de profissional" (Qualquer Profissional):
      // O slot estará disponível se pelo menos UM profissional ativo da loja estiver livre durante todo o intervalo do serviço.
      if (profissionais.length === 0) {
        // Fallback: se a loja não tiver nenhum profissional ativo cadastrado no sistema,
        // fazemos a validação de conflito contra a lista global de agendamentos ocupados da loja.
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
        // Se a loja tem profissionais, rodamos a lógica de verificação individual por profissional.
        let peloMenosUmLivre = false;
        
        for (const prof of profissionais) {
          let profOcupado = false;
          
          for (const o of ocupados) {
            // Verifica se esse compromisso ocupado pertence a este profissional específico do laço.
            const ehDesteProf = Number(o.profissionalId) === Number(prof.id) || o.profissional === prof.nome;
            if (!ehDesteProf) continue;
            
            const oFim = o.horario_fim || adicionarMinutos(o.horario, 30);
            if (slotInicioStr < oFim && slotFimStr > o.horario) {
              profOcupado = true;
              break;
            }
          }

          // Checa se o profissional possui bloqueios para este horário analisado.
          if (profissionalBloqueado(prof.id, slotInicioStr, slotFimStr)) {
            profOcupado = true;
          }
          
          // Se esse profissional não estiver ocupado nem bloqueado, consideramos que o slot é válido (pelo menos um profissional está livre).
          if (!profOcupado) {
            peloMenosUmLivre = true;
            break; // Interrompe a verificação do time de profissionais, pois já localizou um profissional livre.
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
  
  // Retorna a coleção contendo todos os slots analisados com status (disponível, passado, etc.) para renderização no front.
  return slotsLivres;
}

// Busca e lista todos os profissionais associados a um determinado estabelecimento que podem executar os serviços desejados.
async function listarProfissionais(estabelecimentoId, servicosIds) {
  return estabelecimentosDAO.listarProfissionaisPorEstabelecimento(estabelecimentoId, servicosIds);
}

module.exports = {
  listarEstabelecimentosComFiltro,
  buscarEstabelecimentoPorId,
  buscarServicosSelecionados,
  calcularHorariosDisponiveis,
  listarProfissionais
};
