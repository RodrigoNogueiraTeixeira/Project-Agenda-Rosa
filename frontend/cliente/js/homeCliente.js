
// Interceptador de Fetch para injetar Token JWT
if (!window.fetchIntercepted) {
    const originalFetch = window.fetch;
    window.fetch = async function () {
        let [resource, config] = arguments;
        if(!config) config = {};
        
        // Trata o caso em que headers é um Headers object nativo
        if (config.headers instanceof Headers) {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers.append("Authorization", "Bearer " + token);
            }
        } else {
            if(!config.headers) config.headers = {};
            const token = localStorage.getItem("token");
            if(token) {
                config.headers["Authorization"] = "Bearer " + token;
            }
        }
        
        return originalFetch(resource, config);
    };
    window.fetchIntercepted = true;
}

/**
 * ==================================================================================
 * AGENDA ROSA - MÓDULO DO CLIENTE (homeCliente.js)
 * ==================================================================================
 * Este script gerencia as interações da página inicial do cliente (Home do Cliente).
 * Ele controla filtros de busca, paginação, requisições de estabelecimentos à API, 
 * renderização dinâmica dos cartões de lojas e fluxo de modal para novos agendamentos.
 * 
 * ----------------------------------------------------------------------------------
 * FILTROS DE BUSCA ATIVOS (Objeto 'estadoTela.filtros'):
 * - cidade: Filtra estabelecimentos pelo nome exato da cidade.
 * - bairro: Filtra estabelecimentos pelo nome exato do bairro.
 * - tipo: Filtra estabelecimentos pelo tipo/categoria de serviço selecionado.
 * - busca: Termo textual ('q') para busca rápida pelo nome do estabelecimento.
 * 
 * ----------------------------------------------------------------------------------
 * PRINCIPAIS FUNÇÕES DE BUSCA, FILTRO E PAGINAÇÃO COM SUAS RESPECTIVAS LINHAS:
 * 
 * 1. buscarEstabelecimentos(reiniciarPagina)
 *    - Linha de início: 214
 *    - Funcionamento: Constrói a query string com a paginação e os filtros ativos
 *      e faz a requisição GET assíncrona ao endpoint da API (/estabelecimentos).
 *      Atualiza o cache em memória e calcula o total de páginas disponíveis.
 * 
 * 2. renderizarResultados(estabelecimentos, append)
 *    - Linha de início: 291
 *    - Funcionamento: Monta dinamicamente os cards HTML de cada loja retornada, 
 *      incluindo imagem de logo, serviços, preços, distância e o botão "Agendar".
 *      Gerencia se a tela deve ser limpa ou se novas lojas devem ser adicionadas
 *      abaixo das existentes (append), além de definir a exibição do botão "Ver mais".
 * 
 * 3. filtrarResultados()
 *    - Linha de início: 387
 *    - Funcionamento: Captura os novos filtros informados pelo usuário, reseta
 *      a paginação para a primeira página e executa uma nova busca limpa.
 * 
 * 4. mostrarMaisLojas()
 *    - Linha de início: 422
 *    - Funcionamento: Avança a página atual de exibição e busca novos dados, 
 *      anexando os novos cartões abaixo dos já existentes na tela (modo append).
 * ==================================================================================
 */
// URL base da API. Se nao houver configuracao, usamos localhost:3001.
const API_BASE_URL = window.API_BASE_URL || localStorage.getItem("apiBaseUrl") || (window.location.hostname === "localhost" ? "http://localhost:3001/api" : "/api");

// Id de cliente vem do login. Se nao existir, cai para 1 no prototipo.
const CLIENTE_ID = Number(localStorage.getItem("clienteId") || 1);

// Estado da tela (somente para interatividade e exibicao).
const estadoTela = {
  paginaAtual: 1,
  limite: 6,
  totalPaginas: 1,
  filtros: {
    cidade: "",
    bairro: "",
    tipo: "",
    busca: "",
    raioKm: ""
  },
  mapaEstabelecimentos: new Map(),
  agendamentoAtual: null,
  cardOrigem: null
};

// Carrega as categorias do administrador dinamicamente para o filtro de buscas.
async function carregarCategoriasSelect() {
  const selectTipo = document.getElementById("tipoServico");
  if (!selectTipo) return;

  try {
    const resposta = await fetch(`${API_BASE_URL}/categorias`);
    if (!resposta.ok) throw new Error('Erro ao carregar categorias');
    const json = await resposta.json();

    if (json.success && Array.isArray(json.data)) {
      selectTipo.innerHTML = '<option value="">Todos os Serviços</option>';
      const ativas = json.data.filter(cat => String(cat.status).toLowerCase() === 'ativa');
      
      ativas.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.nome.toLowerCase();
        opt.textContent = cat.nome;
        selectTipo.appendChild(opt);
      });
    }
  } catch (error) {
    console.error("Falha ao carregar categorias dinamicamente:", error);
  }
}

// Executa quando a pagina termina de carregar.
window.onload = async function onLoad() {
  configurarBotaoSair();
  configurarModalAgendamento();
  await carregarCategoriasSelect();
  try {
    const listaInicial = await buscarEstabelecimentos(true);
    renderizarResultados(listaInicial, false);
  } catch (error) {
    mostrarFeedback(`Erro ao carregar estabelecimentos: ${error.message}`, "erro");
  }
};

// Faz requisicoes JSON para a API.
async function chamarApi(caminho, opcoes) {
  const resposta = await fetch(`${API_BASE_URL}${caminho}`, {
    headers: {
      "Content-Type": "application/json",
      ...(opcoes && opcoes.headers ? opcoes.headers : {})
    },
    ...(opcoes || {})
  });

  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(corpo.erro || "Falha na comunicacao com o servidor.");
  }

  return corpo;
}

// Mostra mensagem visual para o usuario na area de feedback.
function mostrarFeedback(mensagem, tipo) {
  const feedback = document.getElementById("feedbackBusca");
  if (!feedback) {
    return;
  }

  feedback.textContent = mensagem;
  feedback.className = "";
  if (tipo) {
    feedback.classList.add(tipo);
  }
}

