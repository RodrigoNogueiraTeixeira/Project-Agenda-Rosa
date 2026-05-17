const { get } = require("../../config/database");

async function recuperarSenha(req, res) {
    try {
        const { email, perfil } = req.body;

        if (!email || !perfil) {
            return res.status(400).json({ success: false, message: "E-mail e perfil são obrigatórios." });
        }

        let usuario = null;
        if (perfil.toLowerCase() === "cliente") {
            usuario = await get("SELECT id FROM clientes WHERE LOWER(email) = LOWER(?)", [email]);
        } else if (perfil.toLowerCase() === "empresa") {
            usuario = await get("SELECT id FROM empresas WHERE LOWER(email) = LOWER(?)", [email]);
        } else {
            usuario = { id: 999 };
        }

        res.json({ success: true, message: "Solicitação processada com sucesso." });
    } catch (error) {
        console.error("Erro ao recuperar senha:", error);
        res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
}

module.exports = {
    recuperarSenha
};
