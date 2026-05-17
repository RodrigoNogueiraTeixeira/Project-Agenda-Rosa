const API_HORARIOS_URL = "http://localhost:3000/api/horarios-funcionamento";

// Captura os elementos principais da tela de horario de funcionamento.
const linhasHorarios = document.querySelectorAll("[data-dia-semana]");
const botaoSalvarHorarios = document.querySelector("[data-salvar-horarios]");

// Busca o ID da empresa salvo no navegador enquanto o login nao esta integrado.
function obterEmpresaId() {
  return localStorage.getItem("agendaRosaEmpresaId");
}

// Busca um campo dentro da linha do dia da semana.
function obterCampo(linha, seletor) {
  return linha.querySelector(seletor);
}

// Habilita ou desabilita campos de horario conforme o dia abre ou nao.
function atualizarCamposDaLinha(linha) {
  const abre = obterCampo(linha, ".js-abre").value === "sim";
  const camposDeHorario = linha.querySelectorAll("input[type='time']");

  camposDeHorario.forEach((campo) => {
    campo.disabled = !abre;

    if (!abre) {
      campo.value = "";
    }
  });
}

// Monta o objeto de um dia da semana a partir dos campos da tabela.
function montarHorarioDaLinha(linha) {
  const abre = obterCampo(linha, ".js-abre").value === "sim";

  return {
    diaSemana: Number(linha.dataset.diaSemana),
    abre,
    horarioAbertura: obterCampo(linha, ".js-abertura").value,
    horarioFechamento: obterCampo(linha, ".js-fechamento").value,
    intervaloInicio: obterCampo(linha, ".js-intervalo-inicio").value,
    intervaloFim: obterCampo(linha, ".js-intervalo-fim").value,
  };
}

// Monta o corpo completo que sera enviado para a API.
function montarDadosHorarios() {
  return {
    empresaId: obterEmpresaId(),
    horarios: Array.from(linhasHorarios).map(montarHorarioDaLinha),
  };
}

// Valida regras basicas da tela antes de enviar para o back-end.
function validarHorarios(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada. Cadastre ou acesse a empresa antes de salvar horarios.";
  }

  for (const horario of dados.horarios) {
    if (horario.abre && (!horario.horarioAbertura || !horario.horarioFechamento)) {
      return "Dias abertos precisam ter horario de abertura e fechamento.";
    }

    if (
      horario.abre &&
      horario.horarioAbertura &&
      horario.horarioFechamento &&
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
  }

  return null;
}

// Preenche uma linha da tabela com os dados retornados pela API.
function preencherLinha(horario) {
  const linha = document.querySelector(`[data-dia-semana="${horario.diaSemana}"]`);

  if (!linha) {
    return;
  }

  obterCampo(linha, ".js-abre").value = horario.abre ? "sim" : "nao";
  obterCampo(linha, ".js-abertura").value = horario.horarioAbertura || "";
  obterCampo(linha, ".js-fechamento").value = horario.horarioFechamento || "";
  obterCampo(linha, ".js-intervalo-inicio").value = horario.intervaloInicio || "";
  obterCampo(linha, ".js-intervalo-fim").value = horario.intervaloFim || "";

  atualizarCamposDaLinha(linha);
}

// Carrega os horarios salvos da empresa assim que a tela abre.
async function carregarHorarios() {
  const empresaId = obterEmpresaId();

  if (!empresaId) {
    return;
  }

  try {
    const resposta = await fetch(`${API_HORARIOS_URL}?empresaId=${empresaId}`);
    const horarios = await resposta.json();

    horarios.forEach(preencherLinha);
  } catch (error) {
    console.error("Erro ao carregar horarios:", error);
    alert("Nao foi possivel carregar os horarios de funcionamento.");
  }
}

// Salva os sete dias da semana no back-end.
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
      alert(resultado.message || "Nao foi possivel salvar os horarios.");
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

// Liga cada select "Abre?" ao comportamento de habilitar/desabilitar campos.
linhasHorarios.forEach((linha) => {
  obterCampo(linha, ".js-abre").addEventListener("change", () => {
    atualizarCamposDaLinha(linha);
  });

  atualizarCamposDaLinha(linha);
});

// Liga o botao da tela a funcao que salva os horarios.
botaoSalvarHorarios?.addEventListener("click", salvarHorarios);

// Carrega os horarios ja salvos quando a pagina abre.
carregarHorarios();
