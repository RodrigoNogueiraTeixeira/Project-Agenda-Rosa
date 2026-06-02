// Daniel e Rodrigo: Esta função cuida da recuperação de senha

document.addEventListener('DOMContentLoaded', function() {
    var botao = document.getElementById('btn-recuperar-senha');

    if (!botao) {
        console.error('[EsqueciMinhaSenha] Botão não encontrado no DOM.');
        return;
    }

    botao.addEventListener('click', function() {
        var email = document.getElementById('email-recuperacao').value.trim();
        var perfil = document.getElementById('perfil-recuperacao').value.trim();

        if (!email || !perfil) {
            alert('Por favor, informe o perfil e o e-mail.');
            return;
        }

        var textoOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = 'Enviando...';

        var API_BASE_URL = '/api';
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            API_BASE_URL = 'http://localhost:3001/api';
        }

        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 25000);

        fetch(API_BASE_URL + '/recuperar-senha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, perfil: perfil }),
            signal: controller.signal
        })
        .then(function(resposta) {
            clearTimeout(timeoutId);
            return resposta.json();
        })
        .then(function(dados) {
            if (dados.success) {
                alert('Link enviado! Verifique sua caixa de entrada.');
            } else {
                alert(dados.message || 'Erro ao processar solicitação.');
            }
        })
        .catch(function(erro) {
            clearTimeout(timeoutId);
            if (erro.name === 'AbortError') {
                alert('O servidor demorou demais. Tente novamente.');
            } else {
                alert('Erro de conexão: ' + erro.message);
            }
        })
        .finally(function() {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        });
    });
});
