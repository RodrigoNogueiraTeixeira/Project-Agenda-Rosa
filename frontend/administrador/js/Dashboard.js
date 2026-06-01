// =========================================================================
// Daniel e Rodrigo: Módulo do Dashboard - Painel Administrativo Geral
// =========================================================================
// ESTRATÉGIA DE INTEGRAÇÃO (Estudo Futuro):
// 1. Desacoplamento de URL: Usamos caminhos relativos como '/api/dashboard/stats'
//    em vez de URLs absolutas ('http://localhost:3001...'). Isso garante que o
//    frontend funcione automaticamente tanto em desenvolvimento (localhost)
//    quanto em produção (Render, Vercel, etc.) sem alterar o código.
// 2. Resiliência a Falhas (Fallback): Caso o backend esteja fora do ar, o bloco
//    'catch' intercepta o erro e renderiza dados mockados para que a interface
//    não quebre ou fique em branco.
// =========================================================================

// Função para formatar números usando as regras de localização do Brasil (ex: 1248 -> 1.248)
function formatarNumero(numero) {
    return Number(numero || 0).toLocaleString('pt-BR');
}

// Função responsável por atualizar os elementos DOM com os dados retornados pela API
function renderizarDadosDashboard(dados) {
    // Captura os elementos HTML da tela pelos IDs únicos
    const elClientes = document.getElementById('TClientesCadastrados');
    const elEmpresas = document.getElementById('TotalEmpresasProfissionaisCadastrados');
    const elPendentes = document.getElementById('AprovacoesPendentesEmpresas');
    const elAgendamentos = document.getElementById('AgendamentosTotais');
    const elAgendamentosPeriodo = document.getElementById('AgendamentosPorPeriodo');

    // Injeta os valores formatados apenas se o elemento existir no HTML
    if (elClientes) elClientes.textContent = formatarNumero(dados.totalClientes);
    if (elEmpresas) elEmpresas.textContent = formatarNumero(dados.totalEmpresas);
    if (elPendentes) elPendentes.textContent = formatarNumero(dados.empresasPendentes);
    if (elAgendamentos) elAgendamentos.textContent = formatarNumero(dados.totalAgendamentos);
    if (elAgendamentosPeriodo) elAgendamentosPeriodo.textContent = formatarNumero(dados.agendamentosPeriodo);
}

// Chamada assíncrona (Async/Await) para buscar as estatísticas gerais do Banco de Dados
async function buscarDadosDashboard() {
    try {
        // Envia uma requisição HTTP GET para a rota exposta pelo backend
        const response = await fetch('/api/dashboard/stats');
        
        // Se a resposta HTTP falhar (ex: 404, 500), gera uma exceção para cair no catch
        if (!response.ok) throw new Error('Erro na comunicação com o servidor');
        
        const json = await response.json();
        
        // Se a requisição de banco de dados no backend obteve sucesso, atualiza a tela
        if (json.success) {
            renderizarDadosDashboard(json.data);
        } else {
            throw new Error(json.message || 'Falha ao buscar dados');
        }
    } catch (error) {
        console.warn('⚠️ Backend inacessível. Usando dados mockados para exibição segura:', error.message);
        // Fallback didático: Garante dados fictícios em caso de banco offline
        renderizarDadosDashboard({
            totalClientes: 1248,
            totalEmpresas: 163,
            empresasPendentes: 19,
            totalAgendamentos: 8402,
            agendamentosPeriodo: 524
        });
    }
}

// Registro dos ouvintes de eventos após o carregamento completo do DOM
document.addEventListener('DOMContentLoaded', function() {
    // Carrega os dados iniciais do Dashboard
    buscarDadosDashboard();

    const botaoPeriodo = document.getElementById("bntAplicarPeriodo");
    
    if (botaoPeriodo) {
        // Evento de clique para filtrar agendamentos por intervalo de datas
        botaoPeriodo.addEventListener('click', async function() {
            const dataInicial = document.getElementById('data-inicial').value;
            const dataFinal = document.getElementById('data-final').value;

            // Validação simples do lado do cliente antes de enviar ao servidor
            if (!dataInicial || !dataFinal) {
                alert("Por favor, preencha a data inicial e final!");
                return;
            }

            try {
                // Envia dados estruturados em formato JSON usando o método POST
                const response = await fetch('/api/dashboard/apply-period', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dataInicial, dataFinal })
                });

                if (!response.ok) throw new Error('Erro ao filtrar período');

                const json = await response.json();
                if (json.success) {
                    // Atualiza o painel com os dados recalculados pelo banco
                    renderizarDadosDashboard(json.data);
                }
            } catch (error) {
                console.warn('⚠️ Fallback de filtro de data ativado:', error.message);
                // Caso falhe, gera uma simulação visual para manter a interatividade
                const agendamentosFalsos = Math.floor(Math.random() * 1000);
                const elAgendamentosPeriodo = document.getElementById('AgendamentosPorPeriodo');
                if (elAgendamentosPeriodo) elAgendamentosPeriodo.textContent = formatarNumero(agendamentosFalsos);
            }
        });
    }
});

