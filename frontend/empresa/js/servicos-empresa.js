const API_SERVICOS_URL = "/api/empresa/servicos";
const API_CATEGORIAS_URL = "/api/categorias";

// Elementos principais da tela.
const formServico = document.querySelector(".form-grid");
const tabelaServicos = document.querySelector("tbody");
const botaoSalvarServico = formServico
  ? formServico.querySelector("button[type='submit']")
  : null;
const campoCategoria = document.getElementById("categoria-servico");
const campoPreco = document.getElementById("preco-servico");
const campoDuracao = document.getElementById("duracao-servico");

// Guarda o servico selecionado para edicao.
let servicoEmEdicaoId = null;

// Recupera a empresa logada antes de consultar servicos.
function obterEmpresaId() {
  const empresaId = localStorage.getItem("empresaId");

  if (!empresaId) {
    window.location.href = "../../login/html/login.html";
    return null;
  }

  return empresaId;
}

// Busca o valor digitado em um campo da tela.
function obterValor(id) {
  const campo = document.getElementById(id);

  if (!campo) {
    return "";
  }

  return campo.value.trim();
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
    alert("Nao foi possivel carregar as categorias.");
  }
}

// Converte o valor em centavos para moeda brasileira.
function formatarPreco(precoCentavos) {
  const valor = Number(precoCentavos);

  if (!Number.isFinite(valor)) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor / 100);
}

// Retorna os campos mesmo se o PostgreSQL enviar o alias em minusculo.
function normalizarServico(servico) {
  let precoCentavos = servico.precoCentavos;
  let duracaoMinutos = servico.duracaoMinutos;

  if (precoCentavos === undefined) {
    precoCentavos = servico.precocentavos;
  }

  if (precoCentavos === undefined || precoCentavos === null) {
    precoCentavos = Math.round(Number(servico.preco || 0) * 100);
  }

  if (duracaoMinutos === undefined) {
    duracaoMinutos = servico.duracaominutos;
  }

  if (duracaoMinutos === undefined || duracaoMinutos === null) {
    duracaoMinutos = 30;
  }

  servico.precoCentavos = Number(precoCentavos);
  servico.duracaoMinutos = Number(duracaoMinutos);

  return servico;
}

// Formata o preco enquanto o usuario digita.
function formatarCampoPreco() {
  const numeros = campoPreco.value.replace(/\D/g, "");
  const centavos = Number(numeros || 0);

  campoPreco.value = formatarPreco(centavos);
}

// Deixa somente os numeros da duracao.
function limparCampoDuracao() {
  campoDuracao.value = campoDuracao.value.replace(/\D/g, "");
}

function formatarCampoDuracao() {
  // Exibe a duracao com a unidade usada no formulario.
  const minutos = campoDuracao.value.replace(/\D/g, "");

  if (minutos) {
    campoDuracao.value = `${Number(minutos)} min`;
  } else {
    campoDuracao.value = "";
  }
}

function montarDadosServico() {
  // Monta os dados enviados para cadastro ou edicao.
  return {
    empresaId: obterEmpresaId(),
    nome: obterValor("nome-servico"),
    categoria: obterValor("categoria-servico"),
    preco: obterValor("preco-servico"),
    duracao: obterValor("duracao-servico"),
    descricao: obterValor("descricao-servico"),
    status: obterValor("status-servico"),
  };
}

// Confere os campos obrigatorios do formulario.
function validarFormularioServico(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada. Cadastre ou acesse a empresa antes de gerenciar servicos.";
  }

  if (!dados.nome || !dados.categoria || !dados.preco || !dados.duracao) {
    return "Preencha nome, categoria, preco e duracao.";
  }

  return null;
}

function limparFormulario() {
  // Retorna o formulario para o modo de novo cadastro.
  formServico.reset();
  servicoEmEdicaoId = null;
  botaoSalvarServico.textContent = "Cadastrar serviço";
}

// Verifica se a categoria do servico ainda existe na lista.
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

// Preenche o formulario para editar um servico.
function preencherFormularioParaEdicao(servico) {
  servico = normalizarServico(servico);

  document.getElementById("nome-servico").value = servico.nome;
  adicionarCategoriaAntiga(servico.categoria);
  campoCategoria.value = servico.categoria;
  document.getElementById("preco-servico").value = formatarPreco(
    servico.precoCentavos
  );
  document.getElementById(
    "duracao-servico"
  ).value = `${servico.duracaoMinutos} min`;
  document.getElementById("descricao-servico").value =
    servico.descricao || "";
  document.getElementById("status-servico").value = servico.status;

  servicoEmEdicaoId = servico.id;
  botaoSalvarServico.textContent = "Salvar alterações";
}

function obterTextoStatus(status) {
  // Traduz o status salvo para o texto da tabela.
  if (status === "ativo") {
    return "Ativo";
  }

  return "Inativo";
}

