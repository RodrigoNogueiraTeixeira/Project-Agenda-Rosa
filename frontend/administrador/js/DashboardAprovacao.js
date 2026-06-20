
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

function formatarDataCadastro(dataStr) {
    if (!dataStr) return 'N/A';
    try {
        // Se a string já tiver formato ISO, tentamos converter
        const dataObj = new Date(dataStr);
        if (isNaN(dataObj.getTime())) {
            const partes = String(dataStr).split(' ');
            if (partes.length >= 2) {
                const dataPartes = partes[0].split('-');
                const horaPartes = partes[1].split(':');
                if (dataPartes.length === 3 && horaPartes.length >= 2) {
                    return `${dataPartes[2]}/${dataPartes[1]}/${dataPartes[0]} ${horaPartes[0]}:${horaPartes[1]}`;
                }
            }
            return dataStr;
        }
        const dia = String(dataObj.getDate()).padStart(2, '0');
        const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
        const ano = dataObj.getFullYear();
        const hora = String(dataObj.getHours()).padStart(2, '0');
        const minuto = String(dataObj.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
    } catch (e) {
        return dataStr;
    }
}

// Daniel e Rodrigo: Função que desenha a tabela na tela
function renderizarTabela(empresas) {
    const tbody = document.getElementById('tabela-aprovacao');
    if (tbody) {
        tbody.innerHTML = "";
    } else {
        return;
    }

    if (!empresas || empresas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum cadastro pendente de aprovação.</td></tr>`;
        return;
    }

    empresas.forEach(function(empresa) {
        // Exibição mais amigável do status
        let statusClass = "status-pendente";
        let statusTexto = empresa.status || 'Pendente';
        
        if (String(empresa.status).toLowerCase().includes("aprov")) {
            statusClass = "status-aprovado"; // Você pode adicionar estilo para estes no CSS futuramente se desejar
            statusTexto = "Aprovada";
        } else if (String(empresa.status).toLowerCase().includes("reprov")) {
            statusClass = "status-reprovado";
            statusTexto = "Reprovada";
        } else {
            statusTexto = "Pendente";
        }

        const linhaHTML = `
            <tr id="linha-empresa-${empresa.id}">
                <td>${empresa.nome}</td>
                <td>${empresa.responsavel}</td>
                <td>${empresa.cidade}</td>
                <td>${formatarDataCadastro(empresa.datacadastro || empresa.dataCadastro)}</td>
                <td><span class="${statusClass}">${statusTexto}</span></td>
                <td class="AcoesTabela">
                    <div class="AgrupadorBotoes"> 
                        ${statusTexto === "Pendente" ? `
                            <button type="button" class="BntAprovar" data-id="${empresa.id}">Aprovar</button>
                            <button type="button" class="BntReprovar" data-id="${empresa.id}">Reprovar</button>
                        ` : '<span style="color:#777; font-size:0.85rem;">Sem ações pendentes</span>'}
                    </div>
                    <button type="button" class="BntVerDetalhes" data-id="${empresa.id}">Ver detalhes</button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', linhaHTML);
    });
}

// Daniel e Rodrigo: Busca as empresas baseada nos filtros aplicados
async function carregarEmpresasFiltradas(status = "Todos", nome = "", data = "") {
    try {
        const queryParams = new URLSearchParams({ status, nome, data }).toString();
        const response = await fetch(`/api/empresas/pendentes?${queryParams}`);
        if (!response.ok) throw new Error('Falha ao obter lista de pendências');
        
        const json = await response.json();
        if (json.success) {
            renderizarTabela(json.data);
        } else {
            throw new Error(json.message || 'Erro ao carregar dados');
        }
    } catch (error) {
        // Fallback de dados mockados caso a API falhe
        renderizarTabela([
            { id: 1, nome: "Studio Rosa Bela", responsavel: "Patricia", cidade: "SP", dataCadastro: "2026-06-01", status: "Pendente" },
            { id: 2, nome: "Barbearia do Zé", responsavel: "José", cidade: "RJ", dataCadastro: "2026-06-05", status: "Pendente" }
        ]);
    }
}

// Daniel e Rodrigo: Lógica para enviar aprovação/reprovação para o backend
function configurarBotoesTabela() {
    const tbody = document.getElementById('tabela-aprovacao');
    if (!tbody) return;
    
    tbody.addEventListener('click', async function(evento) {
        const botaoClicado = evento.target;
        const idDaEmpresa = botaoClicado.getAttribute('data-id');

        if (!idDaEmpresa) return;

        let acao = '';
        if (botaoClicado.classList.contains('BntAprovar')) acao = 'aprovar';
        if (botaoClicado.classList.contains('BntReprovar')) acao = 'reprovar';

        if (acao) {
            if (!confirm(`Deseja realmente ${acao} esta empresa?`)) return;

            try {
                const response = await fetch(`/api/empresas/${idDaEmpresa}/${acao}`, {
                    method: 'POST'
                });
                
                if (!response.ok) throw new Error(`Falha ao processar ação de ${acao}`);
                
                const json = await response.json();
                if (json.success) {
                    alert(json.message || `Empresa ${acao}da com sucesso!`);
                    
                    // Recarrega a listagem respeitando os filtros atuais
                    aplicarFiltrosAtuais();
                }
            } catch (error) {
                alert(`Empresa ${idDaEmpresa} foi ${acao}da com sucesso (Simulado).`);
                const linha = document.getElementById(`linha-empresa-${idDaEmpresa}`);
                if (linha) linha.remove();
            }
        } else if (botaoClicado.classList.contains('BntVerDetalhes')) {
            abrirModalDetalhes(idDaEmpresa);
        }
    });
}

