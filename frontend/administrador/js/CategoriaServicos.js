// Daniel e Rodrigo: Esta função renderiza os dados na tabela
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
                <td>${categoria.nome}</td>
                <td>${categoria.descricao}</td>
                <td>${categoria.status}</td>
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

// Daniel e Rodrigo: Esta função busca as categorias do servidor ou usa dados mockados
async function buscarCategorias() {
    try {
        const resposta = await fetch('/api/categorias');
        if (!resposta.ok) throw new Error('Erro');
        const json = await resposta.json();
        
        if (json.success) {
            renderizarTabelaCategorias(json.data);
        } else {
            throw new Error(json.message || 'Falha na resposta da API');
        }
    } catch (e) {
        let mock = [
            { id: 1, nome: "Cabelo", descricao: "Serviços relacionados a corte e finalização.", status: "Ativa" },
            { id: 2, nome: "Unhas", descricao: "Serviços de manicure e pedicure.", status: "Ativa" },
            { id: 3, nome: "Estética Feminino", descricao: "Servicos de estetica corporal e facial feminina.", status: "Ativa" }
        ];
        renderizarTabelaCategorias(mock);
    }
}

// Daniel e Rodrigo: Esta função cuida do clique no botão de cadastrar
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

        if (!nome || !descricao) {
            alert('Preencha os campos!');
            return;
        }

        try {
            const resposta = await fetch('/api/categorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao, status })
            });

            if (!resposta.ok) throw new Error('Erro ao salvar categoria no banco');

            alert('Cadastrado com sucesso!');
            
            elNome.value = "";
            elDescricao.value = "";
            elStatus.value = "Ativa";

            buscarCategorias();
        } catch (e) {
            alert('Erro de conexão. Mock: Categoria adicionada.');
            
            elNome.value = "";
            elDescricao.value = "";
            
            buscarCategorias(); 
        }
    });
}

// Daniel e Rodrigo: Inicializa as funções quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    buscarCategorias();
    configurarCadastro();
});

