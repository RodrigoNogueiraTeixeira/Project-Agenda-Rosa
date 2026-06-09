// Elementos usados para mostrar ou esconder a senha.
var campoSenha = document.getElementById("senha");
var botaoSenha = document.getElementById("botao-mostrar-senha");

function alternarSenha() {
  if (!campoSenha || !botaoSenha) {
    return;
  }

  if (campoSenha.type === "password") {
    campoSenha.type = "text";
    botaoSenha.textContent = "Oculta";
    botaoSenha.setAttribute("aria-label", "Ocultar senha");
  } else {
    campoSenha.type = "password";
    botaoSenha.textContent = "Mostrar";
    botaoSenha.setAttribute("aria-label", "Mostrar senha");
  }
}

if (botaoSenha) {
  botaoSenha.addEventListener("click", alternarSenha);
}

// Atualiza a mensagem conforme o perfil escolhido.
var seletorPerfil = document.getElementById("perfil");
var campoInformacao = document.getElementById("informacao");
var botaoCriarConta = document.getElementById("btn-criar-conta");

function atualizarInfoPerfil() {
  if (!seletorPerfil || !campoInformacao) {
    return;
  }

  var perfil = seletorPerfil.value;
  var texto = "Selecione um perfil para visualizar os campos necessarios.";

  if (perfil === "cliente") {
    texto = "Cliente: entre com email/usuario e senha cadastrados.";
  } else if (perfil === "empresa") {
    texto = "Empresa: use o acesso da conta empresarial.";
  } else if (perfil === "administrador") {
    texto = "Administrador: informe as credenciais de administracao.";
  }

  campoInformacao.textContent = texto;
}

if (seletorPerfil) {
  seletorPerfil.addEventListener("change", atualizarInfoPerfil);
}

atualizarInfoPerfil();

// Abre o cadastro com o perfil selecionado no login.
function abrirCadastro(event) {
  event.preventDefault();

  var perfil = seletorPerfil ? seletorPerfil.value : "";

  if (!perfil) {
    alert("Selecione Cliente ou Empresa antes de criar a conta.");
    return;
  }

  if (perfil === "administrador") {
    alert("O cadastro de administrador nao e feito por esta tela.");
    return;
  }

  window.location.href = "./cadastro-cliente.html?perfil=" + perfil;
}

if (botaoCriarConta) {
  botaoCriarConta.addEventListener("click", abrirCadastro);
}

// Usa a API local durante o desenvolvimento.
var campoAcesso = document.getElementById("acesso");
var botaoEntrar = document.getElementById("btn-entrar");
var API_BASE_URL =
  window.API_BASE_URL ||
  localStorage.getItem("apiBaseUrl") ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:"
    ? "http://localhost:3001/api"
    : "/api");

// Limpa os dados de uma conta usada anteriormente.
function limparDadosDeAcesso() {
  [
    "clienteId",
    "clienteNome",
    "clienteEmail",
    "empresaId",
    "empresaNome",
    "empresaEmail",
    "adminId",
    "adminNome",
    "adminEmail",
  ].forEach(function (chave) {
    localStorage.removeItem(chave);
  });
}

// Envia os dados de login para o backend.
async function chamarApiLogin(caminho, opcoes) {
  var resposta = await fetch(API_BASE_URL + caminho, {
    headers: {
      "Content-Type": "application/json",
    },
    ...(opcoes || {}),
  });

  var corpo = await resposta.json().catch(function () {
    return {};
  });

  if (!resposta.ok) {
    throw new Error(corpo.erro || "Falha no login.");
  }

  return corpo;
}

async function realizarLogin() {
  var seletorPerfilAtual = document.getElementById("perfil");
  var perfil = seletorPerfilAtual
    ? String(seletorPerfilAtual.value || "").trim()
    : "";
  var email = String(campoAcesso ? campoAcesso.value : "").trim();
  var senha = String(campoSenha ? campoSenha.value : "").trim();

  // Usa a opcao marcada caso o navegador nao retorne o valor do select.
  if (!perfil && seletorPerfilAtual && seletorPerfilAtual.selectedIndex >= 0) {
    var opcaoSelecionada =
      seletorPerfilAtual.options[seletorPerfilAtual.selectedIndex];
    perfil = String(
      opcaoSelecionada ? opcaoSelecionada.value || "" : ""
    ).trim();
  }

  if (!perfil) {
    alert("Selecione o perfil para entrar.");
    return;
  }

  if (!email || !senha) {
    alert("Preencha email e senha.");
    return;
  }

  var textoOriginal = botaoEntrar ? botaoEntrar.textContent : "Entrar";
  if (botaoEntrar) {
    botaoEntrar.disabled = true;
    botaoEntrar.textContent = "Entrando...";
  }

  try {
    var resultado = await chamarApiLogin("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: email,
        senha: senha,
        perfil: perfil,
      }),
    });

    limparDadosDeAcesso();

    // Salva os dados necessarios e abre a pagina de cada perfil.
    if (resultado.perfil === "cliente") {
      localStorage.setItem("clienteId", String(resultado.usuario.id));
      localStorage.setItem("clienteNome", resultado.usuario.nome || "");
      localStorage.setItem("clienteEmail", resultado.usuario.email || "");
      window.location.href = "../../cliente/html/homeDoCliente.html";
    } else if (resultado.perfil === "empresa") {
      localStorage.setItem("empresaId", String(resultado.usuario.id));
      localStorage.setItem("empresaNome", resultado.usuario.nome || "");
      localStorage.setItem("empresaEmail", resultado.usuario.email || "");
      window.location.href = "../../empresa/html/home-empresa.html";
    } else if (resultado.perfil === "administrador") {
      localStorage.setItem("adminId", String(resultado.usuario.id));
      localStorage.setItem("adminNome", resultado.usuario.nome || "");
      localStorage.setItem("adminEmail", resultado.usuario.email || "");
      window.location.href = "../../administrador/html/Dashboard.html";
    } else {
      throw new Error("Perfil desconhecido retornado pelo servidor.");
    }
  } catch (error) {
    alert("Nao foi possivel entrar: " + error.message);
  } finally {
    if (botaoEntrar) {
      botaoEntrar.disabled = false;
      botaoEntrar.textContent = textoOriginal;
    }
  }
}

if (botaoEntrar) {
  botaoEntrar.addEventListener("click", realizarLogin);
}

// Permite entrar usando a tecla Enter.
[campoAcesso, campoSenha, seletorPerfil].forEach(function (campo) {
  if (!campo) {
    return;
  }

  campo.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      realizarLogin();
    }
  });
});