// Limpa mensagem de feedback atual.
function limparFeedback() {
  mostrarFeedback("", "");
}

function mostrarFeedbackAgendamento(mensagem, tipo) {
  const feedback = document.getElementById("feedbackAgendamento");
  if (!feedback) {
    return;
  }

  feedback.textContent = mensagem;
  feedback.className = "";
  if (tipo) {
    feedback.classList.add(tipo);
  }
}

function limparFeedbackAgendamento() {
  mostrarFeedbackAgendamento("", "");
}

// Formata numero no padrao de moeda para exibir no HTML.
function formatarMoeda(valor) {
  return "R$ " + Number(valor || 0).toFixed(2).replace(".", ",");
}

// Captura os filtros de busca inseridos no formulário da tela pelo cliente.
function capturarFiltrosDoFormulario() {
  return {
    // Captura o valor da cidade e remove espaços nas pontas. Usa ?. para evitar erros se o campo não existir.
    cidade: String(document.getElementById("cidade")?.value || "").trim(),
    // Captura o bairro digitado.
    bairro: String(document.getElementById("bairro")?.value || "").trim(),
    // Obtém o serviço selecionado no seletor (select).
    tipo: String(document.getElementById("tipoServico")?.value || "").trim(),
    // Captura o termo de busca textual digitado no input de texto livre.
    busca: String(document.getElementById("campoBusca")?.value || "").trim(),
    // Captura o raio em quilômetros para cálculo de geolocalização.
    raioKm: String(document.getElementById("raioDistancia")?.value || "").trim()
  };
}

function obterDataMinMaxAgendamento() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const limite = new Date(hoje);
  limite.setMonth(limite.getMonth() + 2);

  const min = hoje.toISOString().split("T")[0];
  const max = limite.toISOString().split("T")[0];

  return { min, max };
}

function validarDataAgendamentoFront(dataTexto) {
  const data = String(dataTexto || "").trim();
  const formatoValido = /^\d{4}-\d{2}-\d{2}$/.test(data);
  if (!formatoValido) {
    return { ok: false, mensagem: "Data invalida. Use o calendario para selecionar." };
  }

  const { min, max } = obterDataMinMaxAgendamento();
  if (data < min) {
    return { ok: false, mensagem: "Nao e permitido agendar no passado." };
  }

  if (data > max) {
    return { ok: false, mensagem: "O agendamento pode ser no maximo ate 2 meses a partir de hoje." };
  }

  return { ok: true, mensagem: "" };
}

// Envia a requisição assíncrona HTTP para a API de estabelecimentos com os parâmetros de paginação e filtros.
// Recebe o parâmetro booleano 'reiniciarPagina' para saber se é uma busca nova ou continuação de paginação.
async function buscarEstabelecimentos(reiniciarPagina) {
  // 1. Controle de Página:
  // Se for uma busca nova (usuário clicou em 'Buscar' ou recarregou a página), 'reiniciarPagina' é true.
  // Reiniciamos o contador no estado da tela para a primeira página (página 1).
  // Se for paginação (usuário clicou em 'Ver mais'), este bloco é ignorado, mantendo a página incremental corrente.
  if (reiniciarPagina) {
    estadoTela.paginaAtual = 1;
  }

  // 2. Instanciação do Montador de Query String:
  // Cria um objeto nativo da Web API do navegador chamado 'URLSearchParams'.
  // Ele serve para construir, formatar e escapar caracteres especiais (como espaços e acentos) na URL de forma segura.
  // NOTA ACADÊMICA: Requisições do tipo HTTP GET não devem enviar dados sensíveis ou payloads no corpo (body).
  // Portanto, todos os filtros de busca são acoplados diretamente ao final da URL como Query Parameters (Ex: ?page=1&limit=6).
  const query = new URLSearchParams();
  
  // 3. Definição da Paginação Básica:
  // Adiciona os parâmetros obrigatórios da paginação que a API espera receber:
  // 'page': o número da página atual a buscar.
  // 'limit': o número máximo de itens por página configurado no estado da tela.
  query.set("page", String(estadoTela.paginaAtual));
  query.set("limit", String(estadoTela.limite));

  // 4. Injeção Condicional de Filtros:
  // Adiciona apenas as chaves dos filtros opcionais cujo conteúdo foi preenchido pelo usuário.
  // Se a propriedade correspondente estiver vazia (null/undefined/string vazia), ela é omitida para economizar dados na URL.
  if (estadoTela.filtros.cidade) {
    query.set("cidade", estadoTela.filtros.cidade);
  }

  if (estadoTela.filtros.bairro) {
    query.set("bairro", estadoTela.filtros.bairro);
  }

  if (estadoTela.filtros.tipo) {
    query.set("tipo", estadoTela.filtros.tipo);
  }

  if (estadoTela.filtros.busca) {
    // Parâmetro 'q' representa o termo de busca textual digitado no campo de pesquisa rápida.
    query.set("q", estadoTela.filtros.busca);
  }

  // 5. Conversão da Query em String:
  // Converte o objeto estruturado 'query' em uma string formatada para URLs (Ex: "page=1&limit=6&cidade=Belo+Horizonte").
  const queryString = new URLSearchParams(query).toString();
  
  // 6. Chamada Assíncrona à API:
  // Dispara a chamada HTTP GET utilizando a função utilitária global 'chamarApi'.
  // O endpoint chamado será '/estabelecimentos' seguido pela interrogação (?) e a query string montada.
  // O 'await' suspende a execução temporariamente até o servidor responder, mantendo o fluxo assíncrono.
  const resposta = await chamarApi(`/estabelecimentos?${queryString}`);
  
  // 7. Validação de Integridade dos Resultados (Fallback):
  // Verifica de forma segura se o retorno 'resposta.estabelecimentos' é de fato um Array.
  // Se for um array válido, usa ele mesmo. Se for nulo ou inválido, define 'lista' como um array vazio '[]'.
  // Isso protege o loop for..of subsequente e evita falhas críticas de renderização.
  const lista = Array.isArray(resposta.estabelecimentos) ? resposta.estabelecimentos : [];

  // 8. Cálculo de Total de Páginas:
  // 'resposta.total' indica o total absoluto de lojas encontradas no banco de dados que atendem àqueles filtros.
  // Dividimos esse total pelo limite de exibição por página e arredondamos para cima com 'Math.ceil' (Ex: 7 itens / 3 por página = 2.33, vira 3 páginas).
  estadoTela.totalPaginas = Math.ceil((resposta.total || 0) / estadoTela.limite);
  
  // 9. Armazenamento em Cache no Mapa Local:
  // Percorre cada estabelecimento retornado e o adiciona a um dicionário em memória (Map).
  // A chave é o ID da loja (convertido para número seguro) e o valor é o próprio objeto com as informações completas.
  // Isso serve para resgatar os detalhes da loja instantaneamente na tela sem precisar fazer outra chamada ao banco quando o cliente clicar em agendar.
  for (const estabelecimento of lista) {
    estadoTela.mapaEstabelecimentos.set(Number(estabelecimento.id), estabelecimento);
  }

  // 10. Retorno da Lista de Lojas Filtradas:
  return lista;
}

