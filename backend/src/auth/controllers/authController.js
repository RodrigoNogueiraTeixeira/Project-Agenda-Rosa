const authRepository = require("../repositories/authRepository");

// POST /api/auth/login
async function login(req, res) {
  try {
    const resultado = await authRepository.login(req.body || {});
    res.status(200).json({
      mensagem: "Login realizado com sucesso.",
      perfil: resultado.perfil,
      usuario: resultado.usuario,
      // Retrocompatibilidade para chamadas legadas do cliente
      cliente: resultado.perfil === "cliente" ? resultado.usuario : null
    });
  } catch (error) {
    const mensagem = error.message || "Erro ao realizar login.";
    const status = mensagem.includes("nao configurado")
      ? 503
      : (
        mensagem.includes("obrigatorios") ||
        mensagem.includes("aprovacao") ||
        mensagem.includes("reprovada")
      ) ? 400 : 401;
    res.status(status).json({ erro: mensagem });
  }
}

module.exports = {
  login
};
