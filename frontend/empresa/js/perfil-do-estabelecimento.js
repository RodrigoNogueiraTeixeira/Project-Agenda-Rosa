const API_PERFIL_EMPRESA_URL = "/api/empresa/perfil";

const formPerfil = document.getElementById("form-perfil-estabelecimento");
const botaoSalvarPerfil = document.querySelector(".btn-salvar");
const botaoEditarPerfil = document.querySelector(".btn-editar");
const camposPerfil = formPerfil?.querySelectorAll("input:not(#foto-logo), textarea") || [];

function obterEmpresaId() {
  return localStorage.getItem("empresaId");
}

function obterValor(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function definirModoEdicao(editando) {
  camposPerfil.forEach((campo) => {
    campo.disabled = !editando;
  });

  botaoSalvarPerfil.disabled = !editando;
  botaoEditarPerfil.disabled = editando;
}

function preencherPerfil(perfil) {
  const campos = {
    "nome-estabelecimento": perfil.nomeEstabelecimento,
    "categoria-principal": perfil.categoriaPrincipal,
    descricao: perfil.descricao,
    telefone: perfil.telefone,
    email: perfil.email,
    cep: perfil.cep,
    endereco: perfil.endereco,
    numero: perfil.numero,
    complemento: perfil.complemento,
    bairro: perfil.bairro,
    cidade: perfil.cidade,
  };

  Object.entries(campos).forEach(([id, valor]) => {
    const campo = document.getElementById(id);
    if (campo) {
      campo.value = valor || "";
    }
  });
}

function montarDadosPerfil() {
  return {
    empresaId: obterEmpresaId(),
    nomeEstabelecimento: obterValor("nome-estabelecimento"),
    categoriaPrincipal: obterValor("categoria-principal"),
    descricao: obterValor("descricao"),
    telefone: obterValor("telefone"),
    email: obterValor("email"),
    cep: obterValor("cep"),
    endereco: obterValor("endereco"),
    numero: obterValor("numero"),
    complemento: obterValor("complemento"),
    bairro: obterValor("bairro"),
    cidade: obterValor("cidade"),
  };
}

async function carregarPerfil() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    alert("Empresa nao identificada. Faca login novamente.");
    window.location.href = "../../login/html/login.html";
    return;
  }

  try {
    const resposta = await fetch(`${API_PERFIL_EMPRESA_URL}?empresaId=${empresaId}`);
    const perfil = await resposta.json();

    if (!resposta.ok) {
      throw new Error(perfil.message || "Nao foi possivel carregar o perfil.");
    }

    preencherPerfil(perfil);
    definirModoEdicao(false);
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
    alert(error.message);
  }
}

async function salvarPerfil(event) {
  event.preventDefault();

  const dados = montarDadosPerfil();

  botaoSalvarPerfil.disabled = true;
  botaoSalvarPerfil.textContent = "Salvando...";

  try {
    const resposta = await fetch(API_PERFIL_EMPRESA_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    });
    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.message || "Nao foi possivel salvar o perfil.");
    }

    preencherPerfil(resultado.perfil);
    localStorage.setItem("empresaNome", resultado.perfil.nomeEstabelecimento || "");
    alert(resultado.message);
    definirModoEdicao(false);
  } catch (error) {
    console.error("Erro ao salvar perfil:", error);
    alert(error.message);
    definirModoEdicao(true);
  } finally {
    botaoSalvarPerfil.textContent = "Salvar";
  }
}

botaoEditarPerfil?.addEventListener("click", () => definirModoEdicao(true));
formPerfil?.addEventListener("submit", salvarPerfil);

definirModoEdicao(false);
carregarPerfil();
