// URL base da API. Se nao houver configuracao, usamos localhost:3001.
const API_BASE_URL = window.API_BASE_URL || localStorage.getItem("apiBaseUrl") || (window.location.hostname === "localhost" ? "http://localhost:3001/api" : "/api");

// Id de cliente vem do login. Se nao existir, cai para 1 no prototipo.
const CLIENTE_ID = Number(localStorage.getItem("clienteId") || 1);

// Estado da tela (somente para interatividade e exibicao).
const estadoTela = {
  paginaAtual: 1,
  limite: 2,
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

// Executa quando a pagina termina de carregar.
window.onload = async function onLoad() {
  configurarBotaoSair();
  configurarModalAgendamento();
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

// Le os filtros digitados na tela.
function capturarFiltrosDoFormulario() {
  return {
    cidade: String(document.getElementById("cidade")?.value || "").trim(),
    bairro: String(document.getElementById("bairro")?.value || "").trim(),
    tipo: String(document.getElementById("tipoServico")?.value || "").trim(),
    busca: String(document.getElementById("campoBusca")?.value || "").trim(),
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

// Busca estabelecimentos no backend (que agora centraliza as regras de negocio).
async function buscarEstabelecimentos(reiniciarPagina) {
  if (reiniciarPagina) {
    estadoTela.paginaAtual = 1;
  }

  const query = new URLSearchParams();
  query.set("page", String(estadoTela.paginaAtual));
  query.set("limit", String(estadoTela.limite));

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
    query.set("q", estadoTela.filtros.busca);
  }

  const queryString = new URLSearchParams(query).toString();
  const resposta = await chamarApi(`/estabelecimentos?${queryString}`);
  const lista = Array.isArray(resposta.estabelecimentos) ? resposta.estabelecimentos : [];

  estadoTela.totalPaginas = Math.ceil((resposta.total || 0) / estadoTela.limite);
  for (const estabelecimento of lista) {
    estadoTela.mapaEstabelecimentos.set(Number(estabelecimento.id), estabelecimento);
  }

  return lista;
}

// Renderiza os cards dos estabelecimentos na area de resultados.
function renderizarResultados(estabelecimentos, append) {
  const container = document.getElementById("lista-resultados");
  const botaoVerMais = document.getElementById("btn-ver-mais");

  if (!container || !botaoVerMais) {
    return;
  }

  if (!append) {
    container.innerHTML = "";
  }

  if (!estabelecimentos.length && !append) {
    container.innerHTML = "<p>Nenhum resultado encontrado.</p>";
  }

  for (const loja of estabelecimentos) {
    const servicos = Array.isArray(loja.servicos) ? loja.servicos : [];

    let htmlDosServicos = "";
    for (const servico of servicos) {
      htmlDosServicos += `<li>${servico.nome} • ${formatarMoeda(servico.preco)}</li>`;
    }

    container.innerHTML += `
      <div class="card-loja">
        <div class="card-esquerda">
          <div class="tag-nome">${loja.nome}</div>
          <div class="placeholder-img">
            <img src="${loja.logoUrl || ""}" alt="Logo de ${loja.nome}" loading="lazy" onerror="this.style.display='none'; this.parentElement.classList.add('sem-logo');" />
          </div>
        </div>
        <div class="card-direita">
          <h3>${loja.nome}</h3>
          <p><strong>Endereco:</strong> ${loja.endereco}</p>
          ${loja.distanciaKm ? `<p><strong>Distância:</strong> ${loja.distanciaKm} km</p>` : ""}
          <ul>${htmlDosServicos}</ul>
          <button class="btn-agendar" onclick="agendar(${loja.id}, this)">Agendar</button>
        </div>
      </div>
    `;
  }

  const aindaTemPagina = estadoTela.paginaAtual < estadoTela.totalPaginas;
  botaoVerMais.style.display = aindaTemPagina ? "inline-block" : "none";
}

// Acao do botao "Buscar" da tela.
async function filtrarResultados() {
  try {
    limparFeedback();
    estadoTela.filtros = capturarFiltrosDoFormulario();

    let lista = await buscarEstabelecimentos(true);
    renderizarResultados(lista, false);

    if (!lista.length) {
      mostrarFeedback("Nenhum estabelecimento encontrado.", "erro");
    } else {
      mostrarFeedback("Busca realizada com sucesso.", "sucesso");
    }
  } catch (error) {
    mostrarFeedback(`Erro ao buscar estabelecimentos: ${error.message}`, "erro");
  }
}

// Acao do botao "Ver mais".
async function mostrarMaisLojas() {
  try {
    estadoTela.paginaAtual += 1;
    const lista = await buscarEstabelecimentos(false);
    renderizarResultados(lista, true);
  } catch (error) {
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

  if (!validacaoData.ok) {
    if (campoData) campoData.style.borderColor = "red";
    mostrarFeedbackAgendamento(validacaoData.mensagem, "erro");
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
    checkbox.onchange = () => {
      atualizarTotalAgendamento();
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
    selectProfissional.innerHTML = '<option value="">Carregando...</option>';
    selectProfissional.disabled = true;
    
    fetch(`${API_BASE_URL}/estabelecimentos/${loja.id}/profissionais`)
      .then(res => res.json())
      .then(dados => {
        selectProfissional.innerHTML = '<option value="">Selecione o profissional</option>';
        
        const list = dados.profissionais || [];
        list.forEach(p => {
          const opt = document.createElement("option");
          opt.value = p.id;
          opt.textContent = p.nome + (p.especialidade ? ` - ${p.especialidade}` : "");
          selectProfissional.appendChild(opt);
        });
        selectProfissional.disabled = false;
      })
      .catch(err => {
        console.error("Erro ao carregar profissionais", err);
        selectProfissional.innerHTML = '<option value="">Erro ao carregar profissionais</option>';
        selectProfissional.disabled = false;
      });
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
      } else {
        option.textContent = `🔴 ${slot.hora} (Ocupado)`;
        option.style.color = "#ef4444";
        option.style.fontWeight = "bold";
        option.setAttribute("data-ocupado", "true");
      }
      campoHorario.appendChild(option);
    }
    
    // Tenta recolocar o valor se ele ainda existir nas opções
    if (valorAnterior) {
      const opcoesAtualizadas = Array.from(campoHorario.options).map(o => o.value);
      if (opcoesAtualizadas.includes(valorAnterior)) {
        campoHorario.value = valorAnterior;
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
