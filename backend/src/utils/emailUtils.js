async function enviarEmailRecuperacao(destinatario, linkRecuperacao) {
  const apiKey = String(process.env.BREVO_API_KEY || "").trim();
  const remetenteEmail = String(process.env.BREVO_SENDER_EMAIL || "").trim();

  if (!apiKey) {
    throw new Error("BREVO_API_KEY nao configurada.");
  }

  if (!remetenteEmail) {
    throw new Error("BREVO_SENDER_EMAIL nao configurado.");
  }

  const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: "Agenda Rosa",
        email: remetenteEmail,
      },
      to: [{ email: destinatario }],
      subject: "Recuperacao de senha - Agenda Rosa",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ff4da6;">Agenda Rosa</h2>
          <p>Recebemos uma solicitacao para redefinir a senha da sua conta.</p>
          <p>
            <a href="${linkRecuperacao}" style="background: #ff4da6; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              Redefinir minha senha
            </a>
          </p>
          <p>O link expira em uma hora. Se voce nao solicitou a alteracao, ignore este e-mail.</p>
        </div>
      `,
    }),
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(
      dados.message ||
      `Falha ao enviar e-mail via Brevo: ${resposta.status}`
    );
  }

  return true;
}

module.exports = {
  enviarEmailRecuperacao,
};
