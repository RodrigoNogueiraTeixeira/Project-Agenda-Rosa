
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

// Le a empresa salva no login.
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
  // Mantem os indicadores com dois digitos.
  return String(valor || 0).padStart(2, "0");
}

// Mostra valores vazios quando nao foi possivel carregar o resumo.
function exibirResumoVazio() {
  indicadorAgendamentosHoje.textContent = "00";
  indicadorProximoAtendimento.textContent = "--:--";
  indicadorBloqueiosHoje.textContent = "00";
}

function exibirResumo(resumo) {
  // Atualiza os tres cards de indicadores da home.
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
  // Remove a sessao local ao sair.
  botaoSair.addEventListener("click", sairDaConta);
}

carregarResumoHome();
