const horarioRepository = require("../repositories/horarioRepository");

function horaValida(hora) {
  return !hora || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(hora));
}

function validarHorario(horario) {
  if (horario.diaSemana < 0 || horario.diaSemana > 6) {
    return "Dia da semana invalido.";
  }

  if (![0, 1, true, false].includes(horario.abre)) {
    return "Informe se a empresa abre ou nao neste dia.";
  }

  if (!horaValida(horario.horarioAbertura) || !horaValida(horario.horarioFechamento)) {
    return "Informe horarios de abertura e fechamento validos.";
  }

  if (!horaValida(horario.intervaloInicio) || !horaValida(horario.intervaloFim)) {
    return "Informe horarios de intervalo validos.";
  }

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

  if (Boolean(horario.intervaloInicio) !== Boolean(horario.intervaloFim)) {
    return "Informe o inicio e o fim do intervalo.";
  }

  if (
    horario.abre &&
    horario.intervaloInicio &&
    (
      horario.intervaloInicio < horario.horarioAbertura ||
      horario.intervaloFim > horario.horarioFechamento
    )
  ) {
    return "O intervalo deve estar dentro do horario de funcionamento.";
  }

  return null;
}

function validarHorarios(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada para salvar os horarios.";
  }

  if (!Array.isArray(dados.horarios) || dados.horarios.length !== 7) {
    return "Informe os horarios dos sete dias da semana.";
  }

  const diasInformados = new Set(dados.horarios.map((horario) => Number(horario.diaSemana)));

  if (diasInformados.size !== 7 || ![0, 1, 2, 3, 4, 5, 6].every((dia) => diasInformados.has(dia))) {
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
  try {
    const { empresaId } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

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
  try {
    const erroValidacao = validarHorarios(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    const horarios = await horarioRepository.salvarTodos(
      req.body.empresaId,
      req.body.horarios
    );

    return res.json({
      message: "Horarios de funcionamento salvos com sucesso.",
      horarios,
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
