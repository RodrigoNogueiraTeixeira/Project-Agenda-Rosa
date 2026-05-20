// ============================================================
// CADASTRO DE CLIENTE - CLIENT-SIDE LOGIC
// ============================================================

var form = document.querySelector("form");
var botaoCadastrar = document.querySelector("button[type='submit']");

var campoNome = document.getElementById("nome-completo");
var campoEmail = document.getElementById("email-cliente");
var campoTelefone = document.getElementById("telefone-cliente");
var campoSenha = document.getElementById("senha-cliente");
var campoConfirmarSenha = document.getElementById("confirmar-senha-cliente");

var API_BASE_URL = window.API_BASE_URL || localStorage.getItem("apiBaseUrl") || "http://localhost:3001/api";

async function realizarCadastro(event) {
  event.preventDefault(); // Impede o recarregamento padrão da página

  var nome = campoNome ? String(campoNome.value).trim() : "";
  var email = campoEmail ? String(campoEmail.value).trim() : "";
  var telefone = campoTelefone ? String(campoTelefone.value).trim() : "";
  var senha = campoSenha ? String(campoSenha.value).trim() : "";
  var confirmarSenha = campoConfirmarSenha ? String(campoConfirmarSenha.value).trim() : "";

  // Validação básica dos campos obrigatórios
  if (!nome || !email || !senha || !confirmarSenha) {
    alert("Por favor, preencha todos os campos obrigatórios (*Nome, E-mail, Senha e Confirmação*).");
    return;
  }

  // Validação de correspondência de senha
  if (senha !== confirmarSenha) {
    alert("As senhas informadas não coincidem. Por favor, verifique.");
    return;
  }

  // Validação do tamanho mínimo da senha (6 caracteres)
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
    var resposta = await fetch(API_BASE_URL + "/clientes/cadastro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nome: nome,
        email: email,
        senha: senha,
        telefone: telefone
      })
    });

    var corpo = await resposta.json().catch(function () {
      return {};
    });

    if (!resposta.ok) {
      throw new Error(corpo.erro || "Falha ao realizar cadastro.");
    }

    alert("Cadastro realizado com sucesso! Bem-vinda!");

    // Realiza o auto-login salvando as informações na sessão (localStorage)
    if (corpo.cliente) {
      localStorage.setItem("clienteId", String(corpo.cliente.id));
      localStorage.setItem("clienteNome", corpo.cliente.nome || "");
      localStorage.setItem("clienteEmail", corpo.cliente.email || "");
    }

    // Redireciona para a home do cliente
    window.location.href = "../../cliente/html/homeDoCliente.html";

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
