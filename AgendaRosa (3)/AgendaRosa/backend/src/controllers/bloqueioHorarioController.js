const bloqueioHorarioModel = require("../models/bloqueioHorarioModel");

// Verifica se uma hora esta no formato esperado pelo input type="time".
function horaValida(hora) {
  return /^\d{2}:\d{2}$/.test(String(hora));
}

// Valida os dados recebidos antes de salvar um bloqueio.
function validarBloqueio(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada para cadastrar o bloqueio.";
  }

  if (!dados.dataBloqueio || !dados.horarioInicio || !dados.horarioFim) {
    return "Preencha data, horario inicial e horario final.";
  }

  if (!horaValida(dados.horarioInicio) || !horaValida(dados.horarioFim)) {
    return "Informe horarios validos.";
  }

  if (dados.horarioInicio >= dados.horarioFim) {
    return "O horario inicial deve ser menor que o horario final.";
  }

  return null;
}

// Controller que lista os bloqueios de uma empresa.
async function listarBloqueios(req, res) {
  try {
    const { empresaId } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const bloqueios = await bloqueioHorarioModel.listarPorEmpresa(empresaId);
    return res.json(bloqueios);
  } catch (error) {
    console.error("Erro ao listar bloqueios:", error);
    return res.status(500).json({ message: "Erro interno ao listar bloqueios." });
  }
}

// Controller que cadastra uma indisponibilidade pontual na agenda.
async function cadastrarBloqueio(req, res) {
  try {
    const erroValidacao = validarBloqueio(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    const bloqueio = await bloqueioHorarioModel.criar({
      empresaId: req.body.empresaId,
      profissionalId: req.body.profissionalId || null,
      profissionalNome: req.body.profissionalNome,
      dataBloqueio: req.body.dataBloqueio,
      horarioInicio: req.body.horarioInicio,
      horarioFim: req.body.horarioFim,
      motivo: req.body.motivo,
    });

    return res.status(201).json({
      message: "Bloqueio de horario cadastrado com sucesso.",
      bloqueio,
    });
  } catch (error) {
    console.error("Erro ao cadastrar bloqueio:", error);
    return res.status(500).json({ message: "Erro interno ao cadastrar bloqueio." });
  }
}

// Controller que remove um bloqueio cadastrado.
async function excluirBloqueio(req, res) {
  try {
    const { empresaId } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const removido = await bloqueioHorarioModel.excluir(req.params.id, empresaId);

    if (!removido) {
      return res.status(404).json({ message: "Bloqueio nao encontrado." });
    }

    return res.json({ message: "Bloqueio removido com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir bloqueio:", error);
    return res.status(500).json({ message: "Erro interno ao excluir bloqueio." });
  }
}

// Exporta os controllers usados pelas rotas de bloqueio de horarios.
module.exports = {
  listarBloqueios,
  cadastrarBloqueio,
  excluirBloqueio,
};
