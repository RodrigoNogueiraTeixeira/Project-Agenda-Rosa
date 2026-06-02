const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    connectionTimeout: 10000,  // 10 segundos para conectar
    greetingTimeout: 10000,    // 10 segundos para o handshake
    socketTimeout: 15000,      // 15 segundos para operações de socket
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function enviarEmailRecuperacao(to, linkRecuperacao) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("⚠️ SMTP_USER ou SMTP_PASS não configurados. Simulação do envio de e-mail:");
        console.log("=========================================");
        console.log(`Para: ${to}`);
        console.log(`Assunto: Recuperação de Senha - Agenda Rosa`);
        console.log(`Link: ${linkRecuperacao}`);
        console.log("=========================================");
        return true;
    }

    try {
        const info = await transporter.sendMail({
            from: '"Equipe Agenda Rosa" <' + process.env.SMTP_USER + '>',
            to: to,
            subject: "Recuperação de Senha - Agenda Rosa",
            text: `Você solicitou a recuperação da sua senha. Clique no link a seguir para redefinir: ${linkRecuperacao}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ff4da6; border-radius: 10px;">
                <h2 style="color: #ff4da6; text-align: center;">Agenda Rosa</h2>
                <p style="font-size: 16px; color: #333;">Olá,</p>
                <p style="font-size: 16px; color: #333;">Recebemos uma solicitação para redefinir a senha da sua conta.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${linkRecuperacao}" style="background-color: #ff4da6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Redefinir Minha Senha</a>
                </div>
                <p style="font-size: 14px; color: #666;">Se você não solicitou essa mudança, pode ignorar este e-mail.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
                <p style="font-size: 12px; color: #999; text-align: center;">© Agenda Rosa. Todos os direitos reservados.</p>
            </div>
            `
        });
        console.log("E-mail enviado: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Erro ao enviar e-mail:", error);
        throw error;
    }
}

module.exports = {
    enviarEmailRecuperacao
};
