const agendamentosDAO = require("../dao/agendamentosDAO");
const clientesDAO = require("../dao/clientesDAO");
const estabelecimentosRepository = require("./estabelecimentosRepository");
const pagamentosDAO = require("../dao/pagamentosDAO");
const pagamentosRepository = require("./pagamentosRepository");
// normalizarTexto: Função utilitária que tira acentos e deixa tudo minúsculo (ex: "UNHÁS" vira "unhas")
const { normalizarTexto } = require("../../utils/texto");

/**
 * FUNÇÃO: profissionalAtendeCategoria
 * O QUE FAZ: Verifica se a profissional tem a habilidade para fazer o serviço que a cliente pediu.
 * Exemplo: Uma cabeleireira não pode fazer serviço de Manicure.
 */
function profissionalAtendeCategoria(especialidade, categoria) {
  // Se a profissional não tem especialidade definida no banco, assumimos que ela faz de tudo (return true)
  if (!especialidade) return true;
  // Se o serviço não tem categoria definida, qualquer um pode fazer
  if (!categoria) return true;

  // Usa nossa função avançada para tirar acentos e letras maiúsculas para comparar de forma justa
  const espNorm = normalizarTexto(especialidade);
  const catNorm = normalizarTexto(categoria);

  // Se for exatamente a mesma palavra (ex: "estetica" === "estetica"), ela atende!
  if (espNorm === catNorm) return true;
  
  // '.includes': Função do Javascript que verifica se um texto está DENTRO do outro.
  // Ex: "estetica facial".includes("estetica") -> verdadeiro!
  if (espNorm.includes(catNorm) || catNorm.includes(espNorm)) return true;

  // Dicionário de Sinônimos: Uma sacada genial para o sistema ser inteligente.
  // Se o banco diz que ela é "manicure", o sistema sabe que ela também faz "unha" e "pedicure".
  const sinonimos = {
    "unha": ["manicure", "pedicure", "unhas"],
    "unhas": ["manicure", "pedicure", "unha"],
    "manicure": ["unha", "unhas", "pedicure"],
    "pedicure": ["unha", "unhas", "manicure"],
    "estetica": ["estetica facial", "estetica corporal", "estetica feminino"],
    "estetica facial": ["estetica", "estetica feminino"],
    "estetica corporal": ["estetica", "estetica feminino"],
    "estetica feminino": ["estetica", "estetica facial", "estetica corporal"],
    "cabelo": ["cabeleireiro", "cabeleireira", "corte"],
    "cabeleireiro": ["cabelo", "corte"],
    "cabeleireira": ["cabelo", "corte"]
  };

  // Verifica se a categoria do serviço está na lista de sinônimos da especialidade da profissional
  const listaEsp = sinonimos[espNorm] || [];
  if (listaEsp.includes(catNorm)) return true;

  // Faz o caminho inverso: verifica se a especialidade da profissional está na lista de sinônimos do serviço
  const listaCat = sinonimos[catNorm] || [];
  if (listaCat.includes(espNorm)) return true;

  // Se tentou de tudo e não deu "match", significa que a profissional não sabe fazer esse serviço.
  return false;
}

/**
 * FUNÇÃO: adicionarMinutos
 * O QUE FAZ: Pega uma hora (ex: "10:30") e soma minutos (ex: 45) e devolve a hora final calculada ("11:15").
 */
function adicionarMinutos(horarioStr, minutos) {
  // Segurança: se não mandarem um horário válido com dois pontos ":", devolve o próprio texto para não quebrar.
  if (!horarioStr || !horarioStr.includes(":")) return horarioStr;
  
  // '.split(":")': Corta o texto "10:30" no meio dos dois pontos, virando ["10", "30"].
  // '.map(Number)': Converte os textos cortados para números matemáticos puros (10 e 30).
  // 'const [h, m]': Desestruturação que guarda o 10 na variável 'h' (hora) e o 30 na 'm' (minutos).
  const [h, m] = horarioStr.split(":").map(Number);
  
  // Converte a hora inteira para minutos totais desde a meia noite e soma a duração do serviço
  let totalMinutos = h * 60 + m + minutos;
  
  // 'Math.floor': Arredonda pra baixo. Ex: 11.5 vira 11 horas inteiras.
  const novosH = Math.floor(totalMinutos / 60);
  // '% 60' (Módulo): Pega o resto da divisão. O que sobrou da divisão das horas são os minutos finais.
  const novosM = totalMinutos % 60;
  
  // 'String().padStart(2, "0")': Garante que sempre terá 2 dígitos. 
  // Ex: 9 horas vira "09". 5 minutos vira "05". E junta com o ':' no meio.
  return `${String(novosH).padStart(2, '0')}:${String(novosM).padStart(2, '0')}`;
}

