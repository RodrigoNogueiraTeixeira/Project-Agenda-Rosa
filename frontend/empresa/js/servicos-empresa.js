const API_SERVICOS_URL = "/api/empresa/servicos";

// Captura os elementos principais da tela de servicos.
const formServico = document.querySelector(".form-grid");
const tabelaServicos = document.querySelector("tbody");
const botaoSalvarServico = formServico?.querySelector("button[type='submit']");

// Guarda o ID do servico em edicao. Quando for null, o formulario cria um novo servico.
let servicoEmEdicaoId = null;

// Busca o ID da empresa salvo no navegador durante o cadastro.
function obterEmpresaId() {
  return localStorage.getItem("empresaId");
}

// Busca o valor de um campo pelo ID.
function obterValor(id) {
  return document.getElementById(id)?.value.trim() || "";
}

// Converte centavos vindos do banco para formato de moeda brasileira.
function formatarPreco(precoCentavos) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(precoCentavos / 100);
}

// Monta o objeto de servico que sera enviado para a API.
function montarDadosServico() {
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

// Valida os campos obrigatorios antes de chamar o back-end.
function validarFormularioServico(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada. Cadastre ou acesse a empresa antes de gerenciar servicos.";
  }

  if (!dados.nome || !dados.categoria || !dados.preco || !dados.duracao) {
    return "Preencha nome, categoria, preco e duracao.";
  }

  return null;
}

// Limpa o formulario e volta para o modo de cadastro.
function limparFormulario() {
  formServico.reset();
  servicoEmEdicaoId = null;
  botaoSalvarServico.textContent = "Cadastrar serviço";
}

// Preenche o formulario com os dados escolhidos para edicao.
function preencherFormularioParaEdicao(servico) {
  document.getElementById("nome-servico").value = servico.nome;
  document.getElementById("categoria-servico").value = servico.categoria;
  document.getElementById("preco-servico").value = formatarPreco(servico.precoCentavos);
  document.getElementById("duracao-servico").value = `${servico.duracaoMinutos} min`;
  document.getElementById("descricao-servico").value = servico.descricao || "";
  document.getElementById("status-servico").value = servico.status;

  servicoEmEdicaoId = servico.id;
  botaoSalvarServico.textContent = "Salvar alterações";
}

// Cria uma linha da tabela para um servico retornado pela API.
function criarLinhaServico(servico) {
  const linha = document.createElement("tr");

  linha.innerHTML = `
    <td>${servico.nome}</td>
    <td>${servico.categoria}</td>
    <td>${formatarPreco(servico.precoCentavos)}</td>
    <td>${servico.duracaoMinutos} min</td>
    <td>${servico.descricao || "-"}</td>
    <td>${servico.status === "ativo" ? "Ativo" : "Inativo"}</td>
    <td class="acoes">
      <button class="btn-outline" type="button" data-acao="editar">Editar</button>
      <button class="btn-outline" type="button" data-acao="excluir">Excluir</button>
    </td>
  `;

  // Liga o botao Editar ao preenchimento do formulario.
  linha.querySelector("[data-acao='editar']").addEventListener("click", () => {
    preencherFormularioParaEdicao(servico);
  });

  // Liga o botao Excluir a chamada DELETE da API.
  linha.querySelector("[data-acao='excluir']").addEventListener("click", () => {
    excluirServico(servico.id);
  });

  return linha;
}

// Busca todos os servicos da empresa e atualiza a tabela da tela.
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
    const resposta = await fetch(`${API_SERVICOS_URL}?empresaId=${empresaId}`);
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

    servicos.forEach((servico) => {
      tabelaServicos.appendChild(criarLinhaServico(servico));
    });
  } catch (error) {
    console.error("Erro ao carregar servicos:", error);
    alert("Nao foi possivel carregar os servicos.");
  }
}

// Cadastra um novo servico ou atualiza um servico existente.
async function salvarServico(event) {
  event.preventDefault();

  const dados = montarDadosServico();
  const erroValidacao = validarFormularioServico(dados);

  if (erroValidacao) {
    alert(erroValidacao);
    return;
  }

  const url = servicoEmEdicaoId
    ? `${API_SERVICOS_URL}/${servicoEmEdicaoId}`
    : API_SERVICOS_URL;

  const metodo = servicoEmEdicaoId ? "PUT" : "POST";

  botaoSalvarServico.disabled = true;
  botaoSalvarServico.textContent = servicoEmEdicaoId ? "Salvando..." : "Cadastrando...";

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
    botaoSalvarServico.textContent = servicoEmEdicaoId ? "Salvar alterações" : "Cadastrar serviço";
  }
}

// Exclui um servico depois da confirmacao do usuario.
async function excluirServico(id) {
  const confirmarExclusao = confirm("Deseja realmente excluir este servico?");

  if (!confirmarExclusao) {
    return;
  }

  try {
    const empresaId = obterEmpresaId();
    const resposta = await fetch(`${API_SERVICOS_URL}/${id}?empresaId=${empresaId}`, {
      method: "DELETE",
    });

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

// Liga o submit do formulario a funcao de salvar.
formServico?.addEventListener("submit", salvarServico);

// Carrega os servicos assim que a tela e aberta.
carregarServicos();
