// Daniel e Rodrigo: Função para preencher a tabela
function renderizarTabelaRelatorios(dados) {
    const tabela = document.getElementById('CorpoTabela');
    
    if (tabela) {
        tabela.innerHTML = "";

        const linhaHTML = `
            <tr>
                <td>${dados.usuariosCadastrados}</td>
                <td>${dados.empresasAprovadas}</td>
                <td>${dados.cancelamentos}</td>
            </tr>
        `;

        tabela.innerHTML = linhaHTML;
    }
}

// Daniel e Rodrigo: Busca os relatórios baseados no filtro selecionado
async function buscarRelatorios(tipo = 'Geral') {
    try {
        const response = await fetch(`/api/relatorios?tipo=${tipo}`);
        if (!response.ok) throw new Error('Erro na rede');
        
        const json = await response.json();
        if (json.success) {
            renderizarTabelaRelatorios(json.data);
        }
    } catch (error) {
        renderizarTabelaRelatorios({
            usuariosCadastrados: "1.248",
            empresasAprovadas: "144",
            cancelamentos: "5.920"
        });
    }
}

// Daniel e Rodrigo: Inicia eventos
document.addEventListener('DOMContentLoaded', function() {
    buscarRelatorios('Geral');

    const bntFiltrar = document.querySelector('button');
    if (bntFiltrar) {
        bntFiltrar.addEventListener('click', function(event) {
            event.preventDefault();
            const tipo = document.getElementById('TipoRelatorio').value;
            buscarRelatorios(tipo);
        });
    }
});
