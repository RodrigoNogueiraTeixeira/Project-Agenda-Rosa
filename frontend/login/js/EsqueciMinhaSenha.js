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

        // Feedback visual: desabilita o botão durante o processamento
        var textoOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = 'Enviando...';

        var API_BASE_URL = (window.API_BASE_URL || localStorage.getItem("apiBaseUrl") || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:" ? "http://localhost:3001/api" : "/api")).replace(/\/+$/, '');

        var urlFinal = API_BASE_URL + "/recuperar-senha";

        // Timeout de 25 segundos para nao travar o browser indefinidamente
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 25000);

        try {
            let resposta = await fetch(urlFinal, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, perfil: perfil }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (resposta.ok) {
                alert('Link de recuperação enviado! Verifique a caixa de entrada do seu e-mail.');
            } else {
                var dados = await resposta.json().catch(function() { return {}; });
                alert(dados.message || 'Erro ao processar solicitação. Tente novamente.');
            }
        } catch (erro) {
            clearTimeout(timeoutId);
            if (erro.name === 'AbortError') {
                alert('O servidor demorou demais para responder. Tente novamente em alguns instantes.');
            } else {
                alert('Erro de conexão. Verifique sua internet e tente novamente.');
            }
        } finally {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        }
    });
}

// Daniel e Rodrigo: Chama a configuração ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    configurarRecuperacao();
});
