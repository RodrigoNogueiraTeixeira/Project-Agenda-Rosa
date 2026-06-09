const authDAO = require("../dao/authDAO");
const emailUtils = require("../../utils/emailUtils");
const passwordUtils = require("../../utils/password");
const { randomUUID } = require("crypto");

const MENSAGEM_RECUPERACAO =
  "Se o e-mail existir na nossa base, voce recebera um link de recuperacao.";

function perfilValido(perfil) {
  return perfil === "cliente" || perfil === "empresa";
}

async function buscarUsuario(email, perfil) {
  if (perfil === "cliente") {
    return authDAO.buscarClientePorEmail(email);
  }

  return authDAO.buscarEmpresaPorEmail(email);
}

// Monta o endereco usado no link enviado por e-mail.
function montarUrlDoFrontend(req, token) {
  const protocoloEncaminhado = String(
    req.headers["x-forwarded-proto"] || ""
  )
    .split(",")[0]
    .trim();

  let protocolo = protocoloEncaminhado;

  if (!protocolo) {
    protocolo = req.protocol || "http";
  }

  let host = req.headers.host;

  if (req.get) {
    host = req.get("host");
  }

  const enderecoPadrao = `${protocolo}://${host}`;
  const appBaseUrl = String(
    process.env.APP_BASE_URL || enderecoPadrao
  ).replace(/\/+$/, "");

  return `${appBaseUrl}/login/html/RedefinirSenha.html?token=${token}`;
}

// Cria um token e envia o link sem informar se o e-mail existe.
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

    if (!email.includes("@") || !perfilValido(perfil)) {
      return res.status(400).json({
        success: false,
        message: "Informe um e-mail e perfil validos.",
      });
    }

    const usuario = await buscarUsuario(email, perfil);

    if (!usuario) {
      return res.json({
        success: true,
        message: MENSAGEM_RECUPERACAO,
      });
    }

    const token = randomUUID();
    const umaHoraEmMilissegundos = 60 * 60 * 1000;
    const expiracao = new Date(
      Date.now() + umaHoraEmMilissegundos
    ).toISOString();

    await authDAO.invalidarTokensRecuperacao(email, perfil);
    await authDAO.salvarTokenRecuperacao(
      email,
      perfil,
      token,
      expiracao
    );

    const frontendUrl = montarUrlDoFrontend(req, token);

    try {
      await emailUtils.enviarEmailRecuperacao(email, frontendUrl);
    } catch (emailError) {
      console.error(
        "Falha ao enviar e-mail de recuperacao:",
        emailError.message
      );
    }

    return res.json({
      success: true,
      message: MENSAGEM_RECUPERACAO,
    });
  } catch (error) {
    console.error("Erro ao recuperar senha:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
}

// Atualiza a senha quando o token ainda e valido.
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
    const tokenExpirado =
      Number.isNaN(expiracao.getTime()) || new Date() > expiracao;

    if (tokenExpirado) {
      return res.status(400).json({
        success: false,
        message: "O token expirou. Solicite a recuperacao novamente.",
      });
    }

    const senhaHash = passwordUtils.hashPassword(novaSenha);

    if (registroToken.perfil === "cliente") {
      await authDAO.atualizarSenhaCliente(
        registroToken.email,
        senhaHash
      );
    } else if (registroToken.perfil === "empresa") {
      await authDAO.atualizarSenhaEmpresa(
        registroToken.email,
        senhaHash
      );
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
