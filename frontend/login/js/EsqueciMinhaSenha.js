document.addEventListener("DOMContentLoaded", function () {
  var botao = document.getElementById("btn-recuperar-senha");

  if (!botao) {
    return;
  }

  botao.addEventListener("click", async function () {
    var email = String(document.getElementById("email-recuperacao")?.value || "").trim();
    var perfil = String(document.getElementById("perfil-recuperacao")?.value || "").trim();

    if (!email || !perfil) {
      alert("Por favor, informe o perfil e o e-mail.");
      return;
    }

    if (!email.includes("@")) {
      alert("Informe um e-mail valido.");
      return;
    }

    if (perfil.toLowerCase() === "administrador") {
      alert("A recuperacao de administrador deve ser feita pela configuracao do servidor.");
      return;
    }

    var textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Enviando...";

    var API_BASE_URL = (
      window.API_BASE_URL ||
      localStorage.getItem("apiBaseUrl") ||
      ((window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.protocol === "file:")
        ? "http://localhost:3001/api"
        : "/api")
    ).replace(/\/+$/, "");

    var controller = new AbortController();
    var timeoutId = setTimeout(function () {
      controller.abort();
    }, 25000);

    try {
      var resposta = await fetch(API_BASE_URL + "/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, perfil: perfil }),
        signal: controller.signal,
      });
      var dados = await resposta.json().catch(function () {
        return {};
      });

      if (!resposta.ok || !dados.success) {
        throw new Error(dados.message || "Erro ao processar solicitacao.");
      }

      alert(dados.message || "Solicitacao processada.");
    } catch (erro) {
      if (erro.name === "AbortError") {
        alert("O servidor demorou demais. Tente novamente.");
      } else {
        alert(erro.message || "Erro de conexao.");
      }
    } finally {
      clearTimeout(timeoutId);
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  });
});