// Cria dinamicamente os cards das lojas na área de resultados da busca.
function renderizarResultados(estabelecimentos, append) {
  const container = document.getElementById("lista-resultados");
  const botaoVerMais = document.getElementById("btn-ver-mais");

  // Verificação de segurança caso as tags HTML não existam no DOM da página atual.
  if (!container || !botaoVerMais) {
    return;
  }

  // Se não for append (nova busca), limpa a listagem anterior de lojas no HTML.
  if (!append) {
    container.innerHTML = "";
  }

  // Se a consulta retornou vazia e é uma nova busca, exibe mensagem informativa de nenhum resultado.
  if (!estabelecimentos.length && !append) {
    container.innerHTML = "<p>Nenhum resultado encontrado.</p>";
  }

  // Percorre cada loja retornada para injetar o template HTML do cartão.
  for (const loja of estabelecimentos) {
    // A função 'Array.isArray(valor)' verifica se a variável é de fato uma lista (Array), retornando true ou false.
    // Se for um array, usa o próprio 'loja.servicos'. Se não for (ex: null ou undefined se a loja não tiver serviços cadastrados), 
    // define 'servicos' como um array vazio '[]'. Isso serve para evitar que o loop 'for...of' de serviços quebre a página com erro de iteração.
    const servicos = Array.isArray(loja.servicos) ? loja.servicos : [];

    // Cria a lista de serviços com nome e preço formatado para moeda nacional.
    let htmlDosServicos = "";
    for (const servico of servicos) {
      htmlDosServicos += `<li>${servico.nome} • ${formatarMoeda(servico.preco)}</li>`;
    }

    // Adiciona o HTML do cartão (card) contendo logo, nome, endereço, distância e botão de ação.
    // Usamos interpolação de strings do JavaScript (template literals com crase ``) para construir a estrutura dinamicamente.
    container.innerHTML += `
      <!-- Container principal do cartão da loja -->
      <div class="card-loja">
        
        <!-- Lado esquerdo do cartão: Contém a imagem do logotipo ou o nome alternativo -->
        <div class="card-esquerda">
          <!-- Texto alternativo com o nome da loja que ficará visível caso a logo falhe ao carregar -->
          <div class="tag-nome">${loja.nome}</div>
          
          <!-- Container de estilização da imagem/placeholder -->
          <div class="placeholder-img">
            <!-- 
              Tag de Imagem para carregar a logo do estabelecimento:
              - src: Define a URL da imagem. Se 'loja.logoUrl' for nula/indefinida/vazia, o operador '||' garante um fallback para string vazia.
              - alt: Texto alternativo para acessibilidade e leitores de tela.
              - loading="lazy": Adia o carregamento da imagem até que ela esteja próxima da área visível da tela (melhora a performance).
              - onerror: Evento disparado caso a imagem falhe ao carregar (ex: link quebrado). O inline JS oculta o elemento de imagem (display='none')
                e adiciona a classe CSS 'sem-logo' ao elemento pai (placeholder-img) para ativar a estilização de fallback usando a 'tag-nome'.
            -->
            <img src="${loja.logoUrl || ""}" alt="Logo de ${loja.nome}" loading="lazy" onerror="this.style.display='none'; this.parentElement.classList.add('sem-logo');" />
          </div>
        </div>
        
        <!-- Lado direito do cartão: Detalhes informativos do estabelecimento e botão de agendamento -->
        <div class="card-direita">
          <!-- Nome do estabelecimento em destaque -->
          <h3>${loja.nome}</h3>
          
          <!-- Endereço físico da loja -->
          <p><strong>Endereco:</strong> ${loja.endereco}</p>
          
          <!-- Interpolação condicional: Se existir 'loja.distanciaKm', renderiza a tag com a distância. Caso contrário, renderiza vazio "" -->
          ${loja.distanciaKm ? `<p><strong>Distância:</strong> ${loja.distanciaKm} km</p>` : ""}
          
          <!-- Lista desordenada contendo os serviços oferecidos e seus respectivos preços pré-renderizados -->
          <ul>${htmlDosServicos}</ul>
          
          <!-- 
            Botão que dispara a ação de agendamento:
            - onclick: Chama a função global 'agendar()'.
            - loja.id: Passa o ID único do estabelecimento como primeiro argumento.
            - this: Passa a referência do próprio elemento HTML do botão como segundo argumento (útil para gerenciar o estado visual do clique).
          -->
          <button class="btn-agendar" onclick="agendar(${loja.id}, this)">Agendar</button>
        </div>
      </div>
    `;
  }

  // Faz o controle visual da paginação do botão "Ver mais".
  // 1. Verifica se a página atual exibida (estadoTela.paginaAtual) é estritamente menor do que o total de páginas que o servidor possui (estadoTela.totalPaginas).
  //    Se for menor, significa que ainda restam mais lojas para carregar nas próximas páginas, e 'aindaTemPagina' será 'true'.
  const aindaTemPagina = estadoTela.paginaAtual < estadoTela.totalPaginas;

  // 2. Define a visibilidade do botão 'Ver mais' na interface alterando a propriedade CSS 'display' com base em um operador ternário:
  //    - Se 'aindaTemPagina' for true: define 'inline-block' para que o botão apareça.
  //    - Se 'aindaTemPagina' for false: define 'none' para esconder o botão por completo, já que todas as lojas já foram carregadas.
  botaoVerMais.style.display = aindaTemPagina ? "inline-block" : "none";
}

