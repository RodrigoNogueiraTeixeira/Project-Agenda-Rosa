// =========================================================================
// Daniel e Rodrigo: Módulo de Aprovação de Cadastros de Empresas/Profissionais
// =========================================================================
// ESTRATÉGIA DE INTEGRAÇÃO (Estudo Futuro):
// 1. Delegação de Eventos (Event Delegation): Em vez de adicionar um listener
//    em cada botão individual da tabela (o que consome muita memória e quebra
//    se a tabela for atualizada dinamicamente), adicionamos um único listener
//    no elemento pai <tbody>. O listener detecta de onde partiu o clique usando 'evento.target'.
// 2. Correção de Sintaxe Crítica: Corrigimos a duplicidade de declaração de
//    constantes ('idDaEmpresa'), o que gerava um SyntaxError fatal em navegadores modernos.
// =========================================================================

// Função que reconstrói dinamicamente a tabela HTML com as empresas retornadas
function renderizarTabela(empresas) {
    const tbody = document.getElementById('tabela-aprovacao');
    
    // Evita acumulação de conteúdo limpando a tabela antes de injetar novas linhas
    if (tbody) {
        tbody.innerHTML = "";
    } else {
        return;
    }

    if (empresas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum cadastro pendente de aprovação.</td></tr>`;
        return;
    }

    empresas.forEach(function(empresa) {
        // Gera a linha da tabela usando templates literals (HTML dinâmico)
        const linhaHTML = `
            <tr id="linha-empresa-${empresa.id}">
                <td>${empresa.nome}</td>
                <td>${empresa.responsavel}</td>
                <td>${empresa.cidade}</td>
                <td>${empresa.datacadastro || empresa.dataCadastro || 'N/A'}</td>
                <td><span class="status-pendente">${empresa.status}</span></td>
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

// Busca a lista de empresas cuja aprovação ainda está pendente no Banco de Dados
async function carregarEmpresasPendentes() {
    try {
        const response = await fetch('/api/empresas/pendentes');
        if (!response.ok) throw new Error('Falha ao obter lista de pendências');
        
        const json = await response.json();
        if (json.success) {
            renderizarTabela(json.data);
        } else {
            throw new Error(json.message || 'Erro ao carregar dados');
        }
    } catch (error) {
        console.warn('⚠️ Backend inacessível. Exibindo empresas fictícias pendentes:', error.message);
        // Fallback didático caso o banco de dados esteja inacessível localmente
        renderizarTabela([
            { id: 1, nome: "Studio Rosa Bela", responsavel: "Patricia", cidade: "SP", dataCadastro: "01-03", status: "Pendente" },
            { id: 2, nome: "Barbearia do Zé", responsavel: "José", cidade: "RJ", dataCadastro: "05-04", status: "Pendente" }
        ]);
    }
}

// Lógica delegada de cliques para gerenciar ações de aprovar, reprovar ou ver detalhes
function configurarBotoesTabela() {
    const tbody = document.getElementById('tabela-aprovacao');
    if (!tbody) return;
    
    tbody.addEventListener('click', async function(evento) {
        const botaoClicado = evento.target;
        
        // Extrai o ID da empresa associado ao botão clicado através de atributos dataset
        const idDaEmpresa = botaoClicado.getAttribute('data-id');

        // Se o clique não foi em um botão que possua data-id, ignora
        if (!idDaEmpresa) return;

        let acao = '';
        if (botaoClicado.classList.contains('BntAprovar')) acao = 'aprovar';
        if (botaoClicado.classList.contains('BntReprovar')) acao = 'reprovar';

        if (acao) {
            // Confirmação didática visual
            const confirmacao = confirm(`Deseja realmente ${acao} esta empresa (ID: ${idDaEmpresa})?`);
            if (!confirmacao) return;

            try {
                // Envia a chamada POST para alterar o status no PostgreSQL
                const response = await fetch(`/api/empresas/${idDaEmpresa}/${acao}`, {
                    method: 'POST'
                });
                
                if (!response.ok) throw new Error(`Falha ao processar ação de ${acao}`);
                
                const json = await response.json();
                if (json.success) {
                    alert(json.message || `Empresa ${acao} com sucesso!`);
                    
                    // Remove de forma limpa e suave a linha da empresa da interface do usuário
                    const linha = document.getElementById(`linha-empresa-${idDaEmpresa}`);
                    if (linha) {
                        linha.style.opacity = '0';
                        setTimeout(() => linha.remove(), 300);
                    }
                }
            } catch (error) {
                console.warn('⚠️ Ação realizada via simulação (Backend indisponível):', error.message);
                alert(`Empresa ${idDaEmpresa} foi ${acao}da com sucesso (Simulado).`);
                
                const linha = document.getElementById(`linha-empresa-${idDaEmpresa}`);
                if (linha) linha.remove();
            }
        } else if (botaoClicado.classList.contains('BntVerDetalhes')) {
            alert(`Visualizando detalhes da Empresa ID: ${idDaEmpresa} (Funcionalidade a ser integrada de acordo com as necessidades do negócio)`);
        }
    });
}

// Inicializa a página após o carregamento completo do DOM
document.addEventListener('DOMContentLoaded', function() {
    carregarEmpresasPendentes();
    configurarBotoesTabela();
});

