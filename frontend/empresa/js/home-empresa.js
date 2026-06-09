const API_HOME_EMPRESA_URL = "/api/empresa/home-empresa/resumo";

// Indicadores exibidos na home.
const indicadorAgendamentosHoje = document.getElementById(
  "agendamentos-hoje"
);
const indicadorProximoAtendimento = document.getElementById(
  "proximo-atendimento"
);
const indicadorBloqueiosHoje = document.getElementById("bloqueios-hoje");
const botaoSair = document.getElementById("btn-sair");

function obterEmpresaId() {
  return localStorage.getItem("empresaId");
}

// Limpa os dados da empresa e volta para o login.
function sairDaConta(event) {
  event.preventDefault();

  localStorage.removeItem("empresaId");
  localStorage.removeItem("empresaNome");
  localStorage.removeItem("empresaEmail");

  window.location.href = "../../login/html/login.html";
}

function formatarContador(valor) {
  return String(valor || 0).padStart(2, "0");
}

// Mostra valores vazios quando nao foi possivel carregar o resumo.
function exibirResumoVazio() {
  indicadorAgendamentosHoje.textContent = "00";
  indicadorProximoAtendimento.textContent = "--:--";
  indicadorBloqueiosHoje.textContent = "00";
}

function exibirResumo(resumo) {
  indicadorAgendamentosHoje.textContent = formatarContador(
    resumo.totalAgendamentosHoje
  );

  if (resumo.proximoAtendimento) {
    indicadorProximoAtendimento.textContent =
      resumo.proximoAtendimento.horarioInicio || "--:--";
  } else {
    indicadorProximoAtendimento.textContent = "--:--";
  }

  indicadorBloqueiosHoje.textContent = formatarContador(
    resumo.totalBloqueiosHoje
  );
}

// Busca os indicadores atualizados no backend.
async function carregarResumoHome() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    window.location.href = "../../login/html/login.html";
    return;
  }

  try {
    const resposta = await fetch(
      `${API_HOME_EMPRESA_URL}?empresaId=${empresaId}`
    );
    const resumo = await resposta.json().catch(function () {
      return {};
    });

    if (!resposta.ok) {
      throw new Error(
        resumo.message || "Nao foi possivel carregar o resumo."
      );
    }

    exibirResumo(resumo);
  } catch (error) {
    console.error("Erro ao carregar resumo da home:", error);
    exibirResumoVazio();
  }
}

if (botaoSair) {
  botaoSair.addEventListener("click", sairDaConta);
}

carregarResumoHome();