/**
 * FUNÇÃO: validarDataAgendamento
 * O QUE FAZ: Verifica se a cliente não está tentando marcar horário num dia impossível (passado, muito longe ou dia falso).
 */
function validarDataAgendamento(dataTexto) {
  // '.trim()': Remove espaços em branco que a cliente possa ter digitado sem querer no começo ou fim.
  const data = String(dataTexto || "").trim();
  
  // Expressão Regular (Regex): Uma linguagem de códigos que checa se o texto tem o formato EXATO de "Ano-Mês-Dia" (ex: 2024-12-30).
  // '\d{4}' = 4 números (Ano), '\d{2}' = 2 números (Mês e Dia).
  const validaFormato = /^\d{4}-\d{2}-\d{2}$/.test(data);
  if (!validaFormato) {
    throw new Error("Data do agendamento invalida.");
  }

  // 'new Date()': Tenta criar um calendário na memória do Javascript com aquela data.
  const dataAgendada = new Date(`${data}T00:00:00`);
  
  // 'Number.isNaN': Verifica se a data gerou um erro matemático (Not-A-Number). Ex: 32 de Fevereiro geraria esse erro.
  if (Number.isNaN(dataAgendada.getTime())) {
    throw new Error("Data do agendamento invalida.");
  }

  // Cria um calendário com a data/hora exata de HOJE e zera as horas para comparar apenas os dias (meia-noite)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Define um limite máximo de agendamento de 2 meses para frente para a agenda não virar bagunça.
  const limiteFuturo = new Date(hoje);
  limiteFuturo.setMonth(limiteFuturo.getMonth() + 2);

  // Comparações de datas: no Javascript você pode usar > ou < para saber se uma data é antes da outra!
  if (dataAgendada < hoje) {
    throw new Error("Nao e permitido agendar no passado.");
  }

  if (dataAgendada > limiteFuturo) {
    throw new Error("O agendamento pode ser no maximo ate 2 meses a partir de hoje.");
  }
}

/**
 * FUNÇÃO PRINCIPAL: criarAgendamento
 * O QUE FAZ: Cria um novo agendamento, mas antes roda TODAS as validações de negócio possíveis.
 */
