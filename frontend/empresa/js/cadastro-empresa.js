// Cadastro exclusivo da empresa.
var formCadastroEmpresa = document.getElementById("form-cadastro-empresa");
var botaoCadastrar = formCadastroEmpresa
  ? formCadastroEmpresa.querySelector("button[type='submit']")
  : null;

// Define o endereco da API conforme o ambiente.
var API_BASE_URL = (
  window.API_BASE_URL ||
  localStorage.getItem("apiBaseUrl") ||
  ((window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:")
    ? "http://localhost:3001/api"
    : "/api")
).replace(/\/+$/, "");

function obterValor(id) {
  // Busca o valor digitado e remove espacos das pontas.
  var campo = document.getElementById(id);
  return campo ? String(campo.value).trim() : "";
}

// Reune os valores preenchidos no formulario.
function montarDadosEmpresa() {
  return {
    nomeResponsavel: obterValor("nome-completo-profissional"),
    telefone: obterValor("telefone-empresa"),
    email: obterValor("email-empresa"),
    nomeEstabelecimento: obterValor("nome-estabelecimento"),
    senha: obterValor("senha-empresa"),
  };
}

function validarFormulario(dados, confirmarSenha) {
  // Confere os campos antes de enviar para o backend.
  if (
    !dados.nomeResponsavel ||
    !dados.telefone ||
    !dados.email ||
    !dados.nomeEstabelecimento ||
    !dados.senha ||
    !confirmarSenha
  ) {
    return "Preencha todos os campos.";
  }

  if (!dados.email.includes("@")) {
    return "Informe um e-mail valido.";
  }

  if (dados.senha.length < 6) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }

  if (dados.senha !== confirmarSenha) {
    return "As senhas informadas nao conferem.";
  }

  return null;
}

async function cadastrarEmpresa(event) {
  // Envia o cadastro inicial da empresa para aprovacao.
  event.preventDefault();

  var dados = montarDadosEmpresa();
  var confirmarSenha = obterValor("confirmar-senha-empresa");
  var erroValidacao = validarFormulario(dados, confirmarSenha);

  if (erroValidacao) {
    alert(erroValidacao);
    return;
  }

  // Evita o envio repetido enquanto o cadastro esta sendo salvo.
  botaoCadastrar.disabled = true;
  botaoCadastrar.textContent = "Cadastrando...";

  try {
    var resposta = await fetch(API_BASE_URL + "/empresa/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    var resultado = await resposta.json().catch(function () {
      return {};
    });

    if (!resposta.ok) {
      throw new Error(
        resultado.message || "Nao foi possivel cadastrar a empresa."
      );
    }

    // A empresa volta ao login porque ainda precisa ser aprovada.
    alert(resultado.message || "Cadastro realizado. Aguarde a aprovacao.");
    window.location.href = "../../login/html/login.html";
  } catch (error) {
    alert("Nao foi possivel cadastrar: " + error.message);
  } finally {
    botaoCadastrar.disabled = false;
    botaoCadastrar.textContent = "Cadastrar";
  }
}

if (formCadastroEmpresa) {
  // Intercepta o envio padrao para salvar via API.
  formCadastroEmpresa.addEventListener("submit", cadastrarEmpresa);
}
