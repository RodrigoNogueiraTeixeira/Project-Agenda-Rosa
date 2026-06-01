// Daniel e Rodrigo: Esta função cuida da recuperação de senha
function configurarRecuperacao() {
    let botao = document.getElementById('btn-recuperar-senha');
    
    botao.addEventListener('click', async () => {
        let email = document.getElementById('email-recuperacao').value;
        let perfil = document.getElementById('perfil-recuperacao').value;

        if (!email || !perfil) {
            alert('Por favor, informe o perfil e o e-mail.');
            return;
        }

        var API_BASE_URL = window.API_BASE_URL || localStorage.getItem("apiBaseUrl") || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:" ? "http://localhost:3001/api" : "/api");

        try {
            let resposta = await fetch(`${API_BASE_URL}/recuperar-senha`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email, perfil: perfil })
            });

            if (resposta.ok) {
                alert('Se o e-mail existir, você receberá um link de recuperação.');
            } else {
                alert('Erro ao processar solicitação.');
            }
        } catch (erro) {
            alert('Sem conexão com o backend. Simulando envio de e-mail de recuperação.');
        }
    });
}

// Daniel e Rodrigo: Chama a configuração ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    configurarRecuperacao();
});
