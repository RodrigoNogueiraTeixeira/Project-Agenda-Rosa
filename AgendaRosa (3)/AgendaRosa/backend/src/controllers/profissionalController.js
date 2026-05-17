const profissionalModel = require("../models/profissionalModel");

// Valida os campos obrigatorios para cadastrar ou atualizar um profissional.
function validarProfissional(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada para cadastrar o profissional.";
  }

  if (!dados.nome || String(dados.nome).trim() === "") {
    return "Informe o nome do profissional.";
  }

  if (dados.status && !["ativo", "inativo"].includes(dados.status)) {
    return "Status do profissional invalido.";
  }

  return null;
}

// Controller que lista profissionais vinculados a uma empresa.
async function listarProfissionais(req, res) {
  try {
    const { empresaId, somenteAtivos } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const profissionais = await profissionalModel.listarPorEmpresa({
      empresaId,
      somenteAtivos: somenteAtivos === "true",
    });

    return res.json(profissionais);
  } catch (error) {
    console.error("Erro ao listar profissionais:", error);
    return res.status(500).json({ message: "Erro interno ao listar profissionais." });
  }
}

// Controller que cadastra um novo profissional.
async function cadastrarProfissional(req, res) {
  try {
    const erroValidacao = validarProfissional(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    const profissional = await profissionalModel.criar(req.body);

    return res.status(201).json({
      message: "Profissional cadastrado com sucesso.",
      profissional,
    });
  } catch (error) {
    console.error("Erro ao cadastrar profissional:", error);
    return res.status(500).json({ message: "Erro interno ao cadastrar profissional." });
  }
}

// Controller que atualiza os dados de um profissional existente.
async function atualizarProfissional(req, res) {
  try {
    const erroValidacao = validarProfissional(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    const profissional = await profissionalModel.atualizar(req.params.id, req.body);

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

// Controller que exclui um profissional da empresa.
async function excluirProfissional(req, res) {
  try {
    const { empresaId } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const removido = await profissionalModel.excluir(req.params.id, empresaId);

    if (!removido) {
      return res.status(404).json({ message: "Profissional nao encontrado." });
    }

    return res.json({ message: "Profissional excluido com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir profissional:", error);
    return res.status(500).json({ message: "Erro interno ao excluir profissional." });
  }
}

// Exporta os controllers usados pelas rotas de profissionais.
module.exports = {
  listarProfissionais,
  cadastrarProfissional,
  atualizarProfissional,
  excluirProfissional,
};
