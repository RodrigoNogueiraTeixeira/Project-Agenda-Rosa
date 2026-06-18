const API_PROFISSIONAIS_URL = "/api/empresa/profissionais";
const API_SERVICOS_URL = "/api/empresa/servicos";

// Elementos principais da tela.
const formProfissional = document.getElementById("form-profissional");
const tabelaProfissionais = document.querySelector("tbody");
const botaoSalvarProfissional = formProfissional
  ? formProfissional.querySelector("button[type='submit']")
  : null;
const listaServicos = document.getElementById("servicos-profissional");

let profissionalEmEdicaoId = null;

// Recupera a empresa logada antes de consultar profissionais.
function obterEmpresaId() {
  const empresaId = localStorage.getItem("empresaId");

  if (!empresaId) {
    window.location.href = "../../login/html/login.html";
    return null;
  }

  return empresaId;
}

// Busca o valor de um campo e remove espacos das pontas.
function obterValor(id) {
  const campo = document.getElementById(id);

  if (!campo) {
    return "";
  }

  return campo.value.trim();
}

// Le os servicos marcados no cadastro do profissional.
function obterServicosSelecionados() {
  const servicosIds = [];
  const campos = listaServicos.querySelectorAll(
    "input[type='checkbox']:checked"
  );

  for (const campo of campos) {
    servicosIds.push(Number(campo.value));
  }

  return servicosIds;
}

function montarDadosProfissional() {
  // Monta o corpo enviado para cadastro ou edicao.
  return {
    empresaId: obterEmpresaId(),
    nome: obterValor("nome-profissional"),
    telefone: obterValor("telefone-profissional"),
    email: obterValor("email-profissional"),
    servicosIds: obterServicosSelecionados(),
    status: obterValor("status-profissional"),
  };
}

// Confere os campos antes de enviar para o backend.
function validarFormularioProfissional(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada. Cadastre ou acesse a empresa antes de gerenciar profissionais.";
  }

  if (!dados.nome) {
    return "Informe o nome do profissional.";
  }

  if (dados.email && !dados.email.includes("@")) {
    return "Informe um e-mail valido para o profissional.";
  }

  if (dados.servicosIds.length === 0) {
    return "Selecione pelo menos um servico atendido pelo profissional.";
  }

  return null;
}

// Carrega os servicos cadastrados pela empresa.
async function carregarServicos() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    return;
  }

  try {
    const resposta = await fetch(
      `${API_SERVICOS_URL}?empresaId=${empresaId}`
    );
    const servicos = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        servicos.message || "Nao foi possivel carregar os servicos."
      );
    }

    listaServicos.innerHTML = "";

    if (servicos.length === 0) {
      listaServicos.innerHTML =
        "<p>Cadastre um serviço antes de cadastrar profissionais.</p>";
      return;
    }

    for (const servico of servicos) {
      const opcao = document.createElement("label");
      opcao.className = "opcao-servico";

      const campo = document.createElement("input");
      campo.type = "checkbox";
      campo.value = servico.id;

      const texto = document.createElement("span");
      texto.textContent = servico.nome;

      opcao.appendChild(campo);
      opcao.appendChild(texto);
      listaServicos.appendChild(opcao);
    }
  } catch (error) {
    console.error("Erro ao carregar servicos:", error);
    listaServicos.innerHTML = "<p>Erro ao carregar serviços.</p>";
  }
}

function limparFormulario() {
  // Volta o formulario para o modo de cadastro.
  formProfissional.reset();
  profissionalEmEdicaoId = null;
  botaoSalvarProfissional.textContent = "Cadastrar profissional";
}

function obterTextoStatus(profissional) {
  // Traduz o campo ativo para o texto exibido na tabela.
  if (profissional.ativo) {
    return "Ativo";
  }

  return "Inativo";
}

function marcarServicosDoProfissional(servicos) {
  // Marca os servicos ja vinculados ao profissional em edicao.
  const campos = listaServicos.querySelectorAll("input[type='checkbox']");

  for (const campo of campos) {
    campo.checked = false;

    for (const servico of servicos || []) {
      if (Number(campo.value) === Number(servico.id)) {
        campo.checked = true;
        break;
      }
    }
  }
}

// Preenche o formulario para editar um profissional.
function preencherFormularioParaEdicao(profissional) {
  document.getElementById("nome-profissional").value = profissional.nome;
  document.getElementById("telefone-profissional").value =
    profissional.telefone || "";
  document.getElementById("email-profissional").value =
    profissional.email || "";
  document.getElementById("status-profissional").value =
    profissional.ativo ? "ativo" : "inativo";
  marcarServicosDoProfissional(profissional.servicos);

  profissionalEmEdicaoId = profissional.id;
  botaoSalvarProfissional.textContent = "Salvar alterações";
}

