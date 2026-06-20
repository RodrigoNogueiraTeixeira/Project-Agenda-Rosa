
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

// URL base da API. Se nao houver configuracao, usamos localhost:3001.
const API_BASE_URL = window.API_BASE_URL || localStorage.getItem("apiBaseUrl") || (window.location.hostname === "localhost" ? "http://localhost:3001/api" : "/api");

// Id do cliente vem do localStorage (definido no login).
const CLIENTE_ID = Number(localStorage.getItem("clienteId") || 1);

// Captura os elementos do formulário
const formPerfil = document.querySelector(".form-perfil");
const campoNome = document.getElementById("nome");
const campoEmail = document.getElementById("email");
const campoTelefone = document.getElementById("telefone");
const campoCidade = document.getElementById("cidade");
const campoBairro = document.getElementById("bairro");
const campoSenha = document.getElementById("senha");
const campoConfirmarSenha = document.getElementById("confirmarSenha");

// Função executada ao carregar a página
window.onload = async function onLoad() {
  if (!formPerfil) return;

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Você precisa estar logado para visualizar ou editar seu perfil.");
    window.location.href = "../../login/html/login.html";
    return;
  }
  
  try {
    // 1. Busca os dados atuais do perfil do cliente no back-end
    const resposta = await fetch(`${API_BASE_URL}/clientes/${CLIENTE_ID}/perfil`);
    
    if (!resposta.ok) {
      throw new Error("Não foi possível carregar os dados do perfil.");
    }
    
    const dados = await resposta.json();
    const cliente = dados.cliente;
    
    // 2. Preenche os campos da tela com as informações do banco
    if (cliente) {
      if (campoNome) campoNome.value = cliente.nome || "";
      if (campoEmail) campoEmail.value = cliente.email || "";
      if (campoTelefone) campoTelefone.value = cliente.telefone || "";
      if (campoCidade) campoCidade.value = cliente.cidade || "";
      if (campoBairro) campoBairro.value = cliente.bairro || "";
    }
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    alert("Erro ao carregar os dados do perfil. Exibindo dados locais offline.");
  }
};

// Função executada ao enviar o formulário
if (formPerfil) {
  formPerfil.onsubmit = async function onSubmit(event) {
    // Evita o recarregamento padrão da página
    event.preventDefault();
    
    const nome = campoNome ? campoNome.value.trim() : "";
    const email = campoEmail ? campoEmail.value.trim() : "";
    const telefone = campoTelefone ? campoTelefone.value.trim() : "";
    const cidade = campoCidade ? campoCidade.value.trim() : "";
    const bairro = campoBairro ? campoBairro.value.trim() : "";
    const senha = campoSenha ? campoSenha.value.trim() : "";
    const confirmarSenha = campoConfirmarSenha ? campoConfirmarSenha.value.trim() : "";
    
    // 1. Validações básicas no front-end
    if (!nome || !email) {
      alert("Nome e E-mail são obrigatórios.");
      return;
    }
    
    // Se digitou algo no campo de senha, valida a confirmação
    if (senha) {
      if (senha.length < 6) {
        alert("A nova senha deve conter pelo menos 6 caracteres.");
        return;
      }
      if (senha !== confirmarSenha) {
        alert("A confirmação de senha não confere.");
        return;
      }
    }
    
    const botaoSalvar = formPerfil.querySelector("button");
    const textoOriginal = botaoSalvar ? botaoSalvar.textContent : "Editar perfil";
    
    if (botaoSalvar) {
      botaoSalvar.disabled = true;
      botaoSalvar.textContent = "Salvando...";
    }
    
    try {
      // 2. Envia os dados atualizados para o back-end
      const payload = { nome, email, telefone, cidade, bairro };
      if (senha) {
        payload.senha = senha;
      }
      
      const resposta = await fetch(`${API_BASE_URL}/clientes/${CLIENTE_ID}/perfil`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      const resultado = await resposta.json();
      
      if (!resposta.ok) {
        throw new Error(resultado.erro || "Erro ao salvar alterações.");
      }
      
      // 3. Atualiza os dados no localStorage para refletir no cabeçalho/telas imediatamente
      localStorage.setItem("clienteNome", nome);
      localStorage.setItem("clienteEmail", email);
      
      alert("Perfil atualizado com sucesso!");
      
      // Limpa os campos de senha por segurança
      if (campoSenha) campoSenha.value = "";
      if (campoConfirmarSenha) campoConfirmarSenha.value = "";
      
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      alert(error.message);
    } finally {
      if (botaoSalvar) {
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = textoOriginal;
      }
    }
  };
}
