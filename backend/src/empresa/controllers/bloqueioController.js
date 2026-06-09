const bloqueioRepository = require("../repositories/bloqueioRepository");

function horaValida(hora) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(hora));
}

// Confere o formato e se a data nao esta no passado.
function validarDataBloqueio(dataInformada) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dataInformada))) {
    return "Informe uma data valida para o bloqueio.";
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataBloqueio = new Date(`${dataInformada}T00:00:00`);

  if (Number.isNaN(dataBloqueio.getTime())) {
    return "Informe uma data valida para o bloqueio.";
  }

  if (dataBloqueio < hoje) {
    return "Nao e permitido cadastrar bloqueio em data passada.";
  }

  return null;
}

function validarBloqueio(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada para cadastrar o bloqueio.";
  }

  if (!dados.dataBloqueio || !dados.horarioInicio || !dados.horarioFim) {
    return "Preencha data, horario inicial e horario final.";
  }

  if (!dados.profissionalId) {
    return "Selecione um profissional para bloquear o horario.";
  }

  const erroData = validarDataBloqueio(dados.dataBloqueio);

  if (erroData) {
    return erroData;
  }

  if (!horaValida(dados.horarioInicio) || !horaValida(dados.horarioFim)) {
    return "Informe horarios validos.";
  }

  if (dados.horarioInicio >= dados.horarioFim) {
    return "O horario inicial deve ser menor que o horario final.";
  }

  return null;
}

// Prepara os dados antes de enviar ao repository.
function montarDadosBloqueio(dados) {
  return {
    empresaId: dados.empresaId,
    profissionalId: dados.profissionalId,
    profissionalNome: dados.profissionalNome,
    dataBloqueio: dados.dataBloqueio,
    horarioInicio: dados.horarioInicio,
    horarioFim: dados.horarioFim,
    motivo: dados.motivo,
  };
}

async function listarBloqueios(req, res) {
  try {
    const empresaId = req.query.empresaId;

    if (!empresaId) {
      return res.status(400).json({
        message: "Informe o ID da empresa.",
      });
    }

    const bloqueios = await bloqueioRepository.listarPorEmpresa(empresaId);
    return res.json(bloqueios);
  } catch (error) {
    console.error("Erro ao listar bloqueios:", error);
    return res.status(500).json({
      message: "Erro interno ao listar bloqueios.",
    });
  }
}

async function cadastrarBloqueio(req, res) {
  try {
    const erroValidacao = validarBloqueio(req.body);

    if (erroValidacao) {
      return res.status(400).json({
        message: erroValidacao,
      });
    }

    const dadosBloqueio = montarDadosBloqueio(req.body);
    const bloqueio = await bloqueioRepository.criar(dadosBloqueio);

    return res.status(201).json({
      message: "Bloqueio de horario cadastrado com sucesso.",
      bloqueio: bloqueio,
    });
  } catch (error) {
    const profissionalInvalido = error.message.includes("nao pertence");
    const periodoOcupado = error.message.includes("Ja existe");

    if (profissionalInvalido || periodoOcupado) {
      return res.status(409).json({
        message: error.message,
      });
    }

    console.error("Erro ao cadastrar bloqueio:", error);
    return res.status(500).json({
      message: "Erro interno ao cadastrar bloqueio.",
    });
  }
}

async function excluirBloqueio(req, res) {
  try {
    const empresaId = req.query.empresaId;

    if (!empresaId) {
      return res.status(400).json({
        message: "Informe o ID da empresa.",
      });
    }

    const removido = await bloqueioRepository.excluir(
      req.params.id,
      empresaId
    );

    if (!removido) {
      return res.status(404).json({
        message: "Bloqueio nao encontrado.",
      });
    }

    return res.json({
      message: "Bloqueio removido com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir bloqueio:", error);
    return res.status(500).json({
      message: "Erro interno ao excluir bloqueio.",
    });
  }
}

module.exports = {
  listarBloqueios,
  cadastrarBloqueio,
  excluirBloqueio,
};
