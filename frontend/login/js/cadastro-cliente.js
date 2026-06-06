// ============================================================
// CADASTRO UNIFICADO - CLIENTE OU EMPRESA
// ============================================================

var form = document.querySelector("form");
var botaoCadastrar = document.querySelector("button[type='submit']");

var seletorPerfil = document.getElementById("perfil-cadastro");
var containerEstabelecimento = document.getElementById("container-estabelecimento");

var campoNome = document.getElementById("nome-completo");
var campoEmail = document.getElementById("email-cliente");
var campoTelefone = document.getElementById("telefone-cliente");
var campoNomeEstabelecimento = document.getElementById("nome-estabelecimento");
var campoSenha = document.getElementById("senha-cliente");
var campoConfirmarSenha = document.getElementById("confirmar-senha-cliente");

var API_BASE_URL = window.API_BASE_URL || localStorage.getItem("apiBaseUrl") || (window.location.hostname === "localhost" ? "http://localhost:3001/api" : "/api");

// Lógica de alternância dos campos
if (seletorPerfil) {
  seletorPerfil.addEventListener("change", function () {
    if (seletorPerfil.value === "empresa") {
      containerEstabelecimento.style.display = "block";
    } else {
      containerEstabelecimento.style.display = "none";
    }
  });
}

async function realizarCadastro(event) {
  event.preventDefault();

  var perfil = seletorPerfil ? seletorPerfil.value : "cliente";
  var nome = campoNome ? String(campoNome.value).trim() : "";
  var email = campoEmail ? String(campoEmail.value).trim() : "";
  var telefone = campoTelefone ? String(campoTelefone.value).trim() : "";
  var nomeEstabelecimento = campoNomeEstabelecimento ? String(campoNomeEstabelecimento.value).trim() : "";
  var senha = campoSenha ? String(campoSenha.value).trim() : "";
  var confirmarSenha = campoConfirmarSenha ? String(campoConfirmarSenha.value).trim() : "";

  // Validação básica
  if (!nome || !email || !senha || !confirmarSenha) {
    alert("Por favor, preencha todos os campos obrigatórios (*Nome, E-mail, Senha e Confirmação*).");
    return;
  }

  if (perfil === "empresa" && !nomeEstabelecimento) {
    alert("Por favor, preencha o Nome do Negócio.");
    return;
  }

  if (senha !== confirmarSenha) {
    alert("As senhas informadas não coincidem. Por favor, verifique.");
    return;
  }

  if (!email.includes("@")) {
    alert("Informe um e-mail valido.");
    return;
  }

  if (senha.length < 6) {
    alert("A senha deve conter no mínimo 6 caracteres.");
    return;
  }

  var textoOriginal = botaoCadastrar ? botaoCadastrar.textContent : "Cadastrar";
  if (botaoCadastrar) {
    botaoCadastrar.disabled = true;
    botaoCadastrar.textContent = "Cadastrando...";
  }

  try {
    var endpoint = perfil === "empresa" ? "/empresa/cadastro" : "/clientes/cadastro";
    
    var payload = {};
    if (perfil === "empresa") {
      payload = {
        nomeResponsavel: nome,
        email: email,
        senha: senha,
        telefone: telefone,
        nomeEstabelecimento: nomeEstabelecimento
      };
    } else {
      payload = {
        nome: nome,
        email: email,
        senha: senha,
        telefone: telefone
      };
    }

    var resposta = await fetch(API_BASE_URL + endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    var corpo = await resposta.json().catch(function () {
      return {};
    });

    if (!resposta.ok) {
      throw new Error(corpo.erro || corpo.message || "Falha ao realizar cadastro.");
    }

    if (perfil === "empresa") {
      alert("Cadastro realizado com sucesso! " + (corpo.message || "Sua conta está aguardando aprovação."));
      window.location.href = "./login.html";
    } else {
      alert("Cadastro realizado com sucesso! Bem-vinda!");
      if (corpo.cliente) {
        localStorage.setItem("clienteId", String(corpo.cliente.id));
        localStorage.setItem("clienteNome", corpo.cliente.nome || "");
        localStorage.setItem("clienteEmail", corpo.cliente.email || "");
      }
      window.location.href = "../../cliente/html/homeDoCliente.html";
    }

  } catch (error) {
    alert("Não foi possível cadastrar: " + error.message);
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
