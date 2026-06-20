
// Interceptador de Fetch para injetar Token JWT
if (!window.fetchIntercepted) {
    const originalFetch = window.fetch;
    window.fetch = async function () {
        let [resource, config] = arguments;
        if(!config) config = {};
        
        // Trata o caso em que headers é um Headers object nativo
        if (config.headers instanceof Headers) {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers.append("Authorization", "Bearer " + token);
            }
        } else {
            if(!config.headers) config.headers = {};
            const token = localStorage.getItem("token");
            if(token) {
                config.headers["Authorization"] = "Bearer " + token;
            }
        }
        
        return originalFetch(resource, config);
    };
    window.fetchIntercepted = true;
}

// Daniel e Rodrigo: Valida se o administrador está logado
function verificarAutenticacaoAdmin() {
    const adminId = localStorage.getItem("adminId");
    if (!adminId) {
        window.location.href = "../../login/html/login.html";
    }
}

// Daniel e Rodrigo: Configura o botão de logout e limpa os dados locais de login do admin
function configurarLogout() {
    // Procura o link de "Sair" (redireciona para o login)
    const btnSair = document.querySelector('a[href*="login.html"]');
    if (btnSair) {
        btnSair.addEventListener('click', function() {
            localStorage.removeItem("adminId");
            localStorage.removeItem("adminNome");
            localStorage.removeItem("adminEmail");
        });
    }
}

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
        const dataInicial = document.getElementById('data-inicial')?.value || '';
        const dataFinal = document.getElementById('data-final')?.value || '';
        
        let url = '/api/dashboard/stats';
        if (dataInicial && dataFinal) {
            url += `?dataInicial=${encodeURIComponent(dataInicial)}&dataFinal=${encodeURIComponent(dataFinal)}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro na rede');
        
        const json = await response.json();
        if (json.success) {
            renderizarDadosDashboard(json.data);
        }
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        const ids = ['TClientesCadastrados', 'TotalEmpresasProfissionaisCadastrados', 'AprovacoesPendentesEmpresas', 'AgendamentosTotais', 'AgendamentosPorPeriodo'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = "Indisponível";
        });
    }
}

// Daniel e Rodrigo: Eventos de inicialização
document.addEventListener('DOMContentLoaded', function() {
    verificarAutenticacaoAdmin();
    configurarLogout();

    // Define datas padrão nos inputs (primeiro dia do mês corrente até hoje)
    const inputDataInicial = document.getElementById('data-inicial');
    const inputDataFinal = document.getElementById('data-final');
    
    if (inputDataInicial && inputDataFinal) {
        const hojeObj = new Date();
        const ano = hojeObj.getFullYear();
        const mes = String(hojeObj.getMonth() + 1).padStart(2, '0');
        const dia = String(hojeObj.getDate()).padStart(2, '0');
        
        if (!inputDataInicial.value) {
            inputDataInicial.value = `${ano}-${mes}-01`;
        }
        if (!inputDataFinal.value) {
            inputDataFinal.value = `${ano}-${mes}-${dia}`;
        }
    }

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
                console.error("Erro ao aplicar período no dashboard:", error);
                alert("Erro ao tentar aplicar o filtro de datas.");
                const elAgendamentosPeriodo = document.getElementById('AgendamentosPorPeriodo');
                if (elAgendamentosPeriodo) elAgendamentosPeriodo.textContent = "Indisponível";
            }
        });
    }
});
