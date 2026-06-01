document.addEventListener('DOMContentLoaded', () => {
    const btnRedefinir = document.getElementById('btn-redefinir');
    const msgErro = document.getElementById('mensagem-erro');
    const msgSucesso = document.getElementById('mensagem-sucesso');
    const formContainer = document.getElementById('form-container');

    // Captura o token da URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        msgErro.textContent = "Link inválido. Nenhum token encontrado.";
        msgErro.style.display = 'block';
        formContainer.style.display = 'none';
        return;
    }

    btnRedefinir.addEventListener('click', async () => {
        const novaSenha = document.getElementById('nova-senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;

        msgErro.style.display = 'none';
        msgSucesso.style.display = 'none';

        if (!novaSenha || !confirmarSenha) {
            msgErro.textContent = "Por favor, preencha as duas senhas.";
            msgErro.style.display = 'block';
            return;
        }

        if (novaSenha !== confirmarSenha) {
            msgErro.textContent = "As senhas não coincidem.";
            msgErro.style.display = 'block';
            return;
        }

        try {
            const resposta = await fetch('/api/redefinir-senha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: token, novaSenha: novaSenha })
            });

            const dados = await resposta.json();

            if (resposta.ok && dados.success) {
                msgSucesso.textContent = "Senha redefinida com sucesso! Você já pode fazer login.";
                msgSucesso.style.display = 'block';
                formContainer.style.display = 'none'; // Esconde o form
            } else {
                msgErro.textContent = dados.message || "Erro ao redefinir a senha.";
                msgErro.style.display = 'block';
            }
        } catch (erro) {
            msgErro.textContent = "Erro de conexão. Tente novamente mais tarde.";
            msgErro.style.display = 'block';
        }
    });
});
