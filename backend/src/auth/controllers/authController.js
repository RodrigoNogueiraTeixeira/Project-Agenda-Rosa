const authRepository = require("../repositories/authRepository");

// Realiza o login e retorna os dados do perfil.
async function login(req, res) {
  try {
    const resultado = await authRepository.login(req.body || {});
    let cliente = null;

    // Mantem o campo cliente para telas antigas.
    if (resultado.perfil === "cliente") {
      cliente = resultado.usuario;
    }

    return res.status(200).json({
      mensagem: "Login realizado com sucesso.",
      perfil: resultado.perfil,
      usuario: resultado.usuario,
      cliente: cliente,
    });
  } catch (error) {
    const mensagem = error.message || "Erro ao realizar login.";
    let status = 401;

    if (mensagem.includes("nao configurado")) {
      status = 503;
    } else if (
      mensagem.includes("obrigatorios") ||
      mensagem.includes("aprovacao") ||
      mensagem.includes("reprovada")
    ) {
      status = 400;
    }

    return res.status(status).json({
      erro: mensagem,
    });
  }
}

module.exports = {
  login,
};
