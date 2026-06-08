const API_PERFIL_EMPRESA_URL = "/api/empresa/perfil";
const API_CATEGORIAS_URL = "/api/categorias";

const formPerfil = document.getElementById("form-perfil-estabelecimento");
const botaoSalvarPerfil = document.querySelector(".btn-salvar");
const botaoEditarPerfil = document.querySelector(".btn-editar");
const campoCategoria = document.getElementById("categoria-principal");
const campoFotoLogo = document.getElementById("foto-logo");
const previewLogo = document.getElementById("preview-logo");
const camposPerfil =
  formPerfil?.querySelectorAll("input:not(#foto-logo), select, textarea") || [];
let logoUrlAtual = "";

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
  campoFotoLogo.disabled = !editando;
}

// Mostra a imagem salva ou selecionada pela empresa.
function mostrarLogo(logoUrl) {
  logoUrlAtual = logoUrl || "";
  previewLogo.src = logoUrlAtual;
  previewLogo.style.display = logoUrlAtual ? "block" : "none";
}

// Converte a imagem para texto para que ela possa ser salva no banco.
function selecionarLogo() {
  const arquivo = campoFotoLogo.files[0];

  if (!arquivo) {
    return;
  }

  const tiposAceitos = ["image/png", "image/jpeg", "image/webp"];
  if (!tiposAceitos.includes(arquivo.type)) {
    alert("Selecione uma imagem PNG, JPG ou WEBP.");
    campoFotoLogo.value = "";
    return;
  }

  if (arquivo.size > 1024 * 1024) {
    alert("A imagem deve ter no maximo 1 MB.");
    campoFotoLogo.value = "";
    return;
  }

  const leitor = new FileReader();
  leitor.onload = () => mostrarLogo(leitor.result);
  leitor.readAsDataURL(arquivo);
}

// Carrega as categorias criadas no painel do administrador.
async function carregarCategorias() {
  try {
    const resposta = await fetch(API_CATEGORIAS_URL);
    const resultado = await resposta.json().catch(() => ({}));

    if (!resposta.ok || !resultado.success) {
      throw new Error(resultado.message || "Nao foi possivel carregar as categorias.");
    }

    const categoriasAtivas = resultado.data.filter((categoria) => {
      return String(categoria.status || "").toLowerCase() === "ativa";
    });

    categoriasAtivas.forEach((categoria) => {
      const opcao = document.createElement("option");
      opcao.value = categoria.nome;
      opcao.textContent = categoria.nome;
      campoCategoria.appendChild(opcao);
    });
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
  }
}

function preencherPerfil(perfil) {
  mostrarLogo(perfil.logoUrl);

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
      // Mantem categorias antigas que ainda estejam salvas no perfil.
      if (
        id === "categoria-principal" &&
        valor &&
        !Array.from(campo.options).some((opcao) => opcao.value === valor)
      ) {
        const opcao = document.createElement("option");
        opcao.value = valor;
        opcao.textContent = valor;
        campo.appendChild(opcao);
      }

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
    logoUrl: logoUrlAtual,
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
campoFotoLogo?.addEventListener("change", selecionarLogo);
formPerfil?.addEventListener("submit", salvarPerfil);

definirModoEdicao(false);

// Primeiro carrega as categorias e depois os dados salvos da empresa.
carregarCategorias().finally(carregarPerfil);
