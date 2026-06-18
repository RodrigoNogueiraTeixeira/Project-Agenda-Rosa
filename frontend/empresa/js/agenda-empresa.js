const API_AGENDAMENTOS_URL = "/api/empresa/agendamentos";

// Elementos principais da agenda.
const tabelaAgendamentos = document.querySelector("tbody");
const formFiltrosAgenda = document.getElementById("form-filtros-agenda");
const selectProfissional = document.getElementById("profissional");
const modalDetalhes = document.getElementById("abrir-detalhes");
const detalhesConteudo = document.getElementById(
  "detalhes-agendamento"
);

// Recupera a empresa logada antes de consultar a agenda.
function obterEmpresaId() {
  const empresaId = localStorage.getItem("empresaId");

  if (!empresaId) {
    window.location.href = "../../login/html/login.html";
    return null;
  }

  return empresaId;
}

// Busca o valor de um campo e evita erro quando o elemento nao existe.
function obterValor(id) {
  const campo = document.getElementById(id);

  if (!campo) {
    return "";
  }

  return campo.value.trim();
}

// Carrega os profissionais ativos no filtro.
async function carregarProfissionais() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    return;
  }

  try {
    const resposta = await fetch(
      `${API_AGENDAMENTOS_URL}/profissionais?empresaId=${empresaId}`
    );
    const profissionais = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        profissionais.message || "Nao foi possivel carregar os profissionais."
      );
    }

    selectProfissional.innerHTML = '<option value="todos">Todos</option>';

    for (const profissional of profissionais) {
      const opcao = document.createElement("option");
      opcao.value = profissional.id;
      opcao.textContent = profissional.nome;
      selectProfissional.appendChild(opcao);
    }
  } catch (error) {
    console.error("Erro ao carregar profissionais:", error);
  }
}

// Traduz o status para o texto exibido na tela.
function formatarStatus(status) {
  if (status === "pendente") {
    return "Pendente";
  }

  if (status === "agendado") {
    return "Agendado";
  }

  if (status === "confirmado") {
    return "Confirmado";
  }

  if (status === "cancelado") {
    return "Cancelado";
  }

  if (status === "concluido") {
    return "Concluido";
  }

  if (status === "realizado") {
    return "Realizado";
  }

  return status;
}

// Converte os status antigos para os usados atualmente.
function obterStatusAtual(status) {
  if (status === "confirmado") {
    return "agendado";
  }

  if (status === "realizado") {
    return "concluido";
  }

  return status;
}

// Monta os filtros enviados para a API.
function montarFiltros() {
  const parametros = new URLSearchParams();
  const empresaId = obterEmpresaId();
  const dataInicial = obterValor("data-inicial");
  const dataFinal = obterValor("data-final");
  const profissionalId = obterValor("profissional");
  const cliente = obterValor("cliente");

  parametros.set("empresaId", empresaId || "");

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

// Abre a janela com os detalhes do agendamento.
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

// Define os botoes disponiveis para cada status.
function montarBotoesDeAcao(status) {
  if (status === "pendente") {
    return `
      <button type="button" data-status="confirmado">Confirmar agendamento</button>
      <button type="button" class="btn-outline" data-status="cancelado">Cancelar agendamento</button>
    `;
  }

  if (status === "agendado") {
    return `
      <button type="button" class="btn-outline" data-status="cancelado">Cancelar agendamento</button>
      <button type="button" class="btn-outline" data-status="realizado">Marcar como realizado</button>
    `;
  }

  return "<span>Sem acoes disponiveis</span>";
}

// Monta uma linha da tabela da agenda.
function criarLinhaAgendamento(agendamento) {
  const linha = document.createElement("tr");
  const statusAtual = obterStatusAtual(agendamento.status);
  const botoesAcao = montarBotoesDeAcao(statusAtual);

  linha.classList.add("linha-agendamento");
  linha.innerHTML = `
    <td>${agendamento.dataAgendamento} ${agendamento.horarioInicio}</td>
    <td>${agendamento.nomeCliente}</td>
    <td>${agendamento.servicoNome}</td>
    <td>${agendamento.profissionalNome || "-"}</td>
    <td>${formatarStatus(agendamento.status)}</td>
    <td>${agendamento.observacoes || "-"}</td>
    <td class="acoes">
      ${botoesAcao}
    </td>
  `;

  const celulasDeDetalhes = linha.querySelectorAll("td:not(.acoes)");

  for (const celula of celulasDeDetalhes) {
    celula.addEventListener("click", function () {
      abrirDetalhes(agendamento);
    });
  }

  const botoesDeStatus = linha.querySelectorAll("[data-status]");

  for (const botao of botoesDeStatus) {
    botao.addEventListener("click", function () {
      atualizarStatusAgendamento(
        agendamento.id,
        botao.dataset.status
      );
    });
  }

  return linha;
}

// Busca os agendamentos usando os filtros da tela.
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
    const filtros = montarFiltros();
    const resposta = await fetch(
      `${API_AGENDAMENTOS_URL}?${filtros.toString()}`
    );
    const agendamentos = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        agendamentos.message || "Nao foi possivel carregar os agendamentos."
      );
    }

    tabelaAgendamentos.innerHTML = "";

    if (agendamentos.length === 0) {
      tabelaAgendamentos.innerHTML = `
        <tr>
          <td colspan="7">Nenhum agendamento encontrado.</td>
        </tr>
      `;
      return;
    }

    for (const agendamento of agendamentos) {
      const linha = criarLinhaAgendamento(agendamento);
      tabelaAgendamentos.appendChild(linha);
    }
  } catch (error) {
    console.error("Erro ao carregar agenda:", error);
    alert("Nao foi possivel carregar os agendamentos.");
  }
}

function obterMensagemDeConfirmacao(status) {
  // Define o texto exibido antes de mudar o status.
  if (status === "confirmado") {
    return "Deseja confirmar este agendamento?";
  }

  if (status === "cancelado") {
    return "Deseja cancelar este agendamento?";
  }

  if (status === "realizado") {
    return "Deseja marcar este agendamento como realizado?";
  }

  return "Deseja atualizar este agendamento?";
}

// Atualiza o status depois da confirmacao.
async function atualizarStatusAgendamento(id, status) {
  const mensagem = obterMensagemDeConfirmacao(status);

  if (!confirm(mensagem)) {
    return;
  }

  try {
    const resposta = await fetch(
      `${API_AGENDAMENTOS_URL}/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empresaId: obterEmpresaId(),
          status: status,
        }),
      }
    );

    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert(
        resultado.message || "Nao foi possivel atualizar o agendamento."
      );
      return;
    }

    alert(resultado.message);
    await carregarAgendamentos();
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    alert("Nao foi possivel conectar ao servidor.");
  }
}

if (formFiltrosAgenda) {
  // Recarrega a agenda usando os filtros informados.
  formFiltrosAgenda.addEventListener("submit", function (event) {
    event.preventDefault();
    carregarAgendamentos();
  });
}

carregarProfissionais();
carregarAgendamentos();