function obterNomesDosServicos(profissional) {
  // Junta os nomes dos servicos em uma unica celula.
  const nomes = [];

  for (const servico of profissional.servicos || []) {
    nomes.push(servico.nome);
  }

  if (nomes.length === 0) {
    return "-";
  }

  return nomes.join(", ");
}

// Monta uma linha da tabela com os botoes de acao.
function criarLinhaProfissional(profissional) {
  const linha = document.createElement("tr");

  linha.innerHTML = `
    <td>${profissional.nome}</td>
    <td>${profissional.telefone || "-"}</td>
    <td>${profissional.email || "-"}</td>
    <td>${obterNomesDosServicos(profissional)}</td>
    <td>${obterTextoStatus(profissional)}</td>
    <td class="acoes">
      <button type="button" class="btn-outline" data-acao="editar">Editar</button>
      <button type="button" class="btn-outline" data-acao="excluir">Excluir</button>
    </td>
  `;

  linha
    .querySelector("[data-acao='editar']")
    .addEventListener("click", function () {
      preencherFormularioParaEdicao(profissional);
    });

  linha
    .querySelector("[data-acao='excluir']")
    .addEventListener("click", function () {
      excluirProfissional(profissional.id);
    });

  return linha;
}

// Carrega os profissionais cadastrados pela empresa.
async function carregarProfissionais() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    return;
  }

  try {
    const resposta = await fetch(
      `${API_PROFISSIONAIS_URL}?empresaId=${empresaId}`
    );
    const profissionais = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        profissionais.message || "Nao foi possivel carregar os profissionais."
      );
    }

    tabelaProfissionais.innerHTML = "";

    if (profissionais.length === 0) {
      tabelaProfissionais.innerHTML = `
        <tr>
          <td colspan="6">Nenhum profissional cadastrado.</td>
        </tr>
      `;
      return;
    }

    for (const profissional of profissionais) {
      tabelaProfissionais.appendChild(
        criarLinhaProfissional(profissional)
      );
    }
  } catch (error) {
    console.error("Erro ao carregar profissionais:", error);
    alert("Nao foi possivel carregar os profissionais.");
  }
}

function obterDadosDaRequisicao() {
  // Alterna entre cadastro e atualizacao conforme o modo atual.
  if (profissionalEmEdicaoId) {
    return {
      url: `${API_PROFISSIONAIS_URL}/${profissionalEmEdicaoId}`,
      metodo: "PUT",
      textoBotao: "Salvando...",
    };
  }

  return {
    url: API_PROFISSIONAIS_URL,
    metodo: "POST",
    textoBotao: "Cadastrando...",
  };
}

async function salvarProfissional(event) {
  // Salva o profissional e atualiza a tabela.
  event.preventDefault();

  const dados = montarDadosProfissional();
  const erroValidacao = validarFormularioProfissional(dados);

  if (erroValidacao) {
    alert(erroValidacao);
    return;
  }

  const requisicao = obterDadosDaRequisicao();
  botaoSalvarProfissional.disabled = true;
  botaoSalvarProfissional.textContent = requisicao.textoBotao;

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
      alert(
        resultado.message || "Nao foi possivel salvar o profissional."
      );
      return;
    }

    alert(resultado.message);
    limparFormulario();
    await carregarProfissionais();
  } catch (error) {
    console.error("Erro ao salvar profissional:", error);
    alert("Nao foi possivel conectar ao servidor.");
  } finally {
    botaoSalvarProfissional.disabled = false;

    if (profissionalEmEdicaoId) {
      botaoSalvarProfissional.textContent = "Salvar alterações";
    } else {
      botaoSalvarProfissional.textContent = "Cadastrar profissional";
    }
  }
}

async function excluirProfissional(id) {
  // Remove o profissional depois da confirmacao do usuario.
  if (!confirm("Deseja realmente excluir este profissional?")) {
    return;
  }

  try {
    const empresaId = obterEmpresaId();
    const resposta = await fetch(
      `${API_PROFISSIONAIS_URL}/${id}?empresaId=${empresaId}`,
      {
        method: "DELETE",
      }
    );
    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert(
        resultado.message || "Nao foi possivel excluir o profissional."
      );
      return;
    }

    alert(resultado.message);
    await carregarProfissionais();
  } catch (error) {
    console.error("Erro ao excluir profissional:", error);
    alert("Nao foi possivel conectar ao servidor.");
  }
}

if (formProfissional) {
  // Intercepta o envio do formulario para usar a API.
  formProfissional.addEventListener("submit", salvarProfissional);
}

carregarServicos().finally(carregarProfissionais);
