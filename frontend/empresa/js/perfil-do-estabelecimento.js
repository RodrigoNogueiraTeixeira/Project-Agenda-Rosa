
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

const API_PERFIL_EMPRESA_URL = "/api/empresa/perfil";
const API_CATEGORIAS_URL = "/api/categorias";

// Elementos principais da tela.
const formPerfil = document.getElementById("form-perfil-estabelecimento");
const botaoSalvarPerfil = document.querySelector(".btn-salvar");
const campoCategoria = document.getElementById("categoria-principal");
const campoFotoLogo = document.getElementById("foto-logo");
const previewLogo = document.getElementById("preview-logo");

let logoUrlAtual = "";

// Le a empresa associada ao perfil atual.
function obterEmpresaId() {
  return localStorage.getItem("empresaId");
}

// Busca valores dos campos do formulario.
function obterValor(id) {
  const campo = document.getElementById(id);

  if (!campo) {
    return "";
  }

  return campo.value.trim();
}

// Mostra a logo salva ou escolhida pela empresa.
function mostrarLogo(logoUrl) {
  logoUrlAtual = logoUrl || "";
  previewLogo.src = logoUrlAtual;

  if (logoUrlAtual) {
    previewLogo.style.display = "block";
  } else {
    previewLogo.style.display = "none";
  }
}

function tipoDeImagemValido(tipo) {
  // Aceita apenas os formatos permitidos para a logo.
  if (tipo === "image/png") {
    return true;
  }

  if (tipo === "image/jpeg") {
    return true;
  }

  if (tipo === "image/webp") {
    return true;
  }

  return false;
}

// Valida e prepara a imagem para ser salva.
function selecionarLogo() {
  const arquivo = campoFotoLogo.files[0];

  if (!arquivo) {
    return;
  }

  if (!tipoDeImagemValido(arquivo.type)) {
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

  leitor.onload = function () {
    mostrarLogo(leitor.result);
  };

  leitor.readAsDataURL(arquivo);
}

// Carrega somente as categorias ativas.
async function carregarCategorias() {
  try {
    const resposta = await fetch(API_CATEGORIAS_URL);
    const resultado = await resposta.json().catch(function () {
      return {};
    });

    if (!resposta.ok || !resultado.success) {
      throw new Error(
        resultado.message || "Nao foi possivel carregar as categorias."
      );
    }

    for (const categoria of resultado.data) {
      const status = String(categoria.status || "").toLowerCase();

      if (status === "ativa") {
        const opcao = document.createElement("option");
        opcao.value = categoria.nome;
        opcao.textContent = categoria.nome;
        campoCategoria.appendChild(opcao);
      }
    }
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
  }
}

// Mantem uma categoria antiga que ainda esteja salva no perfil.
function adicionarCategoriaAntiga(categoria) {
  if (!categoria) {
    return;
  }

  let categoriaEncontrada = false;

  for (const opcao of campoCategoria.options) {
    if (opcao.value === categoria) {
      categoriaEncontrada = true;
      break;
    }
  }

  if (!categoriaEncontrada) {
    const opcao = document.createElement("option");
    opcao.value = categoria;
    opcao.textContent = categoria;
    campoCategoria.appendChild(opcao);
  }
}

function preencherCampo(id, valor) {
  // Preenche um campo somente se ele existir na tela.
  const campo = document.getElementById(id);

  if (campo) {
    campo.value = valor || "";
  }
}

// Preenche o formulario com os dados recebidos da API.
function preencherPerfil(perfil) {
  mostrarLogo(perfil.logoUrl);
  adicionarCategoriaAntiga(perfil.categoriaPrincipal);

  preencherCampo("nome-estabelecimento", perfil.nomeEstabelecimento);
  preencherCampo("categoria-principal", perfil.categoriaPrincipal);
  preencherCampo("descricao", perfil.descricao);
  preencherCampo("telefone", perfil.telefone);
  preencherCampo("email", perfil.email);
  preencherCampo("cep", perfil.cep);
  preencherCampo("endereco", perfil.endereco);
  preencherCampo("numero", perfil.numero);
  preencherCampo("complemento", perfil.complemento);
  preencherCampo("bairro", perfil.bairro);
  preencherCampo("cidade", perfil.cidade);
}

function montarDadosPerfil() {
  // Monta o corpo enviado para atualizar o perfil.
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

// Busca os dados atuais da empresa.
async function carregarPerfil() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    alert("Empresa nao identificada. Faca login novamente.");
    window.location.href = "../../login/html/login.html";
    return;
  }

  try {
    const resposta = await fetch(
      `${API_PERFIL_EMPRESA_URL}?empresaId=${empresaId}`
    );
    const perfil = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        perfil.message || "Nao foi possivel carregar o perfil."
      );
    }

    preencherPerfil(perfil);
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
    alert(error.message);
  }
}

// Envia as alteracoes do perfil para o backend.
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
      throw new Error(
        resultado.message || "Nao foi possivel salvar o perfil."
      );
    }

    preencherPerfil(resultado.perfil);
    localStorage.setItem(
      "empresaNome",
      resultado.perfil.nomeEstabelecimento || ""
    );
    alert(resultado.message);
  } catch (error) {
    console.error("Erro ao salvar perfil:", error);
    alert(error.message);
  } finally {
    botaoSalvarPerfil.disabled = false;
    botaoSalvarPerfil.textContent = "Salvar";
  }
}

if (campoFotoLogo) {
  // Atualiza a pre-visualizacao quando uma imagem e escolhida.
  campoFotoLogo.addEventListener("change", selecionarLogo);
}

if (formPerfil) {
  // Envia o formulario para a API sem recarregar a pagina.
  formPerfil.addEventListener("submit", salvarPerfil);
}

// As categorias devem aparecer antes dos dados do perfil.
carregarCategorias().finally(carregarPerfil);