async function criarAgendamento(payload) {
  // Pega o ID do cliente e força a virar um Número. Se não mandou, usa 1 por segurança.
  const clienteId = Number(payload.clienteId || 1);
  
  // Força o ID do salão a virar Número. Se vier texto, vira um erro (NaN).
  const estabelecimentoId = Number(payload.estabelecimentoId);
  
  // Pega a data, força virar Texto (String) e usa o '.trim()' para cortar espaços em branco.
  const data = String(payload.data || "").trim();
  
  // Pega o horário, força virar Texto (String) e corta espaços em branco.
  const horario = String(payload.horario || "").trim();
  
  // Pega o ID da profissional. Se a cliente não escolheu, deixa como vazio (null).
  const profissionalId = payload.profissionalId || null;
  
  // Pega as observações, transforma em texto e corta espaços em branco.
  const observacoes = String(payload.observacoes || "").trim();

  // '.isArray()': Confirma se o que veio foi realmente uma Lista de serviços.
  const ids = Array.isArray(payload.servicosIds)
    // Se for lista, o '.map()' transforma todos em Número e o '.filter()' joga fora os inválidos (ex: letras).
    ? payload.servicosIds.map((item) => Number(item)).filter((item) => Number.isFinite(item))
    // Se NÃO for lista, cria uma lista vazia por segurança.
    : [];

  // Confere se ID do cliente não é número, OU estabelecimento não é número, OU data vazia, OU horário vazio.
  if (!Number.isFinite(clienteId) || !Number.isFinite(estabelecimentoId) || !data || !horario) {
    // Se qualquer um faltar, grita o Erro e para tudo aqui!
    throw new Error("Campos obrigatorios invalidos.");
  }

  // Chama a função externa para validar se a data não é absurda (ex: agendar pra 2028).
  validarDataAgendamento(data);

  // Cria um calendário na memória com a data e hora de AGORA.
  const dataHoje = new Date();
  
  // Cria um calendário com a data escolhida pelo cliente, cravada na meia-noite (00:00:00).
  const dataSelecionadaObj = new Date(`${data}T00:00:00`);
  
  // Compara as duas datas curtas. Se for a mesma data, guarda Verdadeiro na variável 'isHoje'.
  const isHoje = dataHoje.toDateString() === dataSelecionadaObj.toDateString();
  
  // Pergunta: "O agendamento é para hoje?"
  if (isHoje) {
    // Corta o horário escolhido (ex:"14:30") no ":", e guarda 14 no 'h' e 30 no 'm' como números.
    const [h, m] = horario.split(":").map(Number);
    
    // Multiplica as horas por 60 e soma com os minutos para achar os Minutos Totais escolhidos.
    const mSelecionado = h * 60 + m;
    
    // Pega a exata hora de AGORA no servidor e também transforma em Minutos Totais.
    const mAgora = dataHoje.getHours() * 60 + dataHoje.getMinutes();
    
    // Pergunta: "Os minutos escolhidos já passaram dos minutos que estamos agora?"
    if (mSelecionado <= mAgora) {
      // Se sim, bloqueia! A cliente está tentando agendar para o passado no dia de hoje.
      throw new Error("Esse horario ja passou. Por favor, escolha um horario futuro.");
    }
  }
  
  // --- VALIDAÇÕES BÁSICAS DE BANCO DE DADOS ---
  
  // Pede para o Arquivista (DAO) buscar o cliente pelo ID para provar que ele existe.
  const cliente = await clientesDAO.buscarPorId(clienteId);
  
  // Se o DAO retornar vazio (falso), bloqueia o agendamento!
  if (!cliente) {
    throw new Error("Cliente nao encontrado.");
  }

  // Pede para o banco buscar o Salão pelo ID.
  const estabelecimento = await estabelecimentosRepository.buscarEstabelecimentoPorId(estabelecimentoId);
  
  // Se o Salão não existir, bloqueia.
  if (!estabelecimento) {
    throw new Error("Estabelecimento nao encontrado.");
  }

  // --- VALIDAÇÃO DE SERVIÇOS E PREÇOS ---
  
  // Busca no banco todos os serviços que a cliente selecionou para ter certeza que eles existem naquele salão (evita fraude).
  const servicosSelecionados = await estabelecimentosRepository.buscarServicosSelecionados(estabelecimentoId, ids);
  
  // Se a lista de serviços confirmados voltar vazia, significa que a cliente tentou burlar o sistema ou não escolheu nada.
  if (servicosSelecionados.length === 0) {
    throw new Error("Selecione pelo menos um servico valido.");
  }

  // '.reduce()': Função super avançada que funciona como uma "Máquina de Somar".
  // Ela varre a lista de serviços. A variável 'soma' começa em 0.
  // A cada passo, ela adiciona o preço do serviço atual na 'soma'. No final, temos o Preço Total do carrinho!
  const total = servicosSelecionados.reduce((soma, item) => soma + Number(item.preco || 0), 0);
  
  // Faz o mesmo '.reduce()' mágico, mas dessa vez para somar quantos MINUTOS o atendimento vai demorar no total.
  // Se o serviço não tiver duração no banco, ele assume 30 minutos por padrão de segurança (|| 30).
  const duracaoTotalMinutos = servicosSelecionados.reduce((soma, item) => soma + Number(item.duracao_minutos || 30), 0);

  // --- CÁLCULO DA HORA DE SAÍDA (HORÁRIO FIM) ---
  
  // Corta a hora que a cliente escolheu chegar (ex:"14:30") no ":". Guarda "14" na horaStr e "30" no minStr.
  const [horaStr, minStr] = horario.split(":");
  
  // Converte a string "14" para número puro matemático 14.
  let horaFimNum = Number(horaStr);
  
  // Converte os minutos ("30") pra número e SOMA com a duração de todos os serviços (ex: 30 + 90 = 120 minutos).
  let minFimNum = Number(minStr) + duracaoTotalMinutos;
  
  // 'Math.floor': Pega os 120 minutos, divide por 60 (dá 2) e soma nas horas. (A hora passa a ser 14 + 2 = 16h).
  horaFimNum += Math.floor(minFimNum / 60);
  
  // '% 60' (Módulo): Pega apenas o RESTO da divisão. (120 não tem resto, então minutos finais = 0).
  minFimNum = minFimNum % 60;
  
  // '.padStart(2, "0")': Garante que os números tenham 2 casas (ex: 16 vira "16", 0 vira "00").
  // Junta tudo com ":" e gera a hora exata que o cliente vai sair do salão (Ex: "16:00").
  const horarioFim = `${String(horaFimNum).padStart(2, '0')}:${String(minFimNum).padStart(2, '0')}`;

  // --- BUSCA E VALIDAÇÃO DE PROFISSIONAIS (O CORAÇÃO DO SISTEMA) ---
  
  // Importa a comunicação com a tabela de profissionais no banco de dados.
  const estabelecimentosDAO = require("../dao/estabelecimentosDAO");
  
  // '.map()': Pega a lista com as 'fichas' completas dos serviços que o banco nos deu antes, e recorta apenas os IDs puros.
  const servicosIdsValidos = servicosSelecionados.map((servico) => Number(servico.id));
  
  // Pergunta pro banco de dados: "Me dê a lista de TODOS os funcionários do salão que têm vínculo com os IDs destes serviços".
  const profissionais = await estabelecimentosDAO.listarProfissionaisPorEstabelecimento(
    estabelecimentoId,
    servicosIdsValidos
  );
  
  // Por padrão, se a cliente não escolher, a gente diz que foi "Sem preferência".
  let profissionalNome = "Sem preferência";
  
  // O ID interno do profissional (null significa 'qualquer um').
  let finalProfissionalId = null;

  // CÁLCULO 1: A cliente exigiu uma profissional específica pelo aplicativo? (Ex: Quero a Joana).
  if (profissionalId && profissionalId !== "qualquer" && profissionalId !== "") {
    
    // '.find()': Acha a 'agulha no palheiro'. Procura na lista de funcionários do banco exatamente aquela com o ID que a cliente mandou.
    const profRow = profissionais.find(
      (profissional) => Number(profissional.id) === Number(profissionalId)
    );

    // Se o funcionário realmente existir na lista do salão...
    if (profRow) {
      // Loop 'for...of': Pega CADA serviço que a cliente colocou no carrinho e testa contra as habilidades da profissional.
      for (const servico of servicosSelecionados) {
        // Se a especialidade dela NÃO bater com a categoria do serviço (Ex: Cabeleireira tentando fazer Maquiagem), bloqueia na hora!
        if (!profissionalAtendeCategoria(profRow.especialidade, servico.categoria)) {
          throw new Error(`O profissional ${profRow.nome} nao atende a categoria '${servico.categoria}' do servico '${servico.nome}'.`);
        }
      }
      
      // Se passou em todos os testes, "contratamos" ela oficialmente para esse agendamento.
      profissionalNome = profRow.nome;
      finalProfissionalId = Number(profissionalId);
    
    // Se a profissional não foi achada na lista, significa que ela não atende neste salão.
    } else {
      throw new Error("O profissional selecionado nao atende a todos os servicos escolhidos.");
    }
  
  // CÁLCULO 2: A cliente escolheu "Qualquer uma" e o salão tem funcionários disponíveis.
  } else if (profissionais.length > 0) {
    // Importa o 'get', que permite rodar um código SQL cru no banco de dados.
    const { get } = require("../../config/database");
    
    // Cria uma bandeira (Variável) dizendo: "Até agora, não achamos ninguém livre".
    let profissionalLivreEncontrado = false;

    // Inicia um Loop que vai "entrevistar" funcionária por funcionária da lista.
    for (const prof of profissionais) {
      
      // PASSO 1 DA ENTREVISTA: Ela sabe fazer todos os serviços do carrinho?
      // Assume que sim (true) a princípio.
      let atendeTodos = true;
      
      // Varre todos os serviços. Se em algum momento a resposta for "ela não sabe"...
      for (const servico of servicosSelecionados) {
        if (!profissionalAtendeCategoria(prof.especialidade, servico.categoria)) {
          // ...muda a bandeira para falso.
          atendeTodos = false;
          // 'break': Um comando de performance genial. Ao invés de testar o resto dos serviços, ele interrompe o loop. Ela está reprovada.
          break; 
        }
      }
      
      // 'continue': Se ela foi reprovada acima (!atendeTodos), pula o resto do código e vai entrevistar a próxima funcionária.
      if (!atendeTodos) continue; 

      // PASSO 2 DA ENTREVISTA: Ela tem a agenda livre nessa hora exata?
      // Essa é a busca (SELECT) super complexa no Banco de Dados (SQL).
      const conflitoProf = await get(
        `
          SELECT id
          FROM agendamentos
          WHERE estabelecimento_id = ?
            AND COALESCE(data, data_agendamento) = ?
            /* A cliente no banco só pode estar em status agendado, concluido, ou com um pagamento pendente trancando a vaga (15min) */
            AND (
              status IN ('agendado', 'confirmado', 'concluido', 'realizado')
              OR (status = 'pendente' AND criado_em::timestamptz >= NOW() - INTERVAL '15 minutes')
            )
            /* Verifica se a agenda é dessa profissional especifica */
            AND (
              profissional_id = ? 
              OR profissional = ?
            )
            /* A MAGIA DO TEMPO: O inicio_novo for ANTES do fim_antigo, E o fim_novo for DEPOIS do inicio_antigo = CONFLITO! */
            AND (
              (? < horario_fim AND ? > COALESCE(horario, horario_inicio))
              OR (horario_fim IS NULL AND COALESCE(horario, horario_inicio) = ?)
            )
          LIMIT 1
        `,
        [
          estabelecimentoId,
          data,
          prof.id,
          prof.nome,
          horario,
          horarioFim,
          horario
        ]
      );
      
      // Se não voltou conflito (ela está livre!), "contratamos" ela para o sistema.
      if (!conflitoProf) {
        profissionalNome = prof.nome;
        finalProfissionalId = prof.id;
        profissionalLivreEncontrado = true;
        // 'break': Já achamos a nossa funcionária, não precisamos mais entrevistar o resto do salão. Ganho de performance extremo!
        break;
      }
    }

    // Se o loop acabou e a bandeira continuar falsa (ninguém estava livre ou capacitado).
    if (!profissionalLivreEncontrado) {
      
      // '.some()': Pergunta rápida para a lista - "Existe ALGUMA profissional capaz de fazer o serviço?"
      // '.every()': "...capaz de fazer TODOS os serviços da lista?"
      const algumQualificado = profissionais.some(prof => 
        servicosSelecionados.every(servico => profissionalAtendeCategoria(prof.especialidade, servico.categoria))
      );
      
      // Se a resposta for não, o sistema explica que o salão não tem ninguém com aquele nível.
      if (!algumQualificado) {
        throw new Error("Nenhum profissional cadastrado atende a todas as categorias dos servicos selecionados.");
      // Se a resposta for sim (tem gente capacitada), mas o problema é que todas estavam atendendo outras clientes:
      } else {
        throw new Error("Nao ha profissional qualificado disponivel para este horario.");
      }
    }
  
  // Se o '.length' da lista voltar ZERO lá em cima, significa que o salão inteiro pediu demissão (brincadeira, não tem funcionários cadastrados pro serviço).
  } else {
    throw new Error("Nenhum profissional cadastrado atende a todos os servicos selecionados.");
  }

  // --- VALIDAÇÕES FINAIS E SALVAMENTO NO BANCO ---

  // 'new Date().getDay()': Descobre qual é o dia da semana da data escolhida (0 = Domingo, 1 = Segunda... 6 = Sábado).
  const diaSemana = new Date(`${data}T00:00:00`).getDay();
  
  // Pergunta pro banco: "Qual o horário de funcionamento deste salão para este dia da semana específico?"
  const horarioFuncionamento = await estabelecimentosDAO.buscarHorarioFuncionamento(
    estabelecimentoId,
    diaSemana
  );

  // Se o salão tiver regras de horário cadastradas...
  if (horarioFuncionamento?.empresa_id) {
    // 'abre === 0' significa que o salão fecha naquele dia (ex: Domingo).
    if (horarioFuncionamento.abre === 0) {
      throw new Error("O estabelecimento nao abre nesta data.");
    }

    // Pega a hora que abre e fecha. Se não tiver no banco, assume 09:00 as 19:00 por padrão.
    const abertura = horarioFuncionamento.horario_abertura || "09:00";
    const fechamento = horarioFuncionamento.horario_fechamento || "19:00";

    // Regra: A cliente não pode agendar pra chegar ANTES de abrir, e o serviço não pode TERMINAR DEPOIS de fechar.
    if (horario < abertura || horarioFim > fechamento) {
      throw new Error("O horario escolhido esta fora do funcionamento do estabelecimento.");
    }

    // Regra do Almoço: Se o salão tem horário de intervalo...
    if (
      horarioFuncionamento.intervalo_inicio &&
      horarioFuncionamento.intervalo_fim &&
      // ...verifica se o horário da cliente bate (intersecta) com o horário de almoço.
      horario < horarioFuncionamento.intervalo_fim &&
      horarioFim > horarioFuncionamento.intervalo_inicio
    ) {
      throw new Error("O horario escolhido coincide com o intervalo do estabelecimento.");
    }
  }

  // Busca se o dono do salão criou um "Bloqueio Manual" na agenda (ex: Feriado, ou a profissional foi ao médico).
  const bloqueios = await estabelecimentosDAO.listarBloqueiosPorData(
    estabelecimentoId,
    data
  );
  
  // '.some()': Varre a lista de bloqueios. Retorna VERDADEIRO se achar um bloqueio que atrapalhe o horário.
  const horarioBloqueado = bloqueios.some((bloqueio) => {
    // É um feriado do salão inteiro?
    const bloqueioGlobal = !bloqueio.profissional_id && !bloqueio.profissional_nome;
    // Ou é uma folga específica da funcionária que escolhemos?
    const bloqueioDoProfissional = finalProfissionalId &&
      Number(bloqueio.profissional_id) === Number(finalProfissionalId);

    // Se for bloqueio Global ou Dela E bater com o nosso horário: BINGO, tá bloqueado!
    return (bloqueioGlobal || bloqueioDoProfissional)
      && horario < bloqueio.horario_fim
      && horarioFim > bloqueio.horario_inicio;
  });

  // Se '.some()' retornou verdadeiro, bloqueia e avisa o cliente.
  if (horarioBloqueado) {
    throw new Error("O horario escolhido esta bloqueado para o profissional.");
  }

  // BUSCA FINAL DE SEGURANÇA: Pede pro banco listar TODOS os horários ocupados naquele dia.
  const ocupados = await agendamentosDAO.listarHorariosOcupados(estabelecimentoId, data, finalProfissionalId);
  
  // Bandeira de conflito começa falsa.
  let temConflito = false;
  
  // Varre a lista de clientes que já estão na agenda...
  for (const o of ocupados) {
    // Se algum agendamento antigo estiver sem horário de fim, joga 30 min pra frente por segurança.
    const oFim = o.horario_fim || adicionarMinutos(o.horario, 30);
    // Lógica mágica de intersecção: Meu começo é ANTES do seu fim E meu fim é DEPOIS do seu começo? Dois corpos ocupando o mesmo espaço!
    if (horario < oFim && horarioFim > o.horario) {
      temConflito = true;
      break;
    }
  }

  // Se deu conflito de última hora, encerra!
  if (temConflito) {
    throw new Error("Esse horario ja esta ocupado para o profissional selecionado ou a agenda esta lotada.");
  }

  // --- PREPARAÇÃO DOS DADOS PARA O BANCO (DAO) ---

  // Puxa a função 'get' crua de novo.
  const { get } = require("../../config/database");
  
  // Descobre quem é o dono ("Empresa") desse Salão.
  const estabelecimentoEmpresa = await get(
    "SELECT empresa_id FROM estabelecimentos WHERE id = ?",
    [estabelecimentoId]
  );
  let empresaId = estabelecimentoEmpresa
    ? estabelecimentoEmpresa.empresa_id
    : null;

  // Se o salão não tem dono definido, tenta achar o dono através do serviço cadastrado (legado de código antigo).
  if (!empresaId) {
    const servicoEmpresa = await get(
      `SELECT empresa_id
      FROM servicos
      WHERE estabelecimento_id = ?
        AND empresa_id IS NOT NULL
      LIMIT 1`,
      [estabelecimentoId]
    );
    empresaId = servicoEmpresa ? servicoEmpresa.empresa_id : null;
  }

  // Pega o ID principal do serviço escolhido (o primeiro da lista).
  const servicoId = servicosSelecionados.length > 0 ? servicosSelecionados[0].id : null;

  // Guarda o total matematicamente puro.
  const totalCalculado = total;

  // Ufa! O "Auditor" aprovou tudo. Agora ele chama o Arquivista (DAO) e grita: "PODE SALVAR OFICIALMENTE!"
  // Passa um "objeto gigante" com tudo que calculamos até agora.
  const agendamentoId = await agendamentosDAO.criarAgendamento({
    clienteId,
    estabelecimentoId,
    estabelecimentoNome: estabelecimento.nome,
    data,
    horario,
    profissional: profissionalNome,
    observacoes,
    total: totalCalculado,
    horarioFim,
    servicos: servicosSelecionados,
    // Novos campos de compatibilidade com o painel da empresa:
    empresaId,
    servicoId,
    profissionalId: finalProfissionalId,
    nomeCliente: cliente.nome,
    telefoneCliente: cliente.telefone,
    emailCliente: cliente.email,
    dataAgendamento: data,
    horarioInicio: horario
  });

  // Por fim, gera um recibo (JSON) com os dados oficiais para o Controller mandar de volta pro Celular do cliente.
    return {
    id: agendamentoId,
    clienteId,
    estabelecimentoId,
    estabelecimentoNome: estabelecimento.nome,
    data,
    horario,
    profissional: profissionalNome,
    observacoes,
    total: totalCalculado,
    status: "pendente",
    servicos: servicosSelecionados
  };
}