// Ação disparada quando o cliente clica no botão "Buscar".
// O prefixo 'async' torna esta função assíncrona, permitindo usar o operador 'await' para pausar e esperar requisições de rede.
async function filtrarResultados() {
  // O bloco 'try' tenta executar as operações de busca. Se algo falhar (ex.: rede cair), o fluxo desvia imediatamente para o 'catch'.
  try {
    // Zera qualquer aviso ou feedback visual de busca anterior na tela.
    limparFeedback();
    
    // Captura e armazena no estado global da tela (estadoTela.filtros) os valores preenchidos nos filtros (cidade, bairro, tipo).
    estadoTela.filtros = capturarFiltrosDoFormulario();

    // Envia a requisição assíncrona para a API chamando 'buscarEstabelecimentos'.
    // O argumento 'true' sinaliza que queremos reiniciar a paginação para a página 1 (nova busca).
    // O 'await' pausa a execução da função até que a lista de estabelecimentos seja retornada da API.
    let lista = await buscarEstabelecimentos(true);
    
    // Passa os dados recebidos para serem renderizados em HTML na tela.
    // O segundo argumento 'false' desativa o modo 'append', limpando todos os cards anteriores do container antes de desenhar os novos.
    renderizarResultados(lista, false);

    // Verifica se a lista retornada está vazia (!lista.length avalia como true se o tamanho da lista for igual a 0).
    if (!lista.length) {
      // Exibe uma mensagem de feedback informando que nenhuma loja atende aos filtros pesquisados.
      mostrarFeedback("Nenhum estabelecimento encontrado.", "erro");
    } else {
      // Exibe uma mensagem de feedback indicando que a busca obteve sucesso.
      mostrarFeedback("Busca realizada com sucesso.", "sucesso");
    }
  } catch (error) {
    // Bloco executado apenas em caso de erro (ex: falha de internet ou erro do servidor).
    // Captura a exceção 'error' e exibe o detalhe do problema ('error.message') na tela de forma amigável ao cliente.
    mostrarFeedback(`Erro ao buscar estabelecimentos: ${error.message}`, "erro");
  }
}

// Ação disparada quando o cliente clica no botão "Ver mais".
// A função é assíncrona ('async') para lidar com a chamada HTTP que buscará a próxima página de lojas de forma não-bloqueante.
async function mostrarMaisLojas() {
  try {
    // 1. Incremento de Página:
    // Aumenta em 1 unidade o número da página atual a ser pesquisada no estado da tela (Ex: se estava na página 1, passa para a página 2).
    estadoTela.paginaAtual += 1;
    
    // 2. Requisição Assíncrona dos Novos Registros:
    // Chama a função 'buscarEstabelecimentos' passando o argumento 'false'.
    // O 'false' indica que não queremos reiniciar a paginação (não volta para a página 1, mantendo o incremento feito acima).
    // O 'await' pausa a execução até que o servidor retorne a lista de estabelecimentos correspondente à nova página pesquisada.
    const lista = await buscarEstabelecimentos(false);
    
    // 3. Renderização Acumulativa (Append):
    // Passa a lista retornada de novos estabelecimentos para a função 'renderizarResultados'.
    // O segundo argumento definido como 'true' ativa o modo 'append' (anexar).
    // Isso instrui a função a não apagar os cartões de lojas já exibidos na tela, mas sim a desenhar as novas lojas logo abaixo dos cartões existentes.
    renderizarResultados(lista, true);
  } catch (error) {
    // Caso ocorra qualquer falha na chamada HTTP ou processamento, o fluxo desvia para este bloco.
    // Exibe um feedback visual de erro na tela informando a mensagem técnica detalhada ('error.message').
    mostrarFeedback(`Erro ao carregar mais resultados: ${error.message}`, "erro");
  }
}

// Abre o modal de agendamento para a loja clicada.
async function agendar(idLoja, botaoOrigem) {
  const id = Number(idLoja);
  let loja = estadoTela.mapaEstabelecimentos.get(id);

  if (botaoOrigem && typeof botaoOrigem.closest === "function") {
    estadoTela.cardOrigem = botaoOrigem.closest(".card-loja");
  } else {
    estadoTela.cardOrigem = null;
  }

  if (!loja) {
    try {
      loja = await chamarApi(`/estabelecimentos/${id}`, { method: "GET" });
      estadoTela.mapaEstabelecimentos.set(id, loja);
    } catch (_error) {
      mostrarFeedback("Nao foi possivel abrir os dados de agendamento desta loja.", "erro");
      return;
    }
  }

  abrirModalAgendamento(loja);
}

// Configura o botao de sair.
function configurarBotaoSair() {
  const btnSair = document.getElementById("deslogar");

  if (!btnSair) {
    return;
  }

  btnSair.onclick = function onClickSair() {
    window.location.href = "../../login/html/login.html";
  };
}

