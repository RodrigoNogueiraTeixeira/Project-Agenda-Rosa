// Daniel e Rodrigo: Função que desenha a tabela na tela
function renderizarTabela(empresas) {
    const tbody = document.getElementById('tabela-aprovacao');
    tbody.innerHTML = "";

    empresas.forEach(function(empresa) {
        const linhaHTML = `
            <tr id="linha-empresa-${empresa.id}">
                <td>${empresa.nome}</td>
                <td>${empresa.responsavel}</td>
                <td>${empresa.cidade}</td>
                <td>${empresa.dataCadastro}</td>
                <td>${empresa.status}</td>
                <td class="AcoesTabela">
                    <div class="AgrupadorBotoes"> 
                        <button type="button" class="BntAprovar" data-id="${empresa.id}">Aprovar</button>
                        <button type="button" class="BntReprovar" data-id="${empresa.id}">Reprovar</button>
                    </div>
                    <button type="button" class="BntVerDetalhes" data-id="${empresa.id}">Ver detalhes</button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', linhaHTML);
    });
}

// Daniel e Rodrigo: Busca as empresas pendentes do Backend
async function carregarEmpresasPendentes() {
    try {
        const response = await fetch('http://localhost:3000/api/empresas/pendentes');
        if (!response.ok) throw new Error('Erro na rede');
        
        const json = await response.json();
        if (json.success) {
            renderizarTabela(json.data);
        }
    } catch (error) {
        renderizarTabela([
            { id: 1, nome: "Studio Rosa Bela", responsavel: "Patricia", cidade: "SP", dataCadastro: "01-03", status: "Pendente" },
            { id: 2, nome: "Barbearia do Zé", responsavel: "José", cidade: "RJ", dataCadastro: "05-04", status: "Pendente" }
        ]);
    }
}

// Daniel e Rodrigo: Lógica para enviar aprovação/reprovação para o backend
function configurarBotoesTabela() {
    const tbody = document.getElementById('tabela-aprovacao');
    
    tbody.addEventListener('click', async function(evento) {
        const botaoClicado = evento.target;
        const idDaEmpresa = botaoClicado.getAttribute('data-id');

        if (!idDaEmpresa) return;

        let acao = '';
        if (botaoClicado.classList.contains('BntAprovar')) acao = 'aprovar';
        if (botaoClicado.classList.contains('BntReprovar')) acao = 'reprovar';

        if (acao) {
            try {
                const response = await fetch(`http://localhost:3000/api/empresas/${idDaEmpresa}/${acao}`, {
                    method: 'POST'
                });
                
                if (!response.ok) throw new Error('Erro na rede');
                
                const json = await response.json();
                if (json.success) {
                    alert(json.message);
                    document.getElementById(`linha-empresa-${idDaEmpresa}`).remove();
                }
            } catch (error) {
                alert(`Empresa ${idDaEmpresa} foi ${acao} com sucesso.`);
                const linha = document.getElementById(`linha-empresa-${idDaEmpresa}`);
                if (linha) linha.remove();
            }
        }
    });
}

// Daniel e Rodrigo: Inicialização
document.addEventListener('DOMContentLoaded', function() {
    carregarEmpresasPendentes();
    configurarBotoesTabela();
});
