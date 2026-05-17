const API_BLOQUEIOS_URL = "http://localhost:3000/api/bloqueios-horarios";
const API_PROFISSIONAIS_URL = "http://localhost:3000/api/profissionais";

// Captura os elementos principais da tela de bloqueio de horarios.
const formBloqueio = document.querySelector("form");
const tabelaBloqueios = document.querySelector("tbody");
const botaoBloquearHorario = formBloqueio?.querySelector("button[type='submit']");
const selectProfissional = document.getElementById("bloqueio-profissional");

// Busca o ID da empresa salvo no navegador enquanto o login ainda nao esta integrado.
function obterEmpresaId() {
  return localStorage.getItem("agendaRosaEmpresaId");
}

// Busca o valor de um campo pelo ID e remove espacos extras.
function obterValor(id) {
  return document.getElementById(id)?.value.trim() || "";
}

// Busca o texto visivel da opcao selecionada no campo de profissional.
function obterNomeProfissionalSelecionado() {
  return selectProfissional?.options[selectProfissional.selectedIndex]?.textContent.trim() || "";
}

// Carrega os profissionais ativos cadastrados na tela de profissionais.
async function carregarProfissionais() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    selectProfissional.innerHTML = '<option value="">Empresa nao identificada</option>';
    return;
  }

  try {
    const resposta = await fetch(
      `${API_PROFISSIONAIS_URL}?empresaId=${empresaId}&somenteAtivos=true`
    );
    const profissionais = await resposta.json();

    selectProfissional.innerHTML = "";

    if (profissionais.length === 0) {
      selectProfissional.innerHTML = '<option value="">Nenhum profissional cadastrado</option>';
      return;
    }

    profissionais.forEach((profissional) => {
      const opcao = document.createElement("option");
      opcao.value = profissional.id;
      opcao.textContent = profissional.nome;
      selectProfissional.appendChild(opcao);
    });
  } catch (error) {
    console.error("Erro ao carregar profissionais:", error);
    selectProfissional.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

// Monta o objeto de bloqueio que sera enviado para a API.
function montarDadosBloqueio() {
  return {
    empresaId: obterEmpresaId(),
    profissionalId: obterValor("bloqueio-profissional"),
    profissionalNome: obterNomeProfissionalSelecionado(),
    dataBloqueio: obterValor("data-bloqueio"),
    horarioInicio: obterValor("bloqueio-horario-inicial"),
    horarioFim: obterValor("bloqueio-horario-final"),
    motivo: obterValor("motivo-bloqueio"),
  };
}

// Valida os campos obrigatorios antes de chamar o back-end.
function validarFormularioBloqueio(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada. Cadastre ou acesse a empresa antes de bloquear horarios.";
  }

  if (!dados.dataBloqueio || !dados.horarioInicio || !dados.horarioFim) {
    return "Preencha data, horario inicial e horario final.";
  }

  if (!dados.profissionalId) {
    return "Selecione um profissional para bloquear o horario.";
  }

  if (dados.horarioInicio >= dados.horarioFim) {
    return "O horario inicial deve ser menor que o horario final.";
  }

  return null;
}

// Cria uma linha da tabela para um bloqueio retornado pela API.
function criarLinhaBloqueio(bloqueio) {
  const linha = document.createElement("tr");

  linha.innerHTML = `
    <td>${bloqueio.dataBloqueio}</td>
    <td>${bloqueio.horarioInicio}</td>
    <td>${bloqueio.horarioFim}</td>
    <td>${bloqueio.motivo || "-"}</td>
    <td>${bloqueio.profissionalNome || "Todos"}</td>
    <td>
      <button type="button" class="btn-outline" data-acao="remover">Remover bloqueio</button>
    </td>
  `;

  // Liga o botao da linha a remocao do bloqueio correspondente.
  linha.querySelector("[data-acao='remover']").addEventListener("click", () => {
    excluirBloqueio(bloqueio.id);
  });

  return linha;
}

// Busca os bloqueios da empresa e atualiza a tabela.
async function carregarBloqueios() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    tabelaBloqueios.innerHTML = `
      <tr>
        <td colspan="6">Cadastre uma empresa antes de gerenciar bloqueios.</td>
      </tr>
    `;
    return;
  }

  try {
    const resposta = await fetch(`${API_BLOQUEIOS_URL}?empresaId=${empresaId}`);
    const bloqueios = await resposta.json();

    tabelaBloqueios.innerHTML = "";

    if (bloqueios.length === 0) {
      tabelaBloqueios.innerHTML = `
        <tr>
          <td colspan="6">Nenhum horario bloqueado.</td>
        </tr>
      `;
      return;
    }

    bloqueios.forEach((bloqueio) => {
      tabelaBloqueios.appendChild(criarLinhaBloqueio(bloqueio));
    });
  } catch (error) {
    console.error("Erro ao carregar bloqueios:", error);
    alert("Nao foi possivel carregar os bloqueios.");
  }
}

// Envia um novo bloqueio de horario para a API.
async function cadastrarBloqueio(event) {
  event.preventDefault();

  const dados = montarDadosBloqueio();
  const erroValidacao = validarFormularioBloqueio(dados);

  if (erroValidacao) {
    alert(erroValidacao);
    return;
  }

  botaoBloquearHorario.disabled = true;
  botaoBloquearHorario.textContent = "Bloqueando...";

  try {
    const resposta = await fetch(API_BLOQUEIOS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert(resultado.message || "Nao foi possivel cadastrar o bloqueio.");
      return;
    }

    alert(resultado.message);
    formBloqueio.reset();
    await carregarBloqueios();
  } catch (error) {
    console.error("Erro ao cadastrar bloqueio:", error);
    alert("Nao foi possivel conectar ao servidor.");
  } finally {
    botaoBloquearHorario.disabled = false;
    botaoBloquearHorario.textContent = "Bloquear horário";
  }
}

// Remove um bloqueio depois da confirmacao do usuario.
async function excluirBloqueio(id) {
  const confirmarExclusao = confirm("Deseja realmente remover este bloqueio?");

  if (!confirmarExclusao) {
    return;
  }

  try {
    const empresaId = obterEmpresaId();
    const resposta = await fetch(`${API_BLOQUEIOS_URL}/${id}?empresaId=${empresaId}`, {
      method: "DELETE",
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert(resultado.message || "Nao foi possivel remover o bloqueio.");
      return;
    }

    alert(resultado.message);
    await carregarBloqueios();
  } catch (error) {
    console.error("Erro ao remover bloqueio:", error);
    alert("Nao foi possivel conectar ao servidor.");
  }
}

// Liga o submit do formulario a funcao de cadastro de bloqueio.
formBloqueio?.addEventListener("submit", cadastrarBloqueio);

// Carrega os bloqueios ja cadastrados quando a pagina abre.
carregarProfissionais();
carregarBloqueios();