// Configura todos os eventos do modal.
function configurarModalAgendamento() {
  const btnFechar = document.getElementById("fecharAgendamento");
  const btnCancelar = document.getElementById("cancelarAgendamento");
  const btnConfirmar = document.getElementById("confirmarAgendamento");
  const overlay = document.getElementById("overlayAgendamento");

  if (btnFechar) {
    btnFechar.onclick = fecharModalAgendamento;
  }

  if (btnCancelar) {
    btnCancelar.onclick = fecharModalAgendamento;
  }

  if (overlay) {
    overlay.onclick = function onClickOverlay(evento) {
      if (evento.target === overlay) {
        fecharModalAgendamento();
      }
    };
  }

  if (btnConfirmar) {
    btnConfirmar.onclick = confirmarAgendamento;
  }

  const selectHorario = document.getElementById("horarioAgendamento");
  if (selectHorario) {
    selectHorario.onchange = function onHorarioChange() {
      const opcaoSelecionada = selectHorario.options[selectHorario.selectedIndex];
      if (opcaoSelecionada && opcaoSelecionada.getAttribute("data-ocupado") === "true") {
        Swal.fire({
          title: 'Horário Ocupado',
          text: 'Este horário já está agendado para o profissional selecionado. Por favor, escolha outro horário.',
          icon: 'warning',
          confirmButtonText: 'Entendido'
        });
        selectHorario.value = "";
      } else if (opcaoSelecionada && opcaoSelecionada.getAttribute("data-passado") === "true") {
        Swal.fire({
          title: 'Horário Passado',
          text: 'Este horário já passou. Por favor, escolha um horário futuro.',
          icon: 'warning',
          confirmButtonText: 'Entendido'
        });
        selectHorario.value = "";
      }
    };
  }

  const selectProfissional = document.getElementById("profissionalAgendamento");
  if (selectProfissional) {
    selectProfissional.onchange = function onProfissionalChange() {
      const val = selectProfissional.value;
      const campoHorario = document.getElementById("horarioAgendamento");
      const notaHorario = document.getElementById("nota-horario");
      
      if (!val) {
        if (campoHorario) {
          campoHorario.innerHTML = '<option value="">Selecione o profissional primeiro</option>';
          campoHorario.disabled = true;
          campoHorario.value = "";
        }
        if (notaHorario) {
          notaHorario.style.display = "block";
        }
      } else {
        if (!verificarCapacitacaoProfissional("profissional")) {
          return;
        }
        if (campoHorario) {
          campoHorario.disabled = false;
        }
        if (notaHorario) {
          notaHorario.style.display = "none";
        }
        atualizarHorariosDisponiveis();
      }
    };
  }
}

async function confirmarAgendamento() {
  const btnConfirmar = document.getElementById("confirmarAgendamento");
  const campoData = document.getElementById("dataAgendamento");
  const campoHorario = document.getElementById("horarioAgendamento");
  const selectProfissional = document.getElementById("profissionalAgendamento");
  const data = String(campoData?.value || "").trim();
  const horario = String(campoHorario?.value || "").trim();
  const profissionalId = String(selectProfissional?.value || "").trim();
  const observacoes = String(document.getElementById("observacoesAgendamento")?.value || "").trim();
  const validacaoData = validarDataAgendamentoFront(data);
  limparFeedbackAgendamento();

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Você precisa estar logado para confirmar um agendamento. Vamos te levar para o login!");
    window.location.href = "../../login/html/login.html";
    return;
  }

  if (campoData) campoData.style.borderColor = "";
  if (campoHorario) campoHorario.style.borderColor = "";
  if (selectProfissional) selectProfissional.style.borderColor = "";

  if (!data || !horario || !profissionalId) {
    if (!data && campoData) campoData.style.borderColor = "red";
    if (!horario && campoHorario) campoHorario.style.borderColor = "red";
    if (!profissionalId && selectProfissional) selectProfissional.style.borderColor = "red";
    mostrarFeedbackAgendamento("Data, profissional e horario sao obrigatorios para confirmar o agendamento.", "erro");
    return;
  }

  const opcaoSelecionada = campoHorario?.options[campoHorario.selectedIndex];
  if (opcaoSelecionada && opcaoSelecionada.getAttribute("data-ocupado") === "true") {
    if (campoHorario) campoHorario.style.borderColor = "red";
    mostrarFeedbackAgendamento("O horário selecionado está ocupado. Por favor, selecione outro.", "erro");
    return;
  }
  if (opcaoSelecionada && opcaoSelecionada.getAttribute("data-passado") === "true") {
    if (campoHorario) campoHorario.style.borderColor = "red";
    mostrarFeedbackAgendamento("O horário selecionado já passou. Por favor, selecione um horário futuro.", "erro");
    return;
  }

  if (!validacaoData.ok) {
    if (campoData) campoData.style.borderColor = "red";
    mostrarFeedbackAgendamento(validacaoData.mensagem, "erro");
    return;
  }

  if (!verificarCapacitacaoProfissional("profissional")) {
    return;
  }

  const checkboxes = document.querySelectorAll("#listaServicosModal input[type='checkbox']");
  const servicosIds = [];
  for (const checkbox of checkboxes) {
    if (checkbox.checked) {
      servicosIds.push(Number(checkbox.value));
    }
  }

  if (!estadoTela.agendamentoAtual || !estadoTela.agendamentoAtual.estabelecimentoId) {
    mostrarFeedbackAgendamento("Nao foi possivel identificar o estabelecimento do agendamento.", "erro");
    return;
  }

  const textoOriginal = btnConfirmar ? btnConfirmar.textContent : "Confirmar agendamento";
  if (btnConfirmar) {
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Confirmando...";
  }

  try {
    const statusConfigPagamento = await chamarApi("/pagamentos/mercadopago/status-config", { method: "GET" });
    if (!statusConfigPagamento.configurado) {
      mostrarFeedbackAgendamento(
        "Pagamento indisponivel: configure MP_ACCESS_TOKEN e APP_BASE_URL no backend e reinicie o servidor.",
        "erro"
      );
      return;
    }

    const resultadoAgendamento = await chamarApi("/agendamentos", {
      method: "POST",
      body: JSON.stringify({
        clienteId: CLIENTE_ID,
        estabelecimentoId: estadoTela.agendamentoAtual.estabelecimentoId,
        servicosIds,
        data,
        horario,
        profissionalId,
        observacoes
      })
    });

    const agendamentoCriado = resultadoAgendamento.agendamento;

    try {
      const resultadoPagamento = await chamarApi("/pagamentos/mercadopago/preference", {
        method: "POST",
        body: JSON.stringify({
          agendamentoId: agendamentoCriado.id,
          clienteId: CLIENTE_ID
        })
      });

      const linkPagamento =
        resultadoPagamento?.pagamento?.initPoint ||
        resultadoPagamento?.pagamento?.sandboxInitPoint ||
        "";

      if (!linkPagamento) {
        mostrarFeedbackAgendamento("Agendamento criado, mas nao foi possivel gerar o link de pagamento.", "erro");
        fecharModalAgendamento();
        return;
      }

      window.location.href = linkPagamento;
    } catch (erroPagamento) {
      const mensagem = String(erroPagamento.message || "");
      if (mensagem.includes("MP_ACCESS_TOKEN")) {
        mostrarFeedbackAgendamento(
          "Agendamento criado com sucesso, mas o pagamento nao foi iniciado. Verifique MP_ACCESS_TOKEN no .env e reinicie o backend."
          ,
          "erro"
        );
      } else {
        mostrarFeedbackAgendamento(`Agendamento criado, mas houve erro ao iniciar pagamento: ${mensagem}`, "erro");
      }
    }
  } catch (error) {
    mostrarFeedbackAgendamento(`Nao foi possivel confirmar o agendamento: ${error.message}`, "erro");
  } finally {
    if (btnConfirmar) {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = textoOriginal;
    }
  }
}

