const API_PROFISSIONAIS_URL = "/api/empresa/profissionais";

// Captura os elementos principais da tela de profissionais.
const formProfissional = document.querySelector("#form-profissional");
const tabelaProfissionais = document.querySelector("tbody");
const botaoSalvarProfissional = formProfissional?.querySelector("button[type='submit']");

// Guarda o ID em edicao. Quando for null, o formulario cadastra um novo profissional.
let profissionalEmEdicaoId = null;

// Busca o ID salvo no login e impede acesso sem empresa identificada.
function obterEmpresaId() {
  const empresaId = localStorage.getItem("empresaId");

  if (!empresaId) {
    window.location.href = "../../login/html/login.html";
    return null;
  }

  return empresaId;
}

// Busca o valor de um campo pelo ID.
function obterValor(id) {
  return document.getElementById(id)?.value.trim() || "";
}

// Monta os dados do profissional para enviar para a API.
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

// Valida os campos obrigatorios da tela.
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

// Limpa o formulario e volta para o modo de cadastro.
function limparFormulario() {
  formProfissional.reset();
  profissionalEmEdicaoId = null;
  botaoSalvarProfissional.textContent = "Cadastrar profissional";
}

// Preenche o formulario para editar um profissional.
function preencherFormularioParaEdicao(profissional) {
  document.getElementById("nome-profissional").value = profissional.nome;
  document.getElementById("telefone-profissional").value = profissional.telefone || "";
  document.getElementById("email-profissional").value = profissional.email || "";
  document.getElementById("especialidade-profissional").value = profissional.especialidade || "";
  document.getElementById("status-profissional").value = profissional.ativo ? "ativo" : "inativo";

  profissionalEmEdicaoId = profissional.id;
  botaoSalvarProfissional.textContent = "Salvar alterações";
}

// Cria uma linha da tabela com os dados do profissional.
function criarLinhaProfissional(profissional) {
  const linha = document.createElement("tr");

  linha.innerHTML = `
    <td>${profissional.nome}</td>
    <td>${profissional.telefone || "-"}</td>
    <td>${profissional.email || "-"}</td>
    <td>${profissional.especialidade || "-"}</td>
    <td>${profissional.ativo ? "Ativo" : "Inativo"}</td>
    <td class="acoes">
      <button type="button" class="btn-outline" data-acao="editar">Editar</button>
      <button type="button" class="btn-outline" data-acao="excluir">Excluir</button>
    </td>
  `;

  // Liga o botao Editar ao preenchimento do formulario.
  linha.querySelector("[data-acao='editar']").addEventListener("click", () => {
    preencherFormularioParaEdicao(profissional);
  });

  // Liga o botao Excluir a remocao do profissional.
  linha.querySelector("[data-acao='excluir']").addEventListener("click", () => {
    excluirProfissional(profissional.id);
  });

  return linha;
}

// Carrega os profissionais cadastrados no banco.
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
    const resposta = await fetch(`${API_PROFISSIONAIS_URL}?empresaId=${empresaId}`);
    const profissionais = await resposta.json();

    if (!resposta.ok) {
      throw new Error(profissionais.message || "Nao foi possivel carregar os profissionais.");
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

    profissionais.forEach((profissional) => {
      tabelaProfissionais.appendChild(criarLinhaProfissional(profissional));
    });
  } catch (error) {
    console.error("Erro ao carregar profissionais:", error);
    alert("Nao foi possivel carregar os profissionais.");
  }
}

// Cadastra ou atualiza um profissional.
async function salvarProfissional(event) {
  event.preventDefault();

  const dados = montarDadosProfissional();
  const erroValidacao = validarFormularioProfissional(dados);

  if (erroValidacao) {
    alert(erroValidacao);
    return;
  }

  const url = profissionalEmEdicaoId
    ? `${API_PROFISSIONAIS_URL}/${profissionalEmEdicaoId}`
    : API_PROFISSIONAIS_URL;
  const metodo = profissionalEmEdicaoId ? "PUT" : "POST";

  botaoSalvarProfissional.disabled = true;
  botaoSalvarProfissional.textContent = profissionalEmEdicaoId ? "Salvando..." : "Cadastrando...";

  try {
    const resposta = await fetch(url, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert(resultado.message || "Nao foi possivel salvar o profissional.");
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
    botaoSalvarProfissional.textContent = profissionalEmEdicaoId
      ? "Salvar alterações"
      : "Cadastrar profissional";
  }
}

// Remove um profissional depois da confirmacao do usuario.
async function excluirProfissional(id) {
  if (!confirm("Deseja realmente excluir este profissional?")) {
    return;
  }

  try {
    const empresaId = obterEmpresaId();
    const resposta = await fetch(`${API_PROFISSIONAIS_URL}/${id}?empresaId=${empresaId}`, {
      method: "DELETE",
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert(resultado.message || "Nao foi possivel excluir o profissional.");
      return;
    }

    alert(resultado.message);
    await carregarProfissionais();
  } catch (error) {
    console.error("Erro ao excluir profissional:", error);
    alert("Nao foi possivel conectar ao servidor.");
  }
}

// Liga o formulario a funcao de salvar.
formProfissional?.addEventListener("submit", salvarProfissional);

// Carrega a tabela quando a pagina abre.
carregarProfissionais();
