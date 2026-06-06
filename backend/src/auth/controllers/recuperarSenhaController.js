const authDAO = require("../dao/authDAO");
const emailUtils = require("../../utils/emailUtils");
const passwordUtils = require("../../utils/password");
const { randomUUID } = require("crypto");

const MENSAGEM_RECUPERACAO =
  "Se o e-mail existir na nossa base, voce recebera um link de recuperacao.";

async function recuperarSenha(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const perfil = String(req.body.perfil || "").trim().toLowerCase();

    if (!email || !perfil) {
      return res.status(400).json({
        success: false,
        message: "E-mail e perfil sao obrigatorios.",
      });
    }

    if (!email.includes("@") || !["cliente", "empresa"].includes(perfil)) {
      return res.status(400).json({
        success: false,
        message: "Informe um e-mail e perfil validos.",
      });
    }

    const usuario = perfil === "cliente"
      ? await authDAO.buscarClientePorEmail(email)
      : await authDAO.buscarEmpresaPorEmail(email);

    if (!usuario) {
      return res.json({ success: true, message: MENSAGEM_RECUPERACAO });
    }

    const token = randomUUID();
    const expiracao = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await authDAO.invalidarTokensRecuperacao(email, perfil);
    await authDAO.salvarTokenRecuperacao(email, perfil, token, expiracao);

    const protocoloEncaminhado = String(req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim();
    const protocol = protocoloEncaminhado || req.protocol || "http";
    const host = req.get ? req.get("host") : req.headers.host;
    const appBaseUrl = String(process.env.APP_BASE_URL || `${protocol}://${host}`)
      .replace(/\/+$/, "");
    const frontendUrl =
      `${appBaseUrl}/login/html/RedefinirSenha.html?token=${token}`;

    try {
      await emailUtils.enviarEmailRecuperacao(email, frontendUrl);
    } catch (emailError) {
      console.error(
        "Falha ao enviar e-mail de recuperacao:",
        emailError.message
      );
    }

    return res.json({ success: true, message: MENSAGEM_RECUPERACAO });
  } catch (error) {
    console.error("Erro ao recuperar senha:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
}

async function redefinirSenha(req, res) {
  try {
    const token = String(req.body.token || "").trim();
    const novaSenha = String(req.body.novaSenha || "");

    if (!token || !novaSenha) {
      return res.status(400).json({
        success: false,
        message: "Token e nova senha sao obrigatorios.",
      });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({
        success: false,
        message: "A nova senha deve ter pelo menos 6 caracteres.",
      });
    }

    const registroToken = await authDAO.buscarTokenRecuperacao(token);

    if (!registroToken || Number(registroToken.utilizado) === 1) {
      return res.status(400).json({
        success: false,
        message: "Token invalido ou ja utilizado.",
      });
    }

    const expiracao = new Date(registroToken.expiracao);
    if (Number.isNaN(expiracao.getTime()) || new Date() > expiracao) {
      return res.status(400).json({
        success: false,
        message: "O token expirou. Solicite a recuperacao novamente.",
      });
    }

    const senhaHash = passwordUtils.hashPassword(novaSenha);

    if (registroToken.perfil === "cliente") {
      await authDAO.atualizarSenhaCliente(registroToken.email, senhaHash);
    } else if (registroToken.perfil === "empresa") {
      await authDAO.atualizarSenhaEmpresa(registroToken.email, senhaHash);
    } else {
      return res.status(400).json({
        success: false,
        message: "Perfil invalido associado a este token.",
      });
    }

    await authDAO.marcarTokenUtilizado(token);

    return res.json({
      success: true,
      message: "Senha redefinida com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
}

module.exports = {
  recuperarSenha,
  redefinirSenha,
};
