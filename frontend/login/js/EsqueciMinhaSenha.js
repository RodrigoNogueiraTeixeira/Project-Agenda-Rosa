
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

document.addEventListener("DOMContentLoaded", function () {
  const botao = document.getElementById("btn-recuperar-senha");

  if (!botao) {
    return;
  }

  botao.addEventListener("click", recuperarSenha);
});

function obterValor(id) {
  const campo = document.getElementById(id);

  if (!campo) {
    return "";
  }

  return String(campo.value || "").trim();
}

function obterApiBaseUrl() {
  const apiConfigurada =
    window.API_BASE_URL || localStorage.getItem("apiBaseUrl");

  if (apiConfigurada) {
    return apiConfigurada.replace(/\/+$/, "");
  }

  const ambienteLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:";

  if (ambienteLocal) {
    return "http://localhost:3001/api";
  }

  return "/api";
}

// Solicita a recuperacao para cliente ou empresa.
async function recuperarSenha() {
  const botao = document.getElementById("btn-recuperar-senha");
  const email = obterValor("email-recuperacao");
  const perfil = obterValor("perfil-recuperacao");

  if (!email || !perfil) {
    alert("Por favor, informe o perfil e o e-mail.");
    return;
  }

  if (!email.includes("@")) {
    alert("Informe um e-mail valido.");
    return;
  }

  if (perfil.toLowerCase() === "administrador") {
    alert(
      "A recuperacao de administrador deve ser feita pela configuracao do servidor."
    );
    return;
  }

  const textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = "Enviando...";

  // Cancela a chamada se o servidor demorar mais de 25 segundos.
  const controller = new AbortController();
  const timeoutId = setTimeout(function () {
    controller.abort();
  }, 25000);

  try {
    const resposta = await fetch(
      obterApiBaseUrl() + "/recuperar-senha",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          perfil: perfil,
        }),
        signal: controller.signal,
      }
    );

    const dados = await resposta.json().catch(function () {
      return {};
    });

    if (!resposta.ok || !dados.success) {
      throw new Error(
        dados.message || "Erro ao processar solicitacao."
      );
    }

    alert(dados.message || "Solicitacao processada.");
  } catch (error) {
    if (error.name === "AbortError") {
      alert("O servidor demorou demais. Tente novamente.");
    } else {
      alert(error.message || "Erro de conexao.");
    }
  } finally {
    clearTimeout(timeoutId);
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}