/**
 * FUNÇÃO: listarAgendamentosDoCliente
 * O QUE FAZ: Pega todos os históricos do cliente e mistura com os detalhes dos serviços em uma coisa só.
 */
async function listarAgendamentosDoCliente(clienteId) {
  // Pega o ID e transforma em número matemático puro.
  const idCliente = Number(clienteId);
  
  // Pede pro DAO procurar se esse cliente realmente existe no banco de dados.
  const cliente = await clientesDAO.buscarPorId(idCliente);

  // Se não existir, avisa o erro.
  if (!cliente) {
    throw new Error("Cliente nao encontrado.");
  }

  // DAO puxa a lista "crua" de todos os agendamentos que essa pessoa já fez na vida.
  const agendamentos = await agendamentosDAO.listarPorCliente(idCliente);
  
  // '.map()': Pega a lista de agendamentos e recorta APENAS os IDs. (Ex: Ela tem os agendamentos nº 15 e nº 22).
  const agendamentoIds = agendamentos.map((item) => Number(item.id));
  
  // Manda esses IDs pro DAO e pede: "Me traga todos os serviços que foram feitos nesses agendamentos".
  const servicosRows = await agendamentosDAO.listarServicosPorAgendamentos(agendamentoIds);

  // --- A MÁGICA DO MAP ---
  // 'Map()': É um objeto nativo do Javascript. Pense nele como um Dicionário ou uma Cômoda com várias Gavetas.
  const servicosMap = new Map();
  
  // Varre a lista de serviços que vieram do banco (Tudo misturado: Corte, Unha, Escova).
  for (const row of servicosRows) {
    // Descobre a qual "Gaveta" (Qual Agendamento) esse serviço pertence. Ex: Gaveta 15.
    const idAgendamento = Number(row.agendamento_id);

    // '.has()': Pergunta: "Já existe a gaveta nº 15 nessa cômoda?"
    if (!servicosMap.has(idAgendamento)) {
      // '.set()': Se não existe, cria a Gaveta 15 e coloca uma lista vazia '[]' dentro dela.
      servicosMap.set(idAgendamento, []);
    }

    // '.get()': Abre a Gaveta 15 e '.push()' joga o serviço (ex: Corte) lá pra dentro.
    servicosMap.get(idAgendamento).push({
      id: Number(row.servico_id),
      nome: row.nome,
      preco: Number(row.preco || 0)
    });
  }

  // --- MONTANDO A RESPOSTA FINAL ---
  // '.map()': Varre a lista de agendamentos (Apenas as capas)...
  return agendamentos.map((item) => ({
    // ... e reconstrói o objeto garantindo os tipos de dados...
    id: Number(item.id),
    clienteId: Number(item.cliente_id),
    estabelecimentoId: Number(item.estabelecimento_id),
    estabelecimentoNome: item.estabelecimento_nome,
    data: item.data,
    horario: item.horario,
    profissional: item.profissional,
    observacoes: item.observacoes,
    total: Number(item.total || 0),
    status: item.status,
    criadoEm: item.criado_em,
    canceladoEm: item.cancelado_em,
    estabelecimentoLat: item.estabelecimento_lat,
    estabelecimentoLng: item.estabelecimento_lng,
    estabelecimentoEndereco: item.estabelecimento_endereco,
    pagamentoUrl: item.pagamento_url,
    
    // A CEREJA DO BOLO: Pega o ID do Agendamento atual (ex: 15), vai na Cômoda (Map), 
    // abre a gaveta '.get(15)' e cola a lista de serviços ali dentro!
    // Se a gaveta estiver vazia por algum motivo, retorna '|| []' por segurança.
    servicos: servicosMap.get(Number(item.id)) || []
  }));
}

