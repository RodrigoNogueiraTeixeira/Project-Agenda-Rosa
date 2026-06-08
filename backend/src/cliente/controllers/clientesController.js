const clientesRepository = require("../repositories/clientesRepository");

// Busca o perfil do cliente.
async function buscarPerfil(req, res) {
  try {
    const cliente = await clientesRepository.buscarPerfil(req.params.id);

    if (!cliente) {
      return res.status(404).json({
        erro: "Cliente nao encontrado.",
      });
    }

    return res.status(200).json({
      cliente: cliente,
    });
  } catch (error) {
    return res.status(500).json({
      erro: "Erro ao buscar perfil.",
      detalhes: error.message,
    });
  }
}

// Atualiza os dados do cliente.
async function atualizarPerfil(req, res) {
  try {
    const clienteAtualizado = await clientesRepository.atualizarPerfil(
      req.params.id,
      req.body || {}
    );

    if (!clienteAtualizado) {
      return res.status(404).json({
        erro: "Cliente nao encontrado.",
      });
    }

    return res.status(200).json({
      mensagem: "Perfil atualizado com sucesso.",
      cliente: clienteAtualizado,
    });
  } catch (error) {
    const mensagem = error.message || "";

    if (mensagem.includes("ja cadastrado")) {
      return res.status(409).json({
        erro: mensagem,
      });
    }

    if (
      mensagem.includes("obrigatorios") ||
      mensagem.includes("valido") ||
      mensagem.includes("6 caracteres")
    ) {
      return res.status(400).json({
        erro: mensagem,
      });
    }

    return res.status(500).json({
      erro: "Erro ao atualizar perfil.",
      detalhes: error.message,
    });
  }
}

// Cadastra um novo cliente.
async function cadastrarCliente(req, res) {
  try {
    const cliente = await clientesRepository.cadastrarCliente(
      req.body || {}
    );

    return res.status(201).json({
      mensagem: "Cliente cadastrado com sucesso.",
      cliente: cliente,
    });
  } catch (error) {
    const mensagem = error.message || "Erro ao cadastrar cliente.";
    let status = 500;

    if (
      mensagem.includes("obrigatorios") ||
      mensagem.includes("valido") ||
      mensagem.includes("6 caracteres")
    ) {
      status = 400;
    } else if (mensagem.includes("ja cadastrado")) {
      status = 409;
    }

    return res.status(status).json({
      erro: mensagem,
    });
  }
}

module.exports = {
  buscarPerfil,
  atualizarPerfil,
  cadastrarCliente,
};