// Abre e preenche os dados do modal de agendamento.
function abrirModalAgendamento(loja) {
  const overlay = document.getElementById("overlayAgendamento");
  const campoEstabelecimento = document.getElementById("estabelecimentoAgendamento");
  const listaServicosModal = document.getElementById("listaServicosModal");
  const totalAgendamento = document.getElementById("totalAgendamento");

  if (!overlay || !campoEstabelecimento || !listaServicosModal || !totalAgendamento) {
    return;
  }

  estadoTela.agendamentoAtual = {
    estabelecimentoId: Number(loja.id)
  };
  limparFeedbackAgendamento();

  campoEstabelecimento.value = loja.nome;
  
  // Populando o novo campo de endereco com mapa
  const txtEnderecoModal = document.getElementById("enderecoAgendamentoModal");
  const txtCepModal = document.getElementById("cepAgendamentoModal");
  const containerMapaModal = document.getElementById("containerMapaModal");
  const iframeMapaModal = document.getElementById("iframeMapaModal");
  
  if (txtEnderecoModal) {
    txtEnderecoModal.textContent = loja.endereco ? loja.endereco : "Endereço indisponível";
  }

  if (txtCepModal) {
    txtCepModal.textContent = loja.cep ? `CEP: ${loja.cep}` : "";
  }
  
  if (containerMapaModal && iframeMapaModal) {
    if (loja.latitude && loja.longitude) {
      // Usando Google Maps simples por iframe
      iframeMapaModal.src = `https://maps.google.com/maps?q=${loja.latitude},${loja.longitude}&z=15&output=embed`;
      containerMapaModal.style.display = "block";
    } else {
      // Se a loja ainda nao tiver coordenada (ex: banco foi limpo), tentamos buscar via nome
      const busca = encodeURIComponent(loja.endereco || loja.nome);
      iframeMapaModal.src = `https://maps.google.com/maps?q=${busca}&z=15&output=embed`;
      containerMapaModal.style.display = "block";
    }
  }

  listaServicosModal.innerHTML = "";

  for (const servico of loja.servicos || []) {
    const item = document.createElement("div");
    item.className = "item-servico";

    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = String(servico.id);
    checkbox.setAttribute("data-preco", String(servico.preco));
    checkbox.setAttribute("data-duracao", String(servico.duracao_minutos || 30));
    checkbox.setAttribute("data-categoria", String(servico.categoria || ""));
    checkbox.setAttribute("data-nome", String(servico.nome || ""));
    checkbox.onchange = () => {
      if (checkbox.checked && !verificarCapacitacaoProfissional("servico")) {
        return;
      }
      atualizarTotalAgendamento();
      carregarProfissionaisPorServicos();
      atualizarHorariosDisponiveis();
    };

    const nome = document.createElement("span");
    nome.textContent = servico.nome;

    const preco = document.createElement("span");
    preco.className = "preco-servico";
    preco.textContent = `${servico.duracao_minutos || 30} min • ${formatarMoeda(servico.preco)}`;

    label.appendChild(checkbox);
    label.appendChild(nome);
    item.appendChild(label);
    item.appendChild(preco);
    listaServicosModal.appendChild(item);
  }

  const selectProfissional = document.getElementById("profissionalAgendamento");
  if (selectProfissional) {
    selectProfissional.innerHTML = '<option value="">Selecione um servico primeiro</option>';
    selectProfissional.disabled = true;
  }

  const campoData = document.getElementById("dataAgendamento");
  const campoHorario = document.getElementById("horarioAgendamento");
  const { min, max } = obterDataMinMaxAgendamento();
  totalAgendamento.textContent = "Total: R$ 0,00";
  campoData.value = "";
  campoData.min = min;
  campoData.max = max;
  campoData.style.borderColor = "";
  campoData.onchange = atualizarHorariosDisponiveis;
  
  if (campoHorario) {
    campoHorario.value = "";
    campoHorario.style.borderColor = "";
    campoHorario.innerHTML = '<option value="">Selecione o profissional primeiro</option>';
    campoHorario.disabled = true;
  }
  
  const notaHorario = document.getElementById("nota-horario");
  if (notaHorario) {
    notaHorario.style.display = "block";
  }

  document.getElementById("observacoesAgendamento").value = "";

  overlay.style.display = "grid";
  document.body.classList.add("modal-aberto");
  if (estadoTela.cardOrigem) {
    estadoTela.cardOrigem.classList.add("card-origem-agendamento");
  }
}

