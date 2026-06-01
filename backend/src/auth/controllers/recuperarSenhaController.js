const authDAO = require("../dao/authDAO");
const emailUtils = require("../../utils/emailUtils");
const passwordUtils = require("../../utils/password");
const { v4: uuidv4 } = require("uuid");

async function recuperarSenha(req, res) {
    try {
        const { email, perfil } = req.body;

        if (!email || !perfil) {
            return res.status(400).json({ success: false, message: "E-mail e perfil são obrigatórios." });
        }

        let usuario = null;
        if (perfil.toLowerCase() === "cliente") {
            usuario = await authDAO.buscarClientePorEmail(email);
        } else if (perfil.toLowerCase() === "empresa") {
            usuario = await authDAO.buscarEmpresaPorEmail(email);
        }

        // Para evitar enumeração de usuários, retornamos sucesso mesmo se o e-mail não existir
        if (!usuario) {
            return res.json({ success: true, message: "Se o e-mail existir na nossa base, você receberá um link de recuperação." });
        }

        const token = uuidv4();
        const expiracao = new Date(Date.now() + 3600000).toISOString(); // 1 hora a partir de agora

        await authDAO.salvarTokenRecuperacao(email, perfil.toLowerCase(), token, expiracao);

        // Gera a URL do frontend
        const protocol = req.protocol === 'https' || req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const host = req.headers.host;
        const frontendUrl = `${protocol}://${host}/login/html/RedefinirSenha.html?token=${token}`;

        await emailUtils.enviarEmailRecuperacao(email, frontendUrl);

        res.json({ success: true, message: "Se o e-mail existir na nossa base, você receberá um link de recuperação." });
    } catch (error) {
        console.error("Erro ao recuperar senha:", error);
        res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
}

async function redefinirSenha(req, res) {
    try {
        const { token, novaSenha } = req.body;

        if (!token || !novaSenha) {
            return res.status(400).json({ success: false, message: "Token e nova senha são obrigatórios." });
        }

        const registroToken = await authDAO.buscarTokenRecuperacao(token);

        if (!registroToken) {
            return res.status(400).json({ success: false, message: "Token inválido." });
        }

        if (registroToken.utilizado === 1) {
            return res.status(400).json({ success: false, message: "Este token já foi utilizado." });
        }

        const agora = new Date();
        const dataExpiracao = new Date(registroToken.expiracao);
        if (agora > dataExpiracao) {
            return res.status(400).json({ success: false, message: "O token expirou. Solicite a recuperação novamente." });
        }

        if (registroToken.perfil === "cliente") {
            // Cliente usa senha em texto puro conforme combinado no plano
            await authDAO.atualizarSenhaCliente(registroToken.email, novaSenha);
        } else if (registroToken.perfil === "empresa") {
            // Empresa usa hash
            const senhaHash = await passwordUtils.hashPassword(novaSenha);
            await authDAO.atualizarSenhaEmpresa(registroToken.email, senhaHash);
        } else {
            return res.status(400).json({ success: false, message: "Perfil inválido associado a este token." });
        }

        await authDAO.marcarTokenUtilizado(token);

        res.json({ success: true, message: "Senha redefinida com sucesso." });
    } catch (error) {
        console.error("Erro ao redefinir senha:", error);
        res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
}

module.exports = {
    recuperarSenha,
    redefinirSenha
};