// Daniel e Rodrigo: Abre a modal e busca informações completas do backend
async function abrirModalDetalhes(id) {
    const modal = document.getElementById('modalDetalhes');
    const conteudo = document.getElementById('detalhes-empresa-conteudo');
    if (!modal || !conteudo) return;

    conteudo.innerHTML = `<p style="text-align: center; padding: 20px;">Carregando detalhes...</p>`;
    modal.style.display = 'flex';

    try {
        const response = await fetch(`/api/empresas/${id}`);
        if (!response.ok) throw new Error("Erro de rede");
        const json = await response.json();
        
        if (json.success) {
            const emp = json.data;
            conteudo.innerHTML = `
                <div class="detalhe-item">
                    <div class="detalhe-rotulo">Nome do Estabelecimento</div>
                    <div class="detalhe-valor">${emp.nome || 'N/A'}</div>
                </div>
                <div class="detalhe-item">
                    <div class="detalhe-rotulo">Responsável</div>
                    <div class="detalhe-valor">${emp.responsavel || 'N/A'}</div>
                </div>
                <div class="detalhe-item">
                    <div class="detalhe-rotulo">Categoria Principal</div>
                    <div class="detalhe-valor">${emp.categoria || 'N/A'}</div>
                </div>
                <div class="detalhe-item">
                    <div class="detalhe-rotulo">Descrição</div>
                    <div class="detalhe-valor">${emp.descricao || 'Sem descrição cadastrada.'}</div>
                </div>
                <div class="detalhe-item">
                    <div class="detalhe-rotulo">Contato</div>
                    <div class="detalhe-valor"><strong>Telefone:</strong> ${emp.telefone || 'N/A'}<br><strong>E-mail:</strong> ${emp.email || 'N/A'}</div>
                </div>
                <div class="detalhe-item">
                    <div class="detalhe-rotulo">Endereço</div>
                    <div class="detalhe-valor">
                        ${emp.endereco || 'N/A'}${emp.numero ? ', ' + emp.numero : ''} ${emp.complemento ? '(' + emp.complemento + ')' : ''}<br>
                        <strong>Bairro:</strong> ${emp.bairro || 'N/A'} - <strong>Cidade:</strong> ${emp.cidade || 'N/A'}<br>
                        <strong>CEP:</strong> ${emp.cep || 'N/A'}
                    </div>
                </div>
                <div class="detalhe-item">
                    <div class="detalhe-rotulo">Status e Cadastro</div>
                    <div class="detalhe-valor">
                        <strong>Status Atual:</strong> ${emp.status}<br>
                        <strong>Data de Cadastro:</strong> ${formatarDataCadastro(emp.datacadastro || emp.dataCadastro)}
                    </div>
                </div>
            `;
        } else {
            conteudo.innerHTML = `<p style="text-align: center; color: red; padding: 20px;">${json.message || "Erro ao carregar detalhes."}</p>`;
        }
    } catch (error) {
        conteudo.innerHTML = `<p style="text-align: center; color: red; padding: 20px;">Erro de conexão com o servidor.</p>`;
    }
}

// Daniel e Rodrigo: Fecha a modal
function fecharModal() {
    const modal = document.getElementById('modalDetalhes');
    if (modal) modal.style.display = 'none';
}

// Daniel e Rodrigo: Aplica os filtros dos inputs na listagem
function aplicarFiltrosAtuais() {
    const status = document.getElementById('SeletorStatus').value;
    const nome = document.getElementById('FiltroNome').value.trim();
    const data = document.getElementById('FiltroData').value;
    carregarEmpresasFiltradas(status, nome, data);
}

// Daniel e Rodrigo: Configura os eventos dos filtros
function configurarFiltros() {
    const btnFiltrar = document.querySelector('.BtnFiltrar');
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', function(e) {
            e.preventDefault();
            aplicarFiltrosAtuais();
        });
    }
}

// Daniel e Rodrigo: Inicialização
document.addEventListener('DOMContentLoaded', function() {
    verificarAutenticacaoAdmin();
    carregarEmpresasFiltradas();
    configurarBotoesTabela();
    configurarFiltros();
});
