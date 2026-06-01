// =========================================================================
// Daniel e Rodrigo: Módulo de Categorias de Serviços
// =========================================================================
// ESTRATÉGIA DE INTEGRAÇÃO (Estudo Futuro):
// 1. Ciclo de Atualização Reativa: Após enviar novos dados via POST para a
//    API `/api/categorias`, em vez de simplesmente alertar ou atualizar a página
//    inteira, disparamos imediatamente a função assíncrona `buscarCategorias()`.
//    Isso garante que a tabela seja atualizada "em tempo real" via AJAX.
// 2. Limpeza de Formulário (Form Reset): Após o cadastro bem-sucedido, limpamos
//    os inputs do usuário para oferecer uma excelente experiência de uso (UX).
// =========================================================================

// Esta função renderiza os dados na tabela recebendo a lista de categorias do banco
function renderizarTabelaCategorias(categorias) {
    const tbody = document.getElementById('tabela-categorias');
    if (!tbody) return;
    
    tbody.innerHTML = "";

    if (!categorias || categorias.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nenhuma categoria cadastrada.</td></tr>`;
        return;
    }

    categorias.forEach(categoria => {
        const linha = `
            <tr id="categoria-${categoria.id}">
                <td><strong>${categoria.nome}</strong></td>
                <td>${categoria.descricao || 'Sem descrição'}</td>
                <td>
                    <span class="status-badge ${String(categoria.status).toLowerCase()}">
                        ${categoria.status}
                    </span>
                </td>
                <td class="AcoesTabela"> 
                    <div class="AgrupadorBotoes">
                        <button type="button" class="BntEditar" data-id="${categoria.id}">Editar</button>
                        <button type="button" class="BntExcluirInativa" data-id="${categoria.id}">Excluir/Inativa</button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += linha;
    });
}

// Busca as categorias do servidor ou usa dados mockados de fallback
async function buscarCategorias() {
    try {
        const resposta = await fetch('/api/categorias');
        if (!resposta.ok) throw new Error('Erro ao obter categorias');
        const json = await resposta.json();
        
        if (json.success) {
            renderizarTabelaCategorias(json.data);
        } else {
            throw new Error(json.message || 'Falha na resposta da API');
        }
    } catch (e) {
        console.warn('⚠️ Servidor de categorias inacessível. Usando mock local:', e.message);
        // Fallback didático em caso de banco offline
        let mock = [
            { id: 1, nome: "Cabelo", descricao: "Serviços relacionados a corte e finalização.", status: "Ativa" },
            { id: 2, nome: "Unhas", descricao: "Serviços de manicure e pedicure.", status: "Ativa" }
        ];
        renderizarTabelaCategorias(mock);
    }
}

// Configura o comportamento do formulário de cadastro de categorias
function configurarCadastro() {
    const btnCadastrar = document.getElementById('btnCadastrarCategoria');
    if (!btnCadastrar) return;

    btnCadastrar.addEventListener('click', async () => {
        const elNome = document.getElementById('NomeCategoria');
        const elDescricao = document.getElementById('DescricaoBloco');
        const elStatus = document.getElementById('SeletorAtividade');

        const nome = elNome.value.trim();
        const descricao = elDescricao.value.trim();
        const status = elStatus.value;

        // Validação no lado do cliente
        if (!nome || !descricao) {
            alert('Por favor, preencha o Nome e a Descrição da categoria!');
            return;
        }

        try {
            // Envia requisição estruturada POST com cabeçalho JSON
            const resposta = await fetch('/api/categorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao, status })
            });

            if (!resposta.ok) throw new Error('Erro ao salvar categoria no banco');

            alert('Categoria cadastrada com sucesso!');
            
            // UX Premium: Limpa o formulário após salvar com sucesso
            elNome.value = "";
            elDescricao.value = "";
            elStatus.value = "Ativa";

            // Recarrega dinamicamente a tabela sem recarregar a tela inteira
            buscarCategorias();
        } catch (e) {
            console.warn('⚠️ Cadastro de categoria simulado localmente (Backend offline):', e.message);
            alert('Erro de conexão ou servidor offline. Simulação: Categoria adicionada.');
            
            // UX Premium: Limpa o formulário também no fallback simulado
            elNome.value = "";
            elDescricao.value = "";
            
            buscarCategorias(); 
        }
    });
}

// Inicializa as funções quando a página carrega completamente
document.addEventListener('DOMContentLoaded', () => {
    buscarCategorias();
    configurarCadastro();
});

