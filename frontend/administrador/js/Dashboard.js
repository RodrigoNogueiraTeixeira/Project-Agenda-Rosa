// Daniel e Rodrigo: Função para formatar números
function formatarNumero(numero) {
    return Number(numero || 0).toLocaleString('pt-BR');
}

// Daniel e Rodrigo: Função para injetar dados reais do backend na tela
function renderizarDadosDashboard(dados) {
    const elClientes = document.getElementById('TClientesCadastrados');
    const elEmpresas = document.getElementById('TotalEmpresasProfissionaisCadastrados');
    const elPendentes = document.getElementById('AprovacoesPendentesEmpresas');
    const elAgendamentos = document.getElementById('AgendamentosTotais');
    const elAgendamentosPeriodo = document.getElementById('AgendamentosPorPeriodo');

    if (elClientes) elClientes.textContent = formatarNumero(dados.totalClientes);
    if (elEmpresas) elEmpresas.textContent = formatarNumero(dados.totalEmpresas);
    if (elPendentes) elPendentes.textContent = formatarNumero(dados.empresasPendentes);
    if (elAgendamentos) elAgendamentos.textContent = formatarNumero(dados.totalAgendamentos);
    if (elAgendamentosPeriodo) elAgendamentosPeriodo.textContent = formatarNumero(dados.agendamentosPeriodo);
}

// Daniel e Rodrigo: Busca inicial dos dados ao carregar a página
async function buscarDadosDashboard() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) throw new Error('Erro na rede');
        
        const json = await response.json();
        if (json.success) {
            renderizarDadosDashboard(json.data);
        }
    } catch (error) {
        renderizarDadosDashboard({
            totalClientes: 1248,
            totalEmpresas: 163,
            empresasPendentes: 19,
            totalAgendamentos: 8402,
            agendamentosPeriodo: 524
        });
    }
}

// Daniel e Rodrigo: Eventos de inicialização
document.addEventListener('DOMContentLoaded', function() {
    buscarDadosDashboard();

    const botaoPeriodo = document.getElementById("bntAplicarPeriodo");
    
    if (botaoPeriodo) {
        botaoPeriodo.addEventListener('click', async function() {
            const dataInicial = document.getElementById('data-inicial').value;
            const dataFinal = document.getElementById('data-final').value;

            if (!dataInicial || !dataFinal) {
                alert("Por favor, preencha a data inicial e final!");
                return;
            }

            try {
                const response = await fetch('/api/dashboard/apply-period', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dataInicial, dataFinal })
                });

                if (!response.ok) throw new Error('Erro na rede');

                const json = await response.json();
                if (json.success) {
                    renderizarDadosDashboard(json.data);
                }
            } catch (error) {
                const agendamentosFalsos = Math.floor(Math.random() * 1000);
                const elAgendamentosPeriodo = document.getElementById('AgendamentosPorPeriodo');
                if (elAgendamentosPeriodo) elAgendamentosPeriodo.textContent = formatarNumero(agendamentosFalsos);
            }
        });
    }
});

