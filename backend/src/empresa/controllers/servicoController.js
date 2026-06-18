const servicoRepository = require("../repositories/servicoRepository");

// Converte valores como 50,00 ou R$ 50,00 para centavos.
function converterPrecoParaCentavos(preco) {
  if (typeof preco === "number") {
    if (Number.isFinite(preco)) {
      return Math.round(preco * 100);
    }

    return null;
  }

  let valorNormalizado = String(preco)
    .replace("R$", "")
    .replace(/\s/g, "")
    .trim();

  if (valorNormalizado.includes(",")) {
    valorNormalizado = valorNormalizado.replace(/\./g, "");
    valorNormalizado = valorNormalizado.replace(",", ".");
  }

  const valorNumerico = Number(valorNormalizado);

  if (Number.isNaN(valorNumerico)) {
    return null;
  }

  return Math.round(valorNumerico * 100);
}

// Retira textos como "min" e mantem apenas os minutos.
function converterDuracaoParaMinutos(duracao) {
  const apenasNumeros = String(duracao).replace(/\D/g, "");
  const minutos = Number(apenasNumeros);

  if (!minutos || Number.isNaN(minutos)) {
    return null;
  }

  return minutos;
}

function validarServico(dados) {
  // Confere se o servico possui dados suficientes para cadastro ou edicao.
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

  if (
    dados.status &&
    dados.status !== "ativo" &&
    dados.status !== "inativo"
  ) {
    return "Status do servico invalido.";
  }

  return null;
}

// Prepara os dados para salvar no banco.
function montarDadosServico(dados) {
  return {
    empresaId: dados.empresaId,
    nome: dados.nome,
    categoria: dados.categoria,
    precoCentavos: converterPrecoParaCentavos(dados.preco),
    duracaoMinutos: converterDuracaoParaMinutos(dados.duracao),
    descricao: dados.descricao,
    status: dados.status || "ativo",
  };
}

async function listarServicos(req, res) {
  // Lista todos os servicos cadastrados pela empresa.
  try {
    const empresaId = req.query.empresaId;

    if (!empresaId) {
      return res.status(400).json({
        message: "Informe o ID da empresa.",
      });
    }

    const servicos = await servicoRepository.listarPorEmpresa(empresaId);
    return res.json(servicos);
  } catch (error) {
    console.error("Erro ao listar servicos:", error);
    return res.status(500).json({
      message: "Erro interno ao listar servicos.",
    });
  }
}

async function cadastrarServico(req, res) {
  // Valida, normaliza e cadastra um novo servico.
  try {
    const erroValidacao = validarServico(req.body);

    if (erroValidacao) {
      return res.status(400).json({
        message: erroValidacao,
      });
    }

    const dadosServico = montarDadosServico(req.body);
    const servico = await servicoRepository.criar(dadosServico);

    return res.status(201).json({
      message: "Servico cadastrado com sucesso.",
      servico,
    });
  } catch (error) {
    console.error("Erro ao cadastrar servico:", error);
    return res.status(500).json({
      message: "Erro interno ao cadastrar servico.",
    });
  }
}

async function atualizarServico(req, res) {
  // Atualiza um servico mantendo a empresa como limite da operacao.
  try {
    const erroValidacao = validarServico(req.body);

    if (erroValidacao) {
      return res.status(400).json({
        message: erroValidacao,
      });
    }

    const dadosServico = montarDadosServico(req.body);
    const servicoAtualizado = await servicoRepository.atualizar(
      req.params.id,
      dadosServico
    );

    if (!servicoAtualizado) {
      return res.status(404).json({
        message: "Servico nao encontrado.",
      });
    }

    return res.json({
      message: "Servico atualizado com sucesso.",
      servico: servicoAtualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar servico:", error);
    return res.status(500).json({
      message: "Erro interno ao atualizar servico.",
    });
  }
}

async function excluirServico(req, res) {
  // Remove um servico quando ele pertence a empresa indicada.
  try {
    const empresaId = req.query.empresaId;

    if (!empresaId) {
      return res.status(400).json({
        message: "Informe o ID da empresa.",
      });
    }

    const removido = await servicoRepository.excluir(
      req.params.id,
      empresaId
    );

    if (!removido) {
      return res.status(404).json({
        message: "Servico nao encontrado.",
      });
    }

    return res.json({
      message: "Servico excluido com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir servico:", error);
    return res.status(500).json({
      message: "Erro interno ao excluir servico.",
    });
  }
}

module.exports = {
  listarServicos,
  cadastrarServico,
  atualizarServico,
  excluirServico,
};
