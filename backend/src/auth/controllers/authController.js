const authRepository = require("../repositories/authRepository");

// POST /api/auth/login
async function login(req, res) {
  try {
    const cliente = await authRepository.loginCliente(req.body || {});
    res.status(200).json({
      mensagem: "Login realizado com sucesso.",
      cliente
    });
  } catch (error) {
    const mensagem = error.message || "Erro ao realizar login.";
    const status = mensagem.includes("obrigatorios") ? 400 : 401;
    res.status(status).json({ erro: mensagem });
  }
}

module.exports = {
  login
};