/**
 * FUNÇÃO: cancelarAgendamento
 * O QUE FAZ: Cancela o agendamento e, se foi pago por Pix/Cartão, devolve o dinheiro automaticamente!
 */
async function cancelarAgendamento(agendamentoId) {
  // Força o ID virar número puro.
  const id = Number(agendamentoId);
  
  // Busca o agendamento no banco.
  const agendamento = await agendamentosDAO.buscarPorId(id);

  // Se ele não existir, não dá pra cancelar.
  if (!agendamento) {
    throw new Error("Agendamento nao encontrado.");
  }

  // Se o status já for "cancelado", bloqueia (evita clicar duas vezes e estragar o banco).
  if (agendamento.status === "cancelado") {
    throw new Error("Agendamento ja esta cancelado.");
  }

  // Regra de Negócio: Não se pode cancelar algo que já passou e foi "concluido" (prestado).
  if (agendamento.status === "concluido") {
    throw new Error("Agendamento concluido nao pode ser cancelado.");
  }

  // --- INTEGRAÇÃO COM MERCADO PAGO ---
  // Pergunta pro DAO: "Existe algum pagamento APROVADO atrelado a esse agendamento?"
  const pagamentoAprovado = await pagamentosDAO.buscarPagamentoAprovadoPorAgendamento(id);
  
  // Se existir e tiver um ID oficial do Mercado Pago ('mp_payment_id')...
  if (pagamentoAprovado && pagamentoAprovado.mp_payment_id) {
    // 'try': Tenta falar com o servidor do Mercado Pago...
    try {
      // Manda a ordem de Estorno/Reembolso pro Repositório de Pagamentos fazer a ponte com o MP.
      await pagamentosRepository.reembolsarPagamento(pagamentoAprovado.mp_payment_id);
      
    // 'catch': Se deu qualquer erro (ex: Mercado Pago fora do ar, internet caiu)...
    } catch (error) {
      // Ele PROPOSITALMENTE trava o cancelamento! 
      // Por quê? Para a cliente não ficar com o agendamento Cancelado e sem o Dinheiro de volta. (Prevenção de Processo).
      throw new Error(`Nao foi possivel estornar o pagamento: ${error.message}`);
    }
  }

  // Se não teve erro financeiro, fala pro Arquivista bater o carimbo de CANCELADO no banco de dados.
  await agendamentosDAO.cancelarPorId(id);

  // Retorna um recibo de cancelamento pro Celular da Cliente.
  return {
    id,
    status: "cancelado"
  };
}

// Exporta as funções para que o "Guarda de Trânsito" (Controller) possa usá-las.
module.exports = {
  criarAgendamento,
  listarAgendamentosDoCliente,
  cancelarAgendamento
};
