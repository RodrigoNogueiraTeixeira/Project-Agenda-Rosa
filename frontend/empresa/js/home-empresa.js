const API_HOME_EMPRESA_URL = "/api/empresa/home-empresa/resumo";

// Captura os indicadores exibidos nos cards laterais da home.
const indicadorAgendamentosHoje = document.getElementById("agendamentos-hoje");
const indicadorProximoAtendimento = document.getElementById("proximo-atendimento");
const indicadorBloqueiosHoje = document.getElementById("bloqueios-hoje");
const botaoSair = document.getElementById("btn-sair");

// Busca o ID que foi salvo depois do login da empresa.
function obterEmpresaId() {
  return localStorage.getItem("empresaId");
}

// Remove os dados da empresa antes de voltar para o login.
function sairDaConta(event) {
  event.preventDefault();
  localStorage.removeItem("empresaId");
  localStorage.removeItem("empresaNome");
  localStorage.removeItem("empresaEmail");
  window.location.href = "../../login/html/login.html";
}

// Formata numeros pequenos com dois digitos, mantendo o padrao visual que ja existia na home.
function formatarContador(valor) {
  return String(valor || 0).padStart(2, "0");
}

// Atualiza os cards com valores neutros quando nao existe empresa identificada.
function exibirResumoVazio() {
  indicadorAgendamentosHoje.textContent = "00";
  indicadorProximoAtendimento.textContent = "--:--";
  indicadorBloqueiosHoje.textContent = "00";
}

// Busca no back-end os indicadores atualizados da home da empresa.
async function carregarResumoHome() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    // Sem o ID do login, a empresa nao pode acessar o painel.
    window.location.href = "../../login/html/login.html";
    return;
  }

  try {
    const resposta = await fetch(`${API_HOME_EMPRESA_URL}?empresaId=${empresaId}`);
    const resumo = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(resumo.message || "Nao foi possivel carregar o resumo.");
    }

    indicadorAgendamentosHoje.textContent = formatarContador(
      resumo.totalAgendamentosHoje
    );
    indicadorProximoAtendimento.textContent =
      resumo.proximoAtendimento?.horarioInicio || "--:--";
    indicadorBloqueiosHoje.textContent = formatarContador(resumo.totalBloqueiosHoje);
  } catch (error) {
    console.error("Erro ao carregar resumo da home:", error);
    exibirResumoVazio();
  }
}

if (botaoSair) {
  botaoSair.addEventListener("click", sairDaConta);
}

// Carrega os indicadores assim que a home abre.
carregarResumoHome();
