const API_HOME_EMPRESA_URL = "http://localhost:3000/api/home-empresa/resumo";

// Captura os indicadores exibidos nos cards laterais da home.
const indicadorAgendamentosHoje = document.getElementById("agendamentos-hoje");
const indicadorProximoAtendimento = document.getElementById("proximo-atendimento");
const indicadorBloqueiosHoje = document.getElementById("bloqueios-hoje");

// Busca o ID da empresa salvo no navegador enquanto o login ainda nao esta integrado.
function obterEmpresaId() {
  return localStorage.getItem("agendaRosaEmpresaId");
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
    exibirResumoVazio();
    return;
  }

  try {
    const resposta = await fetch(`${API_HOME_EMPRESA_URL}?empresaId=${empresaId}`);
    const resumo = await resposta.json();

    if (!resposta.ok) {
      exibirResumoVazio();
      return;
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

// Carrega os indicadores assim que a home abre.
carregarResumoHome();