// Monta uma linha da tabela com os botoes de acao.
function criarLinhaServico(servico) {
  servico = normalizarServico(servico);

  const linha = document.createElement("tr");

  linha.innerHTML = `
    <td>${servico.nome}</td>
    <td>${servico.categoria}</td>
    <td>${formatarPreco(servico.precoCentavos)}</td>
    <td>${servico.duracaoMinutos} min</td>
    <td>${servico.descricao || "-"}</td>
    <td>${obterTextoStatus(servico.status)}</td>
    <td class="acoes">
      <button class="btn-outline" type="button" data-acao="editar">Editar</button>
      <button class="btn-outline" type="button" data-acao="excluir">Excluir</button>
    </td>
  `;

  const botaoEditar = linha.querySelector("[data-acao='editar']");
  const botaoExcluir = linha.querySelector("[data-acao='excluir']");

  botaoEditar.addEventListener("click", function () {
    preencherFormularioParaEdicao(servico);
  });

  botaoExcluir.addEventListener("click", function () {
    excluirServico(servico.id);
  });

  return linha;
}

// Busca os servicos cadastrados pela empresa.
async function carregarServicos() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    tabelaServicos.innerHTML = `
      <tr>
        <td colspan="7">Cadastre uma empresa antes de gerenciar serviços.</td>
      </tr>
    `;
    return;
  }

  try {
    const resposta = await fetch(
      `${API_SERVICOS_URL}?empresaId=${empresaId}`
    );
    const servicos = await resposta.json();

    tabelaServicos.innerHTML = "";

    if (servicos.length === 0) {
      tabelaServicos.innerHTML = `
        <tr>
          <td colspan="7">Nenhum serviço cadastrado.</td>
        </tr>
      `;
      return;
    }

    for (const servico of servicos) {
      tabelaServicos.appendChild(criarLinhaServico(servico));
    }
  } catch (error) {
    console.error("Erro ao carregar servicos:", error);
    alert("Nao foi possivel carregar os servicos.");
  }
}

// Define a rota e o metodo conforme cadastro ou edicao.
function obterDadosDaRequisicao() {
  if (servicoEmEdicaoId) {
    return {
      url: `${API_SERVICOS_URL}/${servicoEmEdicaoId}`,
      metodo: "PUT",
      textoBotao: "Salvando...",
    };
  }

  return {
    url: API_SERVICOS_URL,
    metodo: "POST",
    textoBotao: "Cadastrando...",
  };
}

async function salvarServico(event) {
  // Salva o servico e recarrega a listagem.
  event.preventDefault();

  const dados = montarDadosServico();
  const erroValidacao = validarFormularioServico(dados);

  if (erroValidacao) {
    alert(erroValidacao);
    return;
  }

  const requisicao = obterDadosDaRequisicao();
  botaoSalvarServico.disabled = true;
  botaoSalvarServico.textContent = requisicao.textoBotao;

  try {
    const resposta = await fetch(requisicao.url, {
      method: requisicao.metodo,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert(resultado.message || "Nao foi possivel salvar o servico.");
      return;
    }

    alert(resultado.message);
    limparFormulario();
    await carregarServicos();
  } catch (error) {
    console.error("Erro ao salvar servico:", error);
    alert("Nao foi possivel conectar ao servidor.");
  } finally {
    botaoSalvarServico.disabled = false;

    if (servicoEmEdicaoId) {
      botaoSalvarServico.textContent = "Salvar alterações";
    } else {
      botaoSalvarServico.textContent = "Cadastrar serviço";
    }
  }
}

// Exclui o servico depois da confirmacao.
async function excluirServico(id) {
  const confirmarExclusao = confirm(
    "Deseja realmente excluir este servico?"
  );

  if (!confirmarExclusao) {
    return;
  }

  try {
    const empresaId = obterEmpresaId();
    const resposta = await fetch(
      `${API_SERVICOS_URL}/${id}?empresaId=${empresaId}`,
      {
        method: "DELETE",
      }
    );

    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert(resultado.message || "Nao foi possivel excluir o servico.");
      return;
    }

    alert(resultado.message);
    await carregarServicos();
  } catch (error) {
    console.error("Erro ao excluir servico:", error);
    alert("Nao foi possivel conectar ao servidor.");
  }
}

if (formServico) {
  // Intercepta o envio do formulario para usar a API.
  formServico.addEventListener("submit", salvarServico);
}

if (campoPreco) {
  // Aplica a mascara de moeda durante a digitacao.
  campoPreco.addEventListener("input", formatarCampoPreco);
}

if (campoDuracao) {
  // Mantem a duracao em minutos mesmo enquanto o usuario edita.
  campoDuracao.addEventListener("focus", limparCampoDuracao);
  campoDuracao.addEventListener("input", limparCampoDuracao);
  campoDuracao.addEventListener("blur", formatarCampoDuracao);
}

// As categorias devem aparecer antes dos servicos.
carregarCategorias().finally(carregarServicos);
