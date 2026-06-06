// Daniel e Rodrigo: Valida se o administrador está logado
function verificarAutenticacaoAdmin() {
    const adminId = localStorage.getItem("adminId");
    if (!adminId) {
        window.location.href = "../../login/html/login.html";
    }
}

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

// Daniel e Rodrigo: Busca os relatórios baseados no filtro selecionado e período de datas
async function buscarRelatorios(tipo = 'Geral', dataInicial = '', dataFinal = '') {
    try {
        const queryParams = new URLSearchParams({ tipo, dataInicial, dataFinal }).toString();
        const response = await fetch(`/api/relatorios?${queryParams}`);
        if (!response.ok) throw new Error('Erro na rede');
        
        const json = await response.json();
        if (json.success) {
            renderizarTabelaRelatorios(json.data);
        } else {
            throw new Error(json.message || 'Erro na resposta');
        }
    } catch (error) {
        // Fallback mock caso falte conexão ou dê erro na API
        renderizarTabelaRelatorios({
            usuariosCadastrados: "1.248",
            empresasAprovadas: "144",
            cancelamentos: "5.920"
        });
    }
}

// Daniel e Rodrigo: Inicia eventos
document.addEventListener('DOMContentLoaded', function() {
    verificarAutenticacaoAdmin();
    buscarRelatorios('Geral');

    const btnFiltrar = document.getElementById('btnFiltrar');
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', function(event) {
            event.preventDefault();
            const tipo = document.getElementById('TipoRelatorio').value;
            const dataInicial = document.getElementById('DataInicial').value;
            const dataFinal = document.getElementById('DataFinal').value;
            buscarRelatorios(tipo, dataInicial, dataFinal);
        });
    }
});
