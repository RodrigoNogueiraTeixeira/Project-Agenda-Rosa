const clientesRepository = require("../repositories/clientesRepository");

// GET /api/clientes/:id/perfil
async function buscarPerfil(req, res) {
  try {
    const cliente = await clientesRepository.buscarPerfil(req.params.id);

    if (!cliente) {
      res.status(404).json({ erro: "Cliente nao encontrado." });
      return;
    }

    res.status(200).json({ cliente });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar perfil.", detalhes: error.message });
  }
}

// PUT /api/clientes/:id/perfil
async function atualizarPerfil(req, res) {
  try {
    const clienteAtualizado = await clientesRepository.atualizarPerfil(req.params.id, req.body || {});

    if (!clienteAtualizado) {
      res.status(404).json({ erro: "Cliente nao encontrado." });
      return;
    }

    res.status(200).json({ mensagem: "Perfil atualizado com sucesso.", cliente: clienteAtualizado });
  } catch (error) {
    const mensagem = error.message || "";

    if (mensagem.includes("ja cadastrado")) {
      res.status(409).json({ erro: mensagem });
      return;
    }

    if (
      mensagem.includes("obrigatorios") ||
      mensagem.includes("valido") ||
      mensagem.includes("6 caracteres")
    ) {
      res.status(400).json({ erro: mensagem });
      return;
    }

    res.status(500).json({ erro: "Erro ao atualizar perfil.", detalhes: error.message });
  }
}

// POST /api/clientes/cadastro
async function cadastrarCliente(req, res) {
  try {
    const cliente = await clientesRepository.cadastrarCliente(req.body || {});
    res.status(201).json({
      mensagem: "Cliente cadastrado com sucesso.",
      cliente
    });
  } catch (error) {
    const mensagem = error.message || "Erro ao cadastrar cliente.";
    const status = (
      mensagem.includes("obrigatorios") ||
      mensagem.includes("valido") ||
      mensagem.includes("6 caracteres")
    ) ? 400 : (mensagem.includes("ja cadastrado") ? 409 : 500);
    res.status(status).json({ erro: mensagem });
  }
}

module.exports = {
  buscarPerfil,
  atualizarPerfil,
  cadastrarCliente
};
