// Utilizando a API nativa 'fetch' (disponível no Node.js 18+) para comunicar com o Brevo via HTTP,
// contornando o bloqueio de portas SMTP do Render Free.

async function enviarEmailRecuperacao(to, linkRecuperacao) {
    if (!process.env.BREVO_API_KEY) {
        console.warn("⚠️ BREVO_API_KEY não configurada. Simulação do envio de e-mail:");
        console.log("=========================================");
        console.log(`Para: ${to}`);
        console.log(`Assunto: Recuperação de Senha - Agenda Rosa`);
        console.log(`Link: ${linkRecuperacao}`);
        console.log("=========================================");
        return true;
    }

    // O email de remetente DEVE ser o mesmo que foi validado no painel do Brevo.
    // Estamos pegando da variável de ambiente ou usando o padrão que vimos na sua tela.
    const remetenteEmail = process.env.BREVO_SENDER_EMAIL || 'digo22nt@gmail.com';

    const url = 'https://api.brevo.com/v3/smtp/email';

    const body = {
        sender: {
            name: "Agenda Rosa",
            email: remetenteEmail
        },
        to: [
            { email: to }
        ],
        subject: "Recuperação de Senha - Agenda Rosa",
        htmlContent: `
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
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erro da API do Brevo:", errorData);
            throw new Error(`Falha ao enviar e-mail via Brevo: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("E-mail enviado com sucesso pelo Brevo. MessageId:", data.messageId);
        return true;
    } catch (error) {
        console.error("Erro ao conectar com a API de e-mail:", error);
        throw error; // Lança o erro para que o catch no controlador pegue
    }
}

module.exports = {
    enviarEmailRecuperacao
};
