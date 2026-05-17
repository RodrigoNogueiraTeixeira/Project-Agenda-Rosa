// Daniel e Rodrigo: Esta função renderiza os dados na tabela
function renderizarTabelaCategorias(categorias) {
    const tbody = document.getElementById('tabela-categorias');
    tbody.innerHTML = "";

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
        renderizarTabelaCategorias(json.data);
    } catch (e) {
        let mock = [
            { id: 1, nome: "Cabelo", descricao: "Serviços relacionados a corte e finalização.", status: "Ativa" },
            { id: 2, nome: "Unhas", descricao: "Serviços de manicure e pedicure.", status: "Ativa" }
        ];
        renderizarTabelaCategorias(mock);
    }
}

// Daniel e Rodrigo: Esta função cuida do clique no botão de cadastrar
function configurarCadastro() {
    document.getElementById('btnCadastrarCategoria').addEventListener('click', async () => {
        let nome = document.getElementById('NomeCategoria').value;
        let descricao = document.getElementById('DescricaoBloco').value;
        let status = document.getElementById('SeletorAtividade').value;

        if (!nome || !descricao) {
            alert('Preencha os campos!');
            return;
        }

        try {
            await fetch('/api/categorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao, status })
            });
            alert('Cadastrado com sucesso!');
            buscarCategorias();
        } catch (e) {
            alert('Erro de conexão. Mock: Categoria adicionada.');
            buscarCategorias(); 
        }
    });
}

// Daniel e Rodrigo: Inicializa as funções quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    buscarCategorias();
    configurarCadastro();
});
