// =========================================================================
// Daniel e Rodrigo: Módulo de Relatórios Básicos do Administrador
// =========================================================================
// ESTRATÉGIA DE INTEGRAÇÃO (Estudo Futuro):
// 1. Filtros Parametrizados (Query Strings): A busca envia parâmetros via URL
//    (ex: `?tipo=${tipo}`). O backend capta esses parâmetros por meio de `req.query.tipo`
//    e retorna os dados recalculados a partir do banco de dados PostgreSQL.
// 2. Arquitetura Desacoplada: O frontend desconhece a lógica interna de consultas do banco;
//    ele apenas solicita o recurso '/api/relatorios' e renderiza a resposta.
// =========================================================================

// Função para preencher a tabela de indicadores com os dados recebidos da API
function renderizarTabelaRelatorios(dados) {
    const tabela = document.getElementById('CorpoTabela');
    
    if (tabela) {
        tabela.innerHTML = "";

        const linhaHTML = `
            <tr>
                <td><strong>${dados.usuariosCadastrados || '0'}</strong></td>
                <td><strong>${dados.empresasAprovadas || '0'}</strong></td>
                <td><strong>${dados.cancelamentos || '0'}</strong></td>
            </tr>
        `;

        tabela.innerHTML = linhaHTML;
    }
}

// Busca os relatórios baseados no filtro selecionado (Geral, Usuários, Empresas, etc.)
async function buscarRelatorios(tipo = 'Geral') {
    try {
        // Envia o filtro na query string da URL relativo à raiz
        const response = await fetch(`/api/relatorios?tipo=${tipo}`);
        if (!response.ok) throw new Error('Falha na rede ao carregar relatório');
        
        const json = await response.json();
        if (json.success) {
            renderizarTabelaRelatorios(json.data);
        } else {
            throw new Error(json.message || 'Erro na resposta do backend');
        }
    } catch (error) {
        console.warn('⚠️ Backend inacessível para relatórios. Carregando simulação didática:', error.message);
        // Fallback didático em caso de banco offline
        renderizarTabelaRelatorios({
            usuariosCadastrados: "1.248",
            empresasAprovadas: "144",
            cancelamentos: "5.920"
        });
    }
}

// Registro dos ouvintes de eventos da página de relatórios
document.addEventListener('DOMContentLoaded', function() {
    // Carrega o relatório geral inicialmente
    buscarRelatorios('Geral');

    const bntFiltrar = document.querySelector('button');
    if (bntFiltrar) {
        bntFiltrar.addEventListener('click', function(event) {
            // Previne o recarregamento padrão da página ao submeter o formulário
            event.preventDefault();
            
            const tipo = document.getElementById('TipoRelatorio').value;
            buscarRelatorios(tipo);
        });
    }
});

