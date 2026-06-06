// Daniel e Rodrigo: Valida se o administrador está logado
function verificarAutenticacaoAdmin() {
    const adminId = localStorage.getItem("adminId");
    if (!adminId) {
        window.location.href = "../../login/html/login.html";
    }
}

// Controla se estamos em modo de edição
let categoriaEmEdicaoId = null;

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

// Daniel e Rodrigo: Esta função cuida do clique no botão de cadastrar/salvar
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

        const url = categoriaEmEdicaoId ? `/api/categorias/${categoriaEmEdicaoId}` : '/api/categorias';
        const metodo = categoriaEmEdicaoId ? 'PUT' : 'POST';

        try {
            const resposta = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao, status })
            });

            if (!resposta.ok) throw new Error('Erro ao salvar categoria no banco');
            const json = await resposta.json();

            if (json.success) {
                alert(categoriaEmEdicaoId ? 'Categoria atualizada com sucesso!' : 'Cadastrado com sucesso!');
                
                elNome.value = "";
                elDescricao.value = "";
                elStatus.value = "Ativa";
                categoriaEmEdicaoId = null;
                btnCadastrar.textContent = "Cadastrar Categoria";

                buscarCategorias();
            } else {
                throw new Error(json.message || 'Erro do servidor');
            }
        } catch (e) {
            alert(categoriaEmEdicaoId ? 'Erro ao atualizar (Simulado)' : 'Erro de conexão. Mock: Categoria adicionada.');
            
            elNome.value = "";
            elDescricao.value = "";
            elStatus.value = "Ativa";
            categoriaEmEdicaoId = null;
            btnCadastrar.textContent = "Cadastrar Categoria";
            
            buscarCategorias(); 
        }
    });
}

// Daniel e Rodrigo: Configura os botões de Editar e Excluir na tabela
function configurarAcoesTabela() {
    const tbody = document.getElementById('tabela-categorias');
    if (!tbody) return;

    tbody.addEventListener('click', async (evento) => {
        const botao = evento.target;
        const id = botao.getAttribute('data-id');
        if (!id) return;

        if (botao.classList.contains('BntEditar')) {
            const tr = document.getElementById(`categoria-${id}`);
            if (!tr) return;
            
            const nome = tr.cells[0].textContent;
            const descricao = tr.cells[1].textContent;
            const status = tr.cells[2].textContent;

            document.getElementById('NomeCategoria').value = nome;
            document.getElementById('DescricaoBloco').value = descricao;
            document.getElementById('SeletorAtividade').value = status === "Ativa" ? "Ativa" : "Inativa";

            categoriaEmEdicaoId = id;
            document.getElementById('btnCadastrarCategoria').textContent = "Salvar Alterações";
            document.getElementById('NomeCategoria').focus();
            
        } else if (botao.classList.contains('BntExcluirInativa')) {
            if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

            try {
                const resposta = await fetch(`/api/categorias/${id}`, {
                    method: 'DELETE'
                });
                const json = await resposta.json();
                
                if (json.success) {
                    alert(json.message || "Categoria excluída com sucesso!");
                    buscarCategorias();
                } else {
                    alert(json.message || "Erro ao excluir categoria.");
                }
            } catch (e) {
                alert("Erro ao se conectar com o servidor.");
            }
        }
    });
}

// Daniel e Rodrigo: Inicializa as funções quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacaoAdmin();
    buscarCategorias();
    configurarCadastro();
    configurarAcoesTabela();
});
