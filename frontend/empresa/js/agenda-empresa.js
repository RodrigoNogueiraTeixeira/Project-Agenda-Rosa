const API_AGENDAMENTOS_URL = "/api/empresa/agendamentos";

// Captura os principais elementos da tela da agenda.
const tabelaAgendamentos = document.querySelector("tbody");
const formFiltrosAgenda = document.querySelector("#form-filtros-agenda");
const selectProfissional = document.querySelector("#profissional");
const modalDetalhes = document.querySelector("#abrir-detalhes");
const detalhesConteudo = document.querySelector("#detalhes-agendamento");

// Busca o ID da empresa salvo no navegador enquanto o login ainda nao esta integrado.
function obterEmpresaId() {
  return localStorage.getItem("agendaRosaEmpresaId");
}

// Carrega os profissionais ativos da empresa no filtro da agenda.
async function carregarProfissionais() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    return;
  }

  try {
    const resposta = await fetch(`${API_AGENDAMENTOS_URL}/profissionais?empresaId=${empresaId}`);
    const profissionais = await resposta.json();

    selectProfissional.innerHTML = '<option value="todos">Todos</option>';

    profissionais.forEach((profissional) => {
      const opcao = document.createElement("option");
      opcao.value = profissional.id;
      opcao.textContent = profissional.nome;
      selectProfissional.appendChild(opcao);
    });
  } catch (error) {
    console.error("Erro ao carregar profissionais:", error);
  }
}

// Busca o valor de um campo pelo ID.
function obterValor(id) {
  return document.getElementById(id)?.value.trim() || "";
}

// Traduz o status salvo no banco para um texto mais amigavel na tabela.
function formatarStatus(status) {
  const nomes = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    cancelado: "Cancelado",
    realizado: "Realizado",
  };

  return nomes[status] || status;
}

// Monta os parametros de filtro que serao enviados para a API.
function montarFiltros() {
  const parametros = new URLSearchParams({
    empresaId: obterEmpresaId() || "",
  });

  const dataInicial = obterValor("data-inicial");
  const dataFinal = obterValor("data-final");
  const profissionalId = obterValor("profissional");
  const cliente = obterValor("cliente");

  if (dataInicial) {
    parametros.set("dataInicial", dataInicial);
  }

  if (dataFinal) {
    parametros.set("dataFinal", dataFinal);
  }

  if (profissionalId && profissionalId !== "todos") {
    parametros.set("profissionalId", profissionalId);
  }

  if (cliente) {
    parametros.set("cliente", cliente);
  }

  return parametros;
}

// Preenche a modal com as informacoes do agendamento selecionado.
function abrirDetalhes(agendamento) {
  detalhesConteudo.innerHTML = `
    <div class="info-card">
      <span>Cliente</span>
      <p>${agendamento.nomeCliente}</p>
    </div>
    <div class="info-card">
      <span>Serviço</span>
      <p>${agendamento.servicoNome}</p>
    </div>
    <div class="info-card">
      <span>Horário</span>
      <p>${agendamento.horarioInicio} às ${agendamento.horarioFim}</p>
    </div>
    <div class="info-card">
      <span>Profissional</span>
      <p>${agendamento.profissionalNome || "Não informado"}</p>
    </div>
    <div class="info-card">
      <span>Status</span>
      <p>${formatarStatus(agendamento.status)}</p>
    </div>
    <div class="info-card">
      <span>Data</span>
      <p>${agendamento.dataAgendamento}</p>
    </div>
    <div class="info-card full-width">
      <span>Observações</span>
      <p>${agendamento.observacoes || "-"}</p>
    </div>
  `;

  modalDetalhes.checked = true;
}

// Cria uma linha da tabela para um agendamento retornado pela API.
function criarLinhaAgendamento(agendamento) {
  const linha = document.createElement("tr");
  linha.classList.add("linha-agendamento");

  linha.innerHTML = `
    <td>${agendamento.dataAgendamento} ${agendamento.horarioInicio}</td>
    <td>${agendamento.nomeCliente}</td>
    <td>${agendamento.servicoNome}</td>
    <td>${agendamento.profissionalNome || "-"}</td>
    <td>${formatarStatus(agendamento.status)}</td>
    <td>${agendamento.observacoes || "-"}</td>
    <td class="acoes">
      <button type="button" data-status="confirmado">Confirmar agendamento</button>
      <button type="button" class="btn-outline" data-status="cancelado">Cancelar agendamento</button>
      <button type="button" class="btn-outline" data-status="realizado">Marcar como realizado</button>
    </td>
  `;

  // Abre os detalhes ao clicar nas informacoes principais da linha.
  linha.querySelectorAll("td:not(.acoes)").forEach((celula) => {
    celula.addEventListener("click", () => abrirDetalhes(agendamento));
  });

  // Liga os botoes de acao a atualizacao de status no back-end.
  linha.querySelectorAll("[data-status]").forEach((botao) => {
    botao.addEventListener("click", () => {
      atualizarStatusAgendamento(agendamento.id, botao.dataset.status);
    });
  });

  return linha;
}

// Busca os agendamentos da empresa e atualiza a tabela.
async function carregarAgendamentos() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    tabelaAgendamentos.innerHTML = `
      <tr>
        <td colspan="7">Cadastre ou acesse uma empresa antes de consultar a agenda.</td>
      </tr>
    `;
    return;
  }

  try {
    const resposta = await fetch(`${API_AGENDAMENTOS_URL}?${montarFiltros()}`);
    const agendamentos = await resposta.json();

    tabelaAgendamentos.innerHTML = "";

    if (agendamentos.length === 0) {
      tabelaAgendamentos.innerHTML = `
        <tr>
          <td colspan="7">Nenhum agendamento encontrado.</td>
        </tr>
      `;
      return;
    }

    agendamentos.forEach((agendamento) => {
      tabelaAgendamentos.appendChild(criarLinhaAgendamento(agendamento));
    });
  } catch (error) {
    console.error("Erro ao carregar agenda:", error);
    alert("Nao foi possivel carregar os agendamentos.");
  }
}

// Atualiza o status de um agendamento.
async function atualizarStatusAgendamento(id, status) {
  const mensagens = {
    confirmado: "Deseja confirmar este agendamento?",
    cancelado: "Deseja cancelar este agendamento?",
    realizado: "Deseja marcar este agendamento como realizado?",
  };

  if (!confirm(mensagens[status])) {
    return;
  }

  try {
    const resposta = await fetch(`${API_AGENDAMENTOS_URL}/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        empresaId: obterEmpresaId(),
        status,
      }),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert(resultado.message || "Nao foi possivel atualizar o agendamento.");
      return;
    }

    alert(resultado.message);
    await carregarAgendamentos();
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    alert("Nao foi possivel conectar ao servidor.");
  }
}

// Aplica os filtros sem recarregar a pagina.
formFiltrosAgenda?.addEventListener("submit", (event) => {
  event.preventDefault();
  carregarAgendamentos();
});

// Carrega os agendamentos assim que a tela abre.
carregarProfissionais();
carregarAgendamentos();
