// Cadastro usado por clientes e empresas.
var form = document.querySelector("form");
var botaoCadastrar = document.querySelector("button[type='submit']");
var seletorPerfil = document.getElementById("perfil-cadastro");
var containerEstabelecimento = document.getElementById(
  "container-estabelecimento"
);
var campoNome = document.getElementById("nome-completo");
var campoEmail = document.getElementById("email-cliente");
var campoTelefone = document.getElementById("telefone-cliente");
var campoNomeEstabelecimento = document.getElementById(
  "nome-estabelecimento"
);
var campoSenha = document.getElementById("senha-cliente");
var campoConfirmarSenha = document.getElementById(
  "confirmar-senha-cliente"
);

// Usa o servidor local no desenvolvimento e /api quando estiver publicado.
var API_BASE_URL = (
  window.API_BASE_URL ||
  localStorage.getItem("apiBaseUrl") ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:"
    ? "http://localhost:3001/api"
    : "/api")
).replace(/\/+$/, "");

// Mostra o nome do estabelecimento somente no cadastro de empresa.
function atualizarCamposDoPerfil() {
  if (!seletorPerfil || !containerEstabelecimento) {
    return;
  }

  var cadastroEmpresa = seletorPerfil.value === "empresa";

  if (cadastroEmpresa) {
    containerEstabelecimento.style.display = "block";
  } else {
    containerEstabelecimento.style.display = "none";
  }

  if (campoNomeEstabelecimento) {
    campoNomeEstabelecimento.required = cadastroEmpresa;
  }
}

// Recebe o perfil que foi selecionado na tela de login.
function carregarPerfilEscolhido() {
  if (!seletorPerfil) {
    return;
  }

  var parametros = new URLSearchParams(window.location.search);
  var perfilRecebido = parametros.get("perfil");

  if (perfilRecebido === "cliente" || perfilRecebido === "empresa") {
    seletorPerfil.value = perfilRecebido;
  }
}

if (seletorPerfil) {
  seletorPerfil.addEventListener("change", atualizarCamposDoPerfil);
}

carregarPerfilEscolhido();
atualizarCamposDoPerfil();

async function realizarCadastro(event) {
  event.preventDefault();

  var perfil = seletorPerfil ? seletorPerfil.value : "cliente";
  var nome = campoNome ? String(campoNome.value).trim() : "";
  var email = campoEmail ? String(campoEmail.value).trim() : "";
  var telefone = campoTelefone ? String(campoTelefone.value).trim() : "";
  var nomeEstabelecimento = campoNomeEstabelecimento
    ? String(campoNomeEstabelecimento.value).trim()
    : "";
  var senha = campoSenha ? String(campoSenha.value).trim() : "";
  var confirmarSenha = campoConfirmarSenha
    ? String(campoConfirmarSenha.value).trim()
    : "";

  // Confere os dados antes de enviar o cadastro.
  if (!nome || !email || !telefone || !senha || !confirmarSenha) {
    alert("Preencha nome, e-mail, telefone, senha e confirmacao.");
    return;
  }

  if (perfil === "empresa" && !nomeEstabelecimento) {
    alert("Preencha o nome do negocio.");
    return;
  }

  if (!email.includes("@")) {
    alert("Informe um e-mail valido.");
    return;
  }

  if (senha.length < 6) {
    alert("A senha deve conter no minimo 6 caracteres.");
    return;
  }

  if (senha !== confirmarSenha) {
    alert("As senhas informadas nao coincidem.");
    return;
  }

  var textoOriginal = botaoCadastrar
    ? botaoCadastrar.textContent
    : "Cadastrar";

  if (botaoCadastrar) {
    botaoCadastrar.disabled = true;
    botaoCadastrar.textContent = "Cadastrando...";
  }

  try {
    var endpoint;
    var dados;

    // Cada perfil usa sua propria rota e seus campos.
    if (perfil === "empresa") {
      endpoint = "/empresa/cadastro";
      dados = {
        nomeResponsavel: nome,
        email: email,
        senha: senha,
        telefone: telefone,
        nomeEstabelecimento: nomeEstabelecimento,
      };
    } else {
      endpoint = "/clientes/cadastro";
      dados = {
        nome: nome,
        email: email,
        senha: senha,
        telefone: telefone,
      };
    }

    var resposta = await fetch(API_BASE_URL + endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    });

    var corpo = await resposta.json().catch(function () {
      return {};
    });

    if (!resposta.ok) {
      throw new Error(
        corpo.erro || corpo.message || "Falha ao realizar cadastro."
      );
    }

    if (perfil === "empresa") {
      alert(corpo.message || "Cadastro realizado. Aguarde a aprovacao.");
      window.location.href = "./login.html";
      return;
    }

    alert("Cadastro realizado com sucesso!");

    if (corpo.cliente) {
      localStorage.setItem("clienteId", String(corpo.cliente.id));
      localStorage.setItem("clienteNome", corpo.cliente.nome || "");
      localStorage.setItem("clienteEmail", corpo.cliente.email || "");
    }

    window.location.href = "../../cliente/html/homeDoCliente.html";
  } catch (error) {
    alert("Nao foi possivel cadastrar: " + error.message);
  } finally {
    if (botaoCadastrar) {
      botaoCadastrar.disabled = false;
      botaoCadastrar.textContent = textoOriginal;
    }
  }
}

if (form) {
  form.addEventListener("submit", realizarCadastro);
}
