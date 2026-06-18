const API_BLOQUEIOS_URL = "/api/empresa/bloqueios-horarios";
const API_PROFISSIONAIS_URL = "/api/empresa/profissionais";

// Elementos principais da tela.
const formBloqueio = document.querySelector("form");
const tabelaBloqueios = document.querySelector("tbody");
const botaoBloquearHorario = formBloqueio
  ? formBloqueio.querySelector("button[type='submit']")
  : null;
const selectProfissional = document.getElementById(
  "bloqueio-profissional"
);

// Recupera a empresa logada antes de gerenciar bloqueios.
function obterEmpresaId() {
  const empresaId = localStorage.getItem("empresaId");

  if (!empresaId) {
    window.location.href = "../../login/html/login.html";
    return null;
  }

  return empresaId;
}

// Retorna o valor do campo informado, ja sem espacos extras.
function obterValor(id) {
  const campo = document.getElementById(id);

  if (!campo) {
    return "";
  }

  return campo.value.trim();
}

// Guarda o nome exibido no select para facilitar a listagem.
function obterNomeProfissionalSelecionado() {
  if (!selectProfissional) {
    return "";
  }

  const opcao = selectProfissional.options[selectProfissional.selectedIndex];

  if (!opcao) {
    return "";
  }

  return opcao.textContent.trim();
}

// Carrega os profissionais ativos da empresa.
async function carregarProfissionais() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    selectProfissional.innerHTML =
      '<option value="">Empresa nao identificada</option>';
    return;
  }

  try {
    const resposta = await fetch(
      `${API_PROFISSIONAIS_URL}?empresaId=${empresaId}&somenteAtivos=true`
    );
    const profissionais = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        profissionais.message || "Nao foi possivel carregar os profissionais."
      );
    }

    selectProfissional.innerHTML = "";

    if (profissionais.length === 0) {
      selectProfissional.innerHTML =
        '<option value="">Nenhum profissional cadastrado</option>';
      return;
    }

    for (const profissional of profissionais) {
      const opcao = document.createElement("option");
      opcao.value = profissional.id;
      opcao.textContent = profissional.nome;
      selectProfissional.appendChild(opcao);
    }
  } catch (error) {
    console.error("Erro ao carregar profissionais:", error);
    selectProfissional.innerHTML =
      '<option value="">Erro ao carregar</option>';
  }
}

function montarDadosBloqueio() {
  // Reune os dados do formulario no formato esperado pela API.
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

// Confere os campos obrigatorios do bloqueio.
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

function formatarData(data) {
  // Converte a data do banco para o formato exibido na tabela.
  const partes = String(data || "").split("-");

  if (partes.length !== 3) {
    return "-";
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarHorario(horario) {
  // Mantem apenas hora e minuto no texto exibido.
  const valor = String(horario || "");

  if (!valor) {
    return "-";
  }

  return valor.slice(0, 5);
}

// Monta uma linha da tabela para o bloqueio.
function criarLinhaBloqueio(bloqueio) {
  const linha = document.createElement("tr");

  linha.innerHTML = `
    <td>${formatarData(bloqueio.dataBloqueio)}</td>
    <td>${formatarHorario(bloqueio.horarioInicio)}</td>
    <td>${formatarHorario(bloqueio.horarioFim)}</td>
    <td>${bloqueio.motivo || "-"}</td>
    <td>${bloqueio.profissionalNome || "Todos"}</td>
    <td>
      <button type="button" class="btn-outline" data-acao="remover">Remover bloqueio</button>
    </td>
  `;

  const botaoRemover = linha.querySelector("[data-acao='remover']");

  botaoRemover.addEventListener("click", function () {
    excluirBloqueio(bloqueio.id);
  });

  return linha;
}

// Busca os bloqueios cadastrados pela empresa.
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
    const resposta = await fetch(
      `${API_BLOQUEIOS_URL}?empresaId=${empresaId}`
    );
    const bloqueios = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        bloqueios.message || "Nao foi possivel carregar os bloqueios."
      );
    }

    tabelaBloqueios.innerHTML = "";

    if (bloqueios.length === 0) {
      tabelaBloqueios.innerHTML = `
        <tr>
          <td colspan="6">Nenhum horario bloqueado.</td>
        </tr>
      `;
      return;
    }

    for (const bloqueio of bloqueios) {
      const linha = criarLinhaBloqueio(bloqueio);
      tabelaBloqueios.appendChild(linha);
    }
  } catch (error) {
    console.error("Erro ao carregar bloqueios:", error);
    alert("Nao foi possivel carregar os bloqueios.");
  }
}

// Envia um novo bloqueio para o backend.
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
      alert(
        resultado.message || "Nao foi possivel cadastrar o bloqueio."
      );
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

// Remove o bloqueio depois da confirmacao.
async function excluirBloqueio(id) {
  const confirmarExclusao = confirm(
    "Deseja realmente remover este bloqueio?"
  );

  if (!confirmarExclusao) {
    return;
  }

  try {
    const empresaId = obterEmpresaId();
    const resposta = await fetch(
      `${API_BLOQUEIOS_URL}/${id}?empresaId=${empresaId}`,
      {
        method: "DELETE",
      }
    );

    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert(
        resultado.message || "Nao foi possivel remover o bloqueio."
      );
      return;
    }

    alert(resultado.message);
    await carregarBloqueios();
  } catch (error) {
    console.error("Erro ao remover bloqueio:", error);
    alert("Nao foi possivel conectar ao servidor.");
  }
}

if (formBloqueio) {
  formBloqueio.addEventListener("submit", cadastrarBloqueio);
}

// Impede a escolha de uma data passada.
const campoDataBloqueio = document.getElementById("data-bloqueio");

if (campoDataBloqueio) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  campoDataBloqueio.min = `${ano}-${mes}-${dia}`;
}

carregarProfissionais();
carregarBloqueios();
