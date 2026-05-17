const horarioFuncionamentoModel = require("../models/horarioFuncionamentoModel");

// Verifica se o valor esta no formato basico de hora usado pelo input type="time".
function horaValida(hora) {
  return !hora || /^\d{2}:\d{2}$/.test(String(hora));
}

// Valida uma linha de horario antes de salvar no banco.
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

  return null;
}

// Valida o conjunto completo enviado pela tela de horario de funcionamento.
function validarHorarios(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada para salvar os horarios.";
  }

  if (!Array.isArray(dados.horarios) || dados.horarios.length !== 7) {
    return "Informe os horarios dos sete dias da semana.";
  }

  for (const horario of dados.horarios) {
    const erro = validarHorario(horario);

    if (erro) {
      return erro;
    }
  }

  return null;
}

// Controller que lista os horarios de funcionamento de uma empresa.
async function listarHorarios(req, res) {
  try {
    const { empresaId } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const horarios = await horarioFuncionamentoModel.listarPorEmpresa(empresaId);
    return res.json(horarios);
  } catch (error) {
    console.error("Erro ao listar horarios de funcionamento:", error);
    return res.status(500).json({
      message: "Erro interno ao listar horarios de funcionamento.",
    });
  }
}

// Controller que salva ou atualiza os sete horarios semanais da empresa.
async function salvarHorarios(req, res) {
  try {
    const erroValidacao = validarHorarios(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    const horarios = await horarioFuncionamentoModel.salvarTodos(
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

// Exporta os controllers usados pelas rotas de horario de funcionamento.
module.exports = {
  listarHorarios,
  salvarHorarios,
};
