const profissionalRepository = require("../repositories/profissionalRepository");

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

  if (dados.status && !["ativo", "inativo"].includes(dados.status)) {
    return "Status do profissional invalido.";
  }

  return null;
}

async function listarProfissionais(req, res) {
  try {
    const { empresaId, somenteAtivos } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const profissionais = await profissionalRepository.listarPorEmpresa({
      empresaId,
      somenteAtivos: somenteAtivos === "true",
    });

    return res.json(profissionais);
  } catch (error) {
    console.error("Erro ao listar profissionais:", error);
    return res.status(500).json({ message: "Erro interno ao listar profissionais." });
  }
}

async function cadastrarProfissional(req, res) {
  try {
    const erroValidacao = validarProfissional(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    const profissional = await profissionalRepository.criar(req.body);

    return res.status(201).json({
      message: "Profissional cadastrado com sucesso.",
      profissional,
    });
  } catch (error) {
    console.error("Erro ao cadastrar profissional:", error);
    return res.status(500).json({ message: "Erro interno ao cadastrar profissional." });
  }
}

async function atualizarProfissional(req, res) {
  try {
    const erroValidacao = validarProfissional(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    const profissional = await profissionalRepository.atualizar(req.params.id, req.body);

    if (!profissional) {
      return res.status(404).json({ message: "Profissional nao encontrado." });
    }

    return res.json({
      message: "Profissional atualizado com sucesso.",
      profissional,
    });
  } catch (error) {
    console.error("Erro ao atualizar profissional:", error);
    return res.status(500).json({ message: "Erro interno ao atualizar profissional." });
  }
}

async function excluirProfissional(req, res) {
  try {
    const { empresaId } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const removido = await profissionalRepository.excluir(req.params.id, empresaId);

    if (!removido) {
      return res.status(404).json({ message: "Profissional nao encontrado." });
    }

    return res.json({ message: "Profissional excluido com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir profissional:", error);
    return res.status(500).json({ message: "Erro interno ao excluir profissional." });
  }
}

module.exports = {
  listarProfissionais,
  cadastrarProfissional,
  atualizarProfissional,
  excluirProfissional,
};
