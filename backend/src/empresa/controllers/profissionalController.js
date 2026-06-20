const profissionalRepository = require("../repositories/profissionalRepository");

// Confere os dados recebidos da tela.
function validarProfissional(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada para cadastrar o profissional.";
  }

  if (!dados.nome || String(dados.nome).trim() === "") {
    return "Informe o nome do profissional.";
  }

  if (dados.email && !String(dados.email).includes("@")) {
    return "Informe um e-mail valido para o profissional.";
  }

  if (!Array.isArray(dados.servicosIds) || dados.servicosIds.length === 0) {
    return "Selecione pelo menos um servico atendido pelo profissional.";
  }

  for (const servicoId of dados.servicosIds) {
    if (!Number.isInteger(Number(servicoId)) || Number(servicoId) <= 0) {
      return "Selecione servicos validos para o profissional.";
    }
  }

  if (
    dados.status &&
    dados.status !== "ativo" &&
    dados.status !== "inativo"
  ) {
    return "Status do profissional invalido.";
  }

  return null;
}

async function listarProfissionais(req, res) {
  // Lista profissionais da empresa, podendo filtrar apenas os ativos.
  try {
    const empresaId = req.user.id;
    const somenteAtivos = req.query.somenteAtivos === "true";

    const filtros = {
      empresaId: empresaId,
      somenteAtivos: somenteAtivos,
    };

    const profissionais =
      await profissionalRepository.listarPorEmpresa(filtros);

    return res.json(profissionais);
  } catch (error) {
    console.error("Erro ao listar profissionais:", error);
    return res.status(500).json({
      message: "Erro interno ao listar profissionais.",
    });
  }
}

async function cadastrarProfissional(req, res) {
  // Cadastra um profissional e seus servicos vinculados.
  try {
    req.body.empresaId = req.user.id;
    const erroValidacao = validarProfissional(req.body);

    if (erroValidacao) {
      return res.status(400).json({
        message: erroValidacao,
      });
    }

    const profissional = await profissionalRepository.criar(req.body);

    return res.status(201).json({
      message: "Profissional cadastrado com sucesso.",
      profissional: profissional,
    });
  } catch (error) {
    if (error.message.includes("servicos cadastrados pela empresa")) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("Erro ao cadastrar profissional:", error);
    return res.status(500).json({
      message: "Erro interno ao cadastrar profissional.",
    });
  }
}

async function atualizarProfissional(req, res) {
  // Atualiza os dados do profissional e refaz seus vinculos de servicos.
  try {
    req.body.empresaId = req.user.id;
    const erroValidacao = validarProfissional(req.body);

    if (erroValidacao) {
      return res.status(400).json({
        message: erroValidacao,
      });
    }

    const profissional = await profissionalRepository.atualizar(
      req.params.id,
      req.body
    );

    if (!profissional) {
      return res.status(404).json({
        message: "Profissional nao encontrado.",
      });
    }

    return res.json({
      message: "Profissional atualizado com sucesso.",
      profissional: profissional,
    });
  } catch (error) {
    if (error.message.includes("servicos cadastrados pela empresa")) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("Erro ao atualizar profissional:", error);
    return res.status(500).json({
      message: "Erro interno ao atualizar profissional.",
    });
  }
}

async function excluirProfissional(req, res) {
  // Exclui o profissional apenas dentro da empresa informada.
  try {
    const empresaId = req.user.id;

    const removido = await profissionalRepository.excluir(
      req.params.id,
      empresaId
    );

    if (!removido) {
      return res.status(404).json({
        message: "Profissional nao encontrado.",
      });
    }

    return res.json({
      message: "Profissional excluido com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir profissional:", error);
    return res.status(500).json({
      message: "Erro interno ao excluir profissional.",
    });
  }
}

module.exports = {
  listarProfissionais,
  cadastrarProfissional,
  atualizarProfissional,
  excluirProfissional,
};