// Fecha o modal e limpa estado temporario.
function fecharModalAgendamento() {
  const overlay = document.getElementById("overlayAgendamento");
  if (!overlay) {
    return;
  }

  overlay.style.display = "none";
  document.body.classList.remove("modal-aberto");
  if (estadoTela.cardOrigem) {
    estadoTela.cardOrigem.classList.remove("card-origem-agendamento");
  }
  estadoTela.agendamentoAtual = null;
  estadoTela.cardOrigem = null;
}

// Filtra horários passados se o usuário escolher o dia de hoje e busca horários dinamicamente na API
async function atualizarHorariosDisponiveis() {
  const campoData = document.getElementById("dataAgendamento");
  const campoHorario = document.getElementById("horarioAgendamento");
  const selectProfissional = document.getElementById("profissionalAgendamento");
  
  if (!campoData || !campoHorario) return;
  
  const dataSelecionada = campoData.value;
  const profissionalId = selectProfissional ? selectProfissional.value : "";
  const notaHorario = document.getElementById("nota-horario");
  
  if (!profissionalId) {
    campoHorario.innerHTML = '<option value="">Selecione o profissional primeiro</option>';
    campoHorario.disabled = true;
    if (notaHorario) notaHorario.style.display = "block";
    return;
  }
  
  campoHorario.disabled = false;
  if (notaHorario) notaHorario.style.display = "none";
  
  const checkboxes = document.querySelectorAll("#listaServicosModal input[type='checkbox']");
  
  let duracaoTotal = 0;
  for (const checkbox of checkboxes) {
    if (checkbox.checked) {
      duracaoTotal += Number(checkbox.getAttribute("data-duracao") || 30);
    }
  }
  
  // Se não marcou nenhum serviço, define no mínimo 30
  if (duracaoTotal === 0) duracaoTotal = 30;
  
  const valorAnterior = campoHorario.value;
  campoHorario.innerHTML = '<option value="">Selecione</option>';
  
  if (!dataSelecionada || !estadoTela.agendamentoAtual?.estabelecimentoId) {
    return;
  }
  
  try {
    const resposta = await chamarApi(`/estabelecimentos/${estadoTela.agendamentoAtual.estabelecimentoId}/horarios-disponiveis?data=${dataSelecionada}&duracao=${duracaoTotal}&profissionalId=${profissionalId}`, { method: 'GET' });
    const horarios = resposta.horarios || [];
    
    for (const slot of horarios) {
      const option = document.createElement("option");
      option.value = slot.hora;
      if (slot.disponivel) {
        option.textContent = slot.hora;
      } else if (slot.passado) {
        option.textContent = `🕒 ${slot.hora} (Passou)`;
        option.style.color = "#71717a";
        option.style.fontWeight = "bold";
        option.setAttribute("data-passado", "true");
      } else {
        option.textContent = `🔴 ${slot.hora} (Ocupado)`;
        option.style.color = "#ef4444";
        option.style.fontWeight = "bold";
        option.setAttribute("data-ocupado", "true");
      }
      campoHorario.appendChild(option);
    }
    
    // Tenta recolocar o valor se ele ainda existir e estiver livre e não passado
    if (valorAnterior) {
      const opcao = Array.from(campoHorario.options).find(o => o.value === valorAnterior);
      if (opcao && opcao.getAttribute("data-ocupado") !== "true" && opcao.getAttribute("data-passado") !== "true") {
        campoHorario.value = valorAnterior;
      } else {
        campoHorario.value = "";
        if (opcao && (opcao.getAttribute("data-ocupado") === "true" || opcao.getAttribute("data-passado") === "true")) {
          const motivo = opcao.getAttribute("data-passado") === "true" ? "já passou" : "está ocupado";
          Swal.fire({
            title: 'Horário Indisponível',
            text: `O horário selecionado anteriormente ${motivo} para a nova duração de serviços.`,
            icon: 'warning',
            confirmButtonText: 'Entendido'
          });
        }
      }
    }
  } catch (e) {
    console.error("Erro ao buscar horários disponíveis", e);
  }
}

// Atualiza o valor total visual do modal (interatividade de tela).
function atualizarTotalAgendamento() {
  const checkboxes = document.querySelectorAll("#listaServicosModal input[type='checkbox']");
  let total = 0;
  let duracaoTotal = 0;

  for (const checkbox of checkboxes) {
    if (checkbox.checked) {
      total += Number(checkbox.getAttribute("data-preco") || 0);
      duracaoTotal += Number(checkbox.getAttribute("data-duracao") || 30);
    }
  }

  const campoTotal = document.getElementById("totalAgendamento");
  if (campoTotal) {
    if (duracaoTotal > 0) {
      campoTotal.textContent = `Total: ${formatarMoeda(total)} (${duracaoTotal} min)`;
    } else {
      campoTotal.textContent = "Total: R$ 0,00";
    }
  }
}

// Expomos funcoes globais porque o HTML usa onclick="...".
window.filtrarResultados = filtrarResultados;
window.mostrarMaisLojas = mostrarMaisLojas;
window.agendar = agendar;

