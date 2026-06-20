
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
  const botaoRedefinir = document.getElementById("btn-redefinir");
  const mensagemErro = document.getElementById("mensagem-erro");
  const mensagemSucesso = document.getElementById("mensagem-sucesso");
  const formContainer = document.getElementById("form-container");
  const parametros = new URLSearchParams(window.location.search);
  const token = parametros.get("token");

  if (!token) {
    mostrarMensagem(
      mensagemErro,
      "Link invalido. Nenhum token encontrado."
    );
    formContainer.style.display = "none";
    return;
  }

  botaoRedefinir.addEventListener("click", function () {
    redefinirSenha(
      token,
      mensagemErro,
      mensagemSucesso,
      formContainer
    );
  });
});

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

function mostrarMensagem(elemento, texto) {
  elemento.textContent = texto;
  elemento.style.display = "block";
}

function esconderMensagem(elemento) {
  elemento.style.display = "none";
}

// Valida e envia a nova senha para o backend.
async function redefinirSenha(
  token,
  mensagemErro,
  mensagemSucesso,
  formContainer
) {
  const novaSenha = document.getElementById("nova-senha").value;
  const confirmarSenha =
    document.getElementById("confirmar-senha").value;

  esconderMensagem(mensagemErro);
  esconderMensagem(mensagemSucesso);

  if (!novaSenha || !confirmarSenha) {
    mostrarMensagem(
      mensagemErro,
      "Por favor, preencha as duas senhas."
    );
    return;
  }

  if (novaSenha !== confirmarSenha) {
    mostrarMensagem(mensagemErro, "As senhas nao coincidem.");
    return;
  }

  if (novaSenha.length < 6) {
    mostrarMensagem(
      mensagemErro,
      "A nova senha deve ter pelo menos 6 caracteres."
    );
    return;
  }

  try {
    const resposta = await fetch(
      obterApiBaseUrl() + "/redefinir-senha",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          novaSenha: novaSenha,
        }),
      }
    );

    const dados = await resposta.json();

    if (resposta.ok && dados.success) {
      mostrarMensagem(
        mensagemSucesso,
        "Senha redefinida com sucesso! Voce ja pode fazer login."
      );
      formContainer.style.display = "none";
    } else {
      mostrarMensagem(
        mensagemErro,
        dados.message || "Erro ao redefinir a senha."
      );
    }
  } catch (error) {
    mostrarMensagem(
      mensagemErro,
      "Erro de conexao. Tente novamente mais tarde."
    );
  }
}
