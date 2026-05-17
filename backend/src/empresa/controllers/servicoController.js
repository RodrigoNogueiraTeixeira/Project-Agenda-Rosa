const servicoRepository = require("../repositories/servicoRepository");

function converterPrecoParaCentavos(preco) {
  const valorNormalizado = String(preco)
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const valorNumerico = Number(valorNormalizado);

  if (Number.isNaN(valorNumerico)) {
    return null;
  }

  return Math.round(valorNumerico * 100);
}

function converterDuracaoParaMinutos(duracao) {
  const apenasNumeros = String(duracao).replace(/\D/g, "");
  const minutos = Number(apenasNumeros);

  if (!minutos || Number.isNaN(minutos)) {
    return null;
  }

  return minutos;
}

function validarServico(dados) {
  if (!dados.empresaId) {
    return "Empresa nao identificada para cadastrar o servico.";
  }

  if (!dados.nome || !dados.categoria || !dados.preco || !dados.duracao) {
    return "Preencha nome, categoria, preco e duracao do servico.";
  }

  if (converterPrecoParaCentavos(dados.preco) === null) {
    return "Informe um preco valido.";
  }

  if (converterDuracaoParaMinutos(dados.duracao) === null) {
    return "Informe uma duracao valida em minutos.";
  }

  if (dados.status && !["ativo", "inativo"].includes(dados.status)) {
    return "Status do servico invalido.";
  }

  return null;
}

async function listarServicos(req, res) {
  try {
    const { empresaId } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const servicos = await servicoRepository.listarPorEmpresa(empresaId);
    return res.json(servicos);
  } catch (error) {
    console.error("Erro ao listar servicos:", error);
    return res.status(500).json({ message: "Erro interno ao listar servicos." });
  }
}

async function cadastrarServico(req, res) {
  try {
    const erroValidacao = validarServico(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    const servico = await servicoRepository.criar({
      empresaId: req.body.empresaId,
      nome: req.body.nome,
      categoria: req.body.categoria,
      precoCentavos: converterPrecoParaCentavos(req.body.preco),
      duracaoMinutos: converterDuracaoParaMinutos(req.body.duracao),
      descricao: req.body.descricao,
      status: req.body.status || "ativo",
    });

    return res.status(201).json({
      message: "Servico cadastrado com sucesso.",
      servico,
    });
  } catch (error) {
    console.error("Erro ao cadastrar servico:", error);
    return res.status(500).json({ message: "Erro interno ao cadastrar servico." });
  }
}

async function atualizarServico(req, res) {
  try {
    const erroValidacao = validarServico(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    const servicoAtualizado = await servicoRepository.atualizar(req.params.id, {
      empresaId: req.body.empresaId,
      nome: req.body.nome,
      categoria: req.body.categoria,
      precoCentavos: converterPrecoParaCentavos(req.body.preco),
      duracaoMinutos: converterDuracaoParaMinutos(req.body.duracao),
      descricao: req.body.descricao,
      status: req.body.status || "ativo",
    });

    if (!servicoAtualizado) {
      return res.status(404).json({ message: "Servico nao encontrado." });
    }

    return res.json({
      message: "Servico atualizado com sucesso.",
      servico: servicoAtualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar servico:", error);
    return res.status(500).json({ message: "Erro interno ao atualizar servico." });
  }
}

async function excluirServico(req, res) {
  try {
    const { empresaId } = req.query;

    if (!empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const removido = await servicoRepository.excluir(req.params.id, empresaId);

    if (!removido) {
      return res.status(404).json({ message: "Servico nao encontrado." });
    }

    return res.json({ message: "Servico excluido com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir servico:", error);
    return res.status(500).json({ message: "Erro interno ao excluir servico." });
  }
}

module.exports = {
  listarServicos,
  cadastrarServico,
  atualizarServico,
  excluirServico,
};
