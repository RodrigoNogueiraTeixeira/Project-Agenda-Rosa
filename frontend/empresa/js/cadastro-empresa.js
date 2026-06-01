const API_URL = "/api/empresa/cadastro";

// Captura o formulario de cadastro e o botao de envio da tela.
const formCadastroEmpresa = document.querySelector("form");
const botaoCadastrar = formCadastroEmpresa?.querySelector("button[type='submit']");

// Busca o valor de um campo pelo ID e remove espacos extras.
function obterValor(id) {
  return document.getElementById(id)?.value.trim() || "";
}

// Monta o objeto que sera enviado para a API.
function montarDadosEmpresa() {
  return {
    nomeResponsavel: obterValor("nome-completo-profissional"),
    telefone: obterValor("telefone-empresa"),
    email: obterValor("email-empresa"),
    nomeEstabelecimento: obterValor("nome-estabelecimento"),
    senha: obterValor("senha-empresa"),
  };
}

// Valida as regras basicas da tela antes de chamar o back-end.
function validarFormulario(dados, confirmarSenha) {
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

  if (dados.senha.length < 6) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }

  if (dados.senha !== confirmarSenha) {
    return "As senhas informadas nao conferem.";
  }

  return null;
}

// Envia o cadastro da empresa para a API.
async function cadastrarEmpresa(event) {
  // Evita o recarregamento padrao da pagina ao enviar o formulario.
  event.preventDefault();

  const dados = montarDadosEmpresa();
  const confirmarSenha = obterValor("confirmar-senha-empresa");
  const erroValidacao = validarFormulario(dados, confirmarSenha);

  if (erroValidacao) {
    alert(erroValidacao);
    return;
  }

  // Desabilita o botao para evitar dois envios seguidos.
  botaoCadastrar.disabled = true;
  botaoCadastrar.textContent = "Cadastrando...";

  try {
    // Chamada HTTP para a rota POST /api/empresas.
    const resposta = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert(resultado.message || "Nao foi possivel cadastrar a empresa.");
      return;
    }

    // Guarda temporariamente o ID da empresa para as proximas telas enquanto o login nao esta integrado.
    localStorage.setItem("empresaId", resultado.empresa.id);

    alert(resultado.message);
    formCadastroEmpresa.reset();
  } catch (error) {
    // Mostra uma mensagem amigavel quando a API nao responde.
    console.error("Erro ao cadastrar empresa:", error);
    alert("Nao foi possivel conectar ao servidor.");
  } finally {
    // Restaura o botao depois da tentativa de cadastro.
    botaoCadastrar.disabled = false;
    botaoCadastrar.textContent = "Cadastrar";
  }
}

// Liga a funcao de cadastro ao evento submit do formulario.
formCadastroEmpresa?.addEventListener("submit", cadastrarEmpresa);