// Atualiza a lista com profissionais que atendem aos servicos marcados.
async function carregarProfissionaisPorServicos() {
  const selectProfissional = document.getElementById("profissionalAgendamento");
  const campoHorario = document.getElementById("horarioAgendamento");
  const notaHorario = document.getElementById("nota-horario");
  const checkboxes = document.querySelectorAll("#listaServicosModal input[type='checkbox']");
  const servicosIds = [];

  for (const cb of checkboxes) {
    if (cb.checked) {
      servicosIds.push(Number(cb.value));
    }
  }

  if (!selectProfissional) return;

  selectProfissional.value = "";
  selectProfissional.disabled = true;

  if (campoHorario) {
    campoHorario.innerHTML = '<option value="">Selecione o profissional primeiro</option>';
    campoHorario.disabled = true;
  }
  if (notaHorario) notaHorario.style.display = "block";

  if (servicosIds.length === 0) {
    selectProfissional.innerHTML = '<option value="">Selecione um servico primeiro</option>';
    return;
  }

  selectProfissional.innerHTML = '<option value="">Carregando...</option>';

  try {
    const estabelecimentoId = estadoTela.agendamentoAtual.estabelecimentoId;
    const resposta = await fetch(
      `${API_BASE_URL}/estabelecimentos/${estabelecimentoId}/profissionais?servicosIds=${servicosIds.join(",")}`
    );
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || "Erro ao buscar profissionais.");
    }

    const profissionais = dados.profissionais || [];
    if (profissionais.length === 0) {
      selectProfissional.innerHTML = '<option value="">Nenhum profissional atende aos servicos</option>';
      return;
    }

    selectProfissional.innerHTML = '<option value="">Selecione o profissional</option>';
    for (const profissional of profissionais) {
      const option = document.createElement("option");
      option.value = profissional.id;
      option.textContent = profissional.nome + (profissional.especialidade ? ` - ${profissional.especialidade}` : "");
      option.setAttribute("data-especialidade", String(profissional.especialidade || ""));
      option.setAttribute("data-nome", String(profissional.nome || ""));
      selectProfissional.appendChild(option);
    }
    selectProfissional.disabled = false;
  } catch (error) {
    console.error("Erro ao carregar profissionais", error);
    selectProfissional.innerHTML = '<option value="">Erro ao carregar profissionais</option>';
  }
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function profissionalAtendeCategoria(especialidade, categoria) {
  if (!especialidade) return true;
  if (!categoria) return true;

  const espNorm = normalizarTexto(especialidade);
  const catNorm = normalizarTexto(categoria);

  if (espNorm === catNorm) return true;
  if (espNorm.includes(catNorm) || catNorm.includes(espNorm)) return true;

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

  const listaEsp = sinonimos[espNorm] || [];
  if (listaEsp.includes(catNorm)) return true;

  const listaCat = sinonimos[catNorm] || [];
  if (listaCat.includes(espNorm)) return true;

  return false;
}

function verificarCapacitacaoProfissional(elementoQueMudou) {
  const selectProfissional = document.getElementById("profissionalAgendamento");
  if (!selectProfissional || !selectProfissional.value) return true;

  const optSelecionada = selectProfissional.options[selectProfissional.selectedIndex];
  const especialidade = optSelecionada.getAttribute("data-especialidade") || "";
  const nomeProf = optSelecionada.getAttribute("data-nome") || "";

  const checkboxes = document.querySelectorAll("#listaServicosModal input[type='checkbox']");
  
  for (const cb of checkboxes) {
    if (cb.checked) {
      const categoria = cb.getAttribute("data-categoria") || "";
      const nomeServico = cb.getAttribute("data-nome") || "";

      if (!profissionalAtendeCategoria(especialidade, categoria)) {
        Swal.fire({
          title: "Profissional não capacitado",
          text: `O profissional ${nomeProf} (${especialidade || 'Sem especialidade'}) não realiza o serviço: ${nomeServico} (${categoria || 'Sem categoria'}).`,
          icon: "warning",
          confirmButtonText: "Entendido"
        });

        // Resetar o que causou o conflito
        if (elementoQueMudou === "profissional") {
          selectProfissional.value = "";
          // Também limpar horários
          const campoHorario = document.getElementById("horarioAgendamento");
          if (campoHorario) {
            campoHorario.innerHTML = '<option value="">Selecione o profissional primeiro</option>';
            campoHorario.disabled = true;
            campoHorario.value = "";
          }
          const notaHorario = document.getElementById("nota-horario");
          if (notaHorario) {
            notaHorario.style.display = "block";
          }
        } else {
          // Foi o checkbox do serviço
          cb.checked = false;
          atualizarTotalAgendamento();
          atualizarHorariosDisponiveis();
        }
        return false;
      }
    }
  }
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  // Exibe o aviso educacional apenas na primeira vez que o usuário entra na Home durante a sessão
  if (!sessionStorage.getItem("avisoEducacionalLido")) {
    Swal.fire({
      title: "Bem-vindo(a) ao Agenda Rosa! 🌸",
      html: `
        <p style="text-align: justify; font-size: 15px; margin-bottom: 15px; line-height: 1.5;">
          Gostaríamos de informar que este é um projeto acadêmico. O fluxo do sistema está <b>100% funcional</b>, então sinta-se à vontade para testar tudo na prática: desde a busca por estabelecimentos até a finalização de um agendamento!
        </p>
        <p style="text-align: justify; font-size: 15px; margin-bottom: 15px; line-height: 1.5;">
          Apenas um lembrete importante: como se trata de um ambiente de demonstração, os salões e profissionais listados são <b>fictícios</b>. Fique à vontade para realizar agendamentos de teste, mas lembre-se de que os serviços não serão de fato realizados, ok?
        </p>
        <div style="background-color: #fff3f8; padding: 15px; border-radius: 8px; border-left: 5px solid #c93f7d; text-align: left;">
          <p style="font-size: 14.5px; color: #333; margin: 0; line-height: 1.5;">
            <b>⚠️ Dica de Cadastro:</b><br>
            Para facilitar a sua experiência, nós <b>não exigimos</b> a confirmação de e-mails verdadeiros. Você pode criar a sua conta utilizando um e-mail inventado (ex: <i>teste@example.com</i>) e testar o sistema sem vincular a sua conta pessoal.
          </p>
        </div>
      `,
      icon: "info",
      confirmButtonText: "Entendi, vamos explorar!",
      confirmButtonColor: "#c93f7d",
      width: '600px'
    }).then(() => {
      sessionStorage.setItem("avisoEducacionalLido", "true");
    });
  }
});
