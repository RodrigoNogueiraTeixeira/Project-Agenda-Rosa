
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

const API_HORARIOS_URL = "/api/empresa/horarios-funcionamento";

// Elementos principais da tela.
const linhasHorarios = document.querySelectorAll("[data-dia-semana]");
const botaoSalvarHorarios = document.querySelector(
  "[data-salvar-horarios]"
);

// Recupera a empresa logada antes de consultar os horarios.
function obterEmpresaId() {
  const empresaId = localStorage.getItem("empresaId");

  if (!empresaId) {
    window.location.href = "../../login/html/login.html";
    return null;
  }

  return empresaId;
}

// Facilita a busca de campos dentro de cada linha da tabela.
function obterCampo(linha, seletor) {
  return linha.querySelector(seletor);
}

// Habilita os campos quando a empresa abre no dia.
function atualizarCamposDaLinha(linha) {
  const campoAbre = obterCampo(linha, ".js-abre");
  const abre = campoAbre.value === "sim";
  const camposDeHorario = linha.querySelectorAll("input[type='time']");

  for (const campo of camposDeHorario) {
    campo.disabled = !abre;

    if (!abre) {
      campo.value = "";
    }
  }
}

// Le os horarios preenchidos em uma linha.
function montarHorarioDaLinha(linha) {
  const campoAbre = obterCampo(linha, ".js-abre");
  const abre = campoAbre.value === "sim";

  return {
    diaSemana: Number(linha.dataset.diaSemana),
    abre: abre,
    horarioAbertura: obterCampo(linha, ".js-abertura").value,
    horarioFechamento: obterCampo(linha, ".js-fechamento").value,
    intervaloInicio: obterCampo(linha, ".js-intervalo-inicio").value,
    intervaloFim: obterCampo(linha, ".js-intervalo-fim").value,
  };
}

function montarDadosHorarios() {
  // Agrupa os sete dias antes de enviar para o backend.
  const horarios = [];

  for (const linha of linhasHorarios) {
    horarios.push(montarHorarioDaLinha(linha));
  }

  return {
    empresaId: obterEmpresaId(),
    horarios: horarios,
  };
}

// Confere as regras de abertura e intervalo.
function validarHorarios(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada. Cadastre ou acesse a empresa antes de salvar horarios.";
  }

  for (const horario of dados.horarios) {
    if (
      horario.abre &&
      (!horario.horarioAbertura || !horario.horarioFechamento)
    ) {
      return "Dias abertos precisam ter horario de abertura e fechamento.";
    }

    if (
      horario.abre &&
      horario.horarioAbertura >= horario.horarioFechamento
    ) {
      return "O horario de abertura deve ser menor que o horario de fechamento.";
    }

    if (
      horario.intervaloInicio &&
      horario.intervaloFim &&
      horario.intervaloInicio >= horario.intervaloFim
    ) {
      return "O inicio do intervalo deve ser menor que o fim do intervalo.";
    }

    const informouInicio = Boolean(horario.intervaloInicio);
    const informouFim = Boolean(horario.intervaloFim);

    if (informouInicio !== informouFim) {
      return "Informe o inicio e o fim do intervalo.";
    }

    if (horario.abre && horario.intervaloInicio) {
      const intervaloAntesDaAbertura =
        horario.intervaloInicio < horario.horarioAbertura;
      const intervaloDepoisDoFechamento =
        horario.intervaloFim > horario.horarioFechamento;

      if (intervaloAntesDaAbertura || intervaloDepoisDoFechamento) {
        return "O intervalo deve estar dentro do horario de funcionamento.";
      }
    }
  }

  return null;
}

// Preenche o dia com o horario retornado pelo backend.
function preencherLinha(horario) {
  const seletor = `[data-dia-semana="${horario.diaSemana}"]`;
  const linha = document.querySelector(seletor);

  if (!linha) {
    return;
  }

  if (horario.abre) {
    obterCampo(linha, ".js-abre").value = "sim";
  } else {
    obterCampo(linha, ".js-abre").value = "nao";
  }

  obterCampo(linha, ".js-abertura").value =
    horario.horarioAbertura || "";
  obterCampo(linha, ".js-fechamento").value =
    horario.horarioFechamento || "";
  obterCampo(linha, ".js-intervalo-inicio").value =
    horario.intervaloInicio || "";
  obterCampo(linha, ".js-intervalo-fim").value =
    horario.intervaloFim || "";

  atualizarCamposDaLinha(linha);
}

// Carrega os horarios salvos da empresa.
async function carregarHorarios() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    return;
  }

  try {
    const resposta = await fetch(
      `${API_HORARIOS_URL}?empresaId=${empresaId}`
    );
    const horarios = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        horarios.message || "Nao foi possivel carregar os horarios."
      );
    }

    for (const horario of horarios) {
      preencherLinha(horario);
    }
  } catch (error) {
    console.error("Erro ao carregar horarios:", error);
    alert("Nao foi possivel carregar os horarios de funcionamento.");
  }
}

// Salva os horarios dos sete dias.
async function salvarHorarios() {
  const dados = montarDadosHorarios();
  const erroValidacao = validarHorarios(dados);

  if (erroValidacao) {
    alert(erroValidacao);
    return;
  }

  botaoSalvarHorarios.disabled = true;
  botaoSalvarHorarios.textContent = "Salvando...";

  try {
    const resposta = await fetch(API_HORARIOS_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert(
        resultado.message || "Nao foi possivel salvar os horarios."
      );
      return;
    }

    alert(resultado.message);
  } catch (error) {
    console.error("Erro ao salvar horarios:", error);
    alert("Nao foi possivel conectar ao servidor.");
  } finally {
    botaoSalvarHorarios.disabled = false;
    botaoSalvarHorarios.textContent = "Salvar horários";
  }
}

// Configura o campo "Abre?" de cada dia.
for (const linha of linhasHorarios) {
  const campoAbre = obterCampo(linha, ".js-abre");

  campoAbre.addEventListener("change", function () {
    atualizarCamposDaLinha(linha);
  });

  atualizarCamposDaLinha(linha);
}

if (botaoSalvarHorarios) {
  // Salva as alteracoes feitas na tabela de horarios.
  botaoSalvarHorarios.addEventListener("click", salvarHorarios);
}

carregarHorarios();
