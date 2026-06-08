const API_PROFISSIONAIS_URL = "/api/empresa/profissionais";

// Elementos principais da tela.
const formProfissional = document.getElementById("form-profissional");
const tabelaProfissionais = document.querySelector("tbody");
const botaoSalvarProfissional = formProfissional
  ? formProfissional.querySelector("button[type='submit']")
  : null;

let profissionalEmEdicaoId = null;

function obterEmpresaId() {
  const empresaId = localStorage.getItem("empresaId");

  if (!empresaId) {
    window.location.href = "../../login/html/login.html";
    return null;
  }

  return empresaId;
}

function obterValor(id) {
  const campo = document.getElementById(id);

  if (!campo) {
    return "";
  }

  return campo.value.trim();
}

function montarDadosProfissional() {
  return {
    empresaId: obterEmpresaId(),
    nome: obterValor("nome-profissional"),
    telefone: obterValor("telefone-profissional"),
    email: obterValor("email-profissional"),
    especialidade: obterValor("especialidade-profissional"),
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

  return null;
}

function limparFormulario() {
  formProfissional.reset();
  profissionalEmEdicaoId = null;
  botaoSalvarProfissional.textContent = "Cadastrar profissional";
}

function obterStatusDoProfissional(profissional) {
  if (profissional.ativo) {
    return "ativo";
  }

  return "inativo";
}

function obterTextoStatus(profissional) {
  if (profissional.ativo) {
    return "Ativo";
  }

  return "Inativo";
}

// Preenche o formulario para editar um profissional.
function preencherFormularioParaEdicao(profissional) {
  document.getElementById("nome-profissional").value = profissional.nome;
  document.getElementById("telefone-profissional").value =
    profissional.telefone || "";
  document.getElementById("email-profissional").value =
    profissional.email || "";
  document.getElementById("especialidade-profissional").value =
    profissional.especialidade || "";
  document.getElementById("status-profissional").value =
    obterStatusDoProfissional(profissional);

  profissionalEmEdicaoId = profissional.id;
  botaoSalvarProfissional.textContent = "Salvar alterações";
}

// Monta uma linha da tabela com os botoes de acao.
function criarLinhaProfissional(profissional) {
  const linha = document.createElement("tr");

  linha.innerHTML = `
    <td>${profissional.nome}</td>
    <td>${profissional.telefone || "-"}</td>
    <td>${profissional.email || "-"}</td>
    <td>${profissional.especialidade || "-"}</td>
    <td>${obterTextoStatus(profissional)}</td>
    <td class="acoes">
      <button type="button" class="btn-outline" data-acao="editar">Editar</button>
      <button type="button" class="btn-outline" data-acao="excluir">Excluir</button>
    </td>
  `;

  const botaoEditar = linha.querySelector("[data-acao='editar']");
  const botaoExcluir = linha.querySelector("[data-acao='excluir']");

  botaoEditar.addEventListener("click", function () {
    preencherFormularioParaEdicao(profissional);
  });

  botaoExcluir.addEventListener("click", function () {
    excluirProfissional(profissional.id);
  });

  return linha;
}

// Carrega os profissionais cadastrados pela empresa.
async function carregarProfissionais() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    tabelaProfissionais.innerHTML = `
      <tr>
        <td colspan="6">Cadastre uma empresa antes de gerenciar profissionais.</td>
      </tr>
    `;
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
      const linha = criarLinhaProfissional(profissional);
      tabelaProfissionais.appendChild(linha);
    }
  } catch (error) {
    console.error("Erro ao carregar profissionais:", error);
    alert("Nao foi possivel carregar os profissionais.");
  }
}

// Define a rota e o metodo de cadastro ou edicao.
function obterDadosDaRequisicao() {
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

// Exclui o profissional depois da confirmacao.
async function excluirProfissional(id) {
  const confirmarExclusao = confirm(
    "Deseja realmente excluir este profissional?"
  );

  if (!confirmarExclusao) {
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
  formProfissional.addEventListener("submit", salvarProfissional);
}

carregarProfissionais();
