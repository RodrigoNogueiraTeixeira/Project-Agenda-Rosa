const horarioRepository = require("../repositories/horarioRepository");

// Aceita horario vazio ou no formato HH:MM.
function horaValida(hora) {
  if (!hora) {
    return true;
  }

  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(hora));
}

// Aceita valores numericos ou booleanos para indicar abertura.
function abreValido(abre) {
  if (abre === 0 || abre === 1) {
    return true;
  }

  if (abre === true || abre === false) {
    return true;
  }

  return false;
}

// Valida os dados de um dia da semana.
function validarHorario(horario) {
  if (horario.diaSemana < 0 || horario.diaSemana > 6) {
    return "Dia da semana invalido.";
  }

  if (!abreValido(horario.abre)) {
    return "Informe se a empresa abre ou nao neste dia.";
  }

  if (
    !horaValida(horario.horarioAbertura) ||
    !horaValida(horario.horarioFechamento)
  ) {
    return "Informe horarios de abertura e fechamento validos.";
  }

  if (
    !horaValida(horario.intervaloInicio) ||
    !horaValida(horario.intervaloFim)
  ) {
    return "Informe horarios de intervalo validos.";
  }

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

  return null;
}

// Confere se os sete dias foram enviados uma unica vez.
function diasDaSemanaValidos(horarios) {
  const diasEncontrados = [];

  for (const horario of horarios) {
    const dia = Number(horario.diaSemana);

    if (diasEncontrados.includes(dia)) {
      return false;
    }

    diasEncontrados.push(dia);
  }

  for (let dia = 0; dia <= 6; dia += 1) {
    if (!diasEncontrados.includes(dia)) {
      return false;
    }
  }

  return true;
}

function validarHorarios(dados) {
  // Valida o pacote completo de horarios antes de salvar.
  if (!dados.empresaId) {
    return "Empresa nao identificada para salvar os horarios.";
  }

  if (!Array.isArray(dados.horarios) || dados.horarios.length !== 7) {
    return "Informe os horarios dos sete dias da semana.";
  }

  if (!diasDaSemanaValidos(dados.horarios)) {
    return "Informe cada dia da semana uma unica vez.";
  }

  for (const horario of dados.horarios) {
    const erro = validarHorario(horario);

    if (erro) {
      return erro;
    }
  }

  return null;
}

async function listarHorarios(req, res) {
  // Carrega os horarios de funcionamento cadastrados para a empresa.
  try {
    const empresaId = req.user.id;

    const horarios = await horarioRepository.listarPorEmpresa(empresaId);
    return res.json(horarios);
  } catch (error) {
    console.error("Erro ao listar horarios de funcionamento:", error);
    return res.status(500).json({
      message: "Erro interno ao listar horarios de funcionamento.",
    });
  }
}

async function salvarHorarios(req, res) {
  // Salva os sete dias de funcionamento em uma unica chamada.
  try {
    req.body.empresaId = req.user.id;
    const erroValidacao = validarHorarios(req.body);

    if (erroValidacao) {
      return res.status(400).json({
        message: erroValidacao,
      });
    }

    const horarios = await horarioRepository.salvarTodos(
      req.body.empresaId,
      req.body.horarios
    );

    return res.json({
      message: "Horarios de funcionamento salvos com sucesso.",
      horarios: horarios,
    });
  } catch (error) {
    console.error("Erro ao salvar horarios de funcionamento:", error);
    return res.status(500).json({
      message: "Erro interno ao salvar horarios de funcionamento.",
    });
  }
}

module.exports = {
  listarHorarios,
  salvarHorarios,
};
