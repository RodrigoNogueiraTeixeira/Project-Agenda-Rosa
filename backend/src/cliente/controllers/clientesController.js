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
    if ((error.message || "").includes("obrigatorios")) {
      res.status(400).json({ erro: error.message });
      return;
    }

    res.status(500).json({ erro: "Erro ao atualizar perfil.", detalhes: error.message });
  }
}

module.exports = {
  buscarPerfil,
  atualizarPerfil
};
