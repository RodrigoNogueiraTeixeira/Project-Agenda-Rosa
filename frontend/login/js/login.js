
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

// Elementos usados para mostrar ou esconder a senha.
var campoSenha = document.getElementById("senha");
var botaoSenha = document.getElementById("botao-mostrar-senha");

/**
 * Alterna a visibilidade do campo de senha entre texto oculto (password) e visível (text).
 * Atualiza o texto do botão e a etiqueta de acessibilidade (aria-label).
 */
function alternarSenha() {
  if (!campoSenha || !botaoSenha) {
    return;
  }

  if (campoSenha.type === "password") {
    campoSenha.type = "text";
    botaoSenha.textContent = "Oculta";
    botaoSenha.setAttribute("aria-label", "Ocultar senha");
  } else {
    campoSenha.type = "password";
    botaoSenha.textContent = "Mostrar";
    botaoSenha.setAttribute("aria-label", "Mostrar senha");
  }
}

if (botaoSenha) {
  botaoSenha.addEventListener("click", alternarSenha);
}

// Atualiza a mensagem conforme o perfil escolhido.
var seletorPerfil = document.getElementById("perfil");
var campoInformacao = document.getElementById("informacao");
var botaoCriarConta = document.getElementById("btn-criar-conta");

/**
 * Atualiza a mensagem de instrução na tela de acordo com o perfil
 * selecionado no elemento select (Cliente, Empresa ou Administrador).
 */
function atualizarInfoPerfil() {
  if (!seletorPerfil || !campoInformacao) {
    return;
  }

  var perfil = seletorPerfil.value;
  var texto = "Selecione um perfil para visualizar os campos necessarios.";

  if (perfil === "cliente") {
    texto = "Cliente: entre com email/usuario e senha cadastrados.";
  } else if (perfil === "empresa") {
    texto = "Empresa: use o acesso da conta empresarial.";
  } else if (perfil === "administrador") {
    texto = "Administrador: informe as credenciais de administracao.";
  }

  campoInformacao.textContent = texto;
}

if (seletorPerfil) {
  seletorPerfil.addEventListener("change", atualizarInfoPerfil);
}

atualizarInfoPerfil();

/**
 * Redireciona o usuário para a página de cadastro, levando como parâmetro
 * na URL o tipo de perfil de conta atualmente selecionado no login.
 */
function abrirCadastro(event) {
  event.preventDefault();

  var perfil = seletorPerfil ? seletorPerfil.value : "";

  if (!perfil) {
    alert("Selecione Cliente ou Empresa antes de criar a conta.");
    return;
  }

  if (perfil === "administrador") {
    alert("O cadastro de administrador nao e feito por esta tela.");
    return;
  }

  // O objeto 'window' representa a janela do próprio navegador. Usamos 'window.location.href' para redirecionar o usuário para a nova página.
  window.location.href = "./cadastro-cliente.html?perfil=" + perfil;
}

if (botaoCriarConta) {
  botaoCriarConta.addEventListener("click", abrirCadastro);
}

// Usa a API local durante o desenvolvimento.
var campoAcesso = document.getElementById("acesso");
var botaoEntrar = document.getElementById("btn-entrar");
// Define a URL base para as chamadas de API, escolhendo a melhor rota conforme o ambiente:
var API_BASE_URL =
  // 1. Verifica se há uma URL global definida no objeto 'window' (navegador).
  window.API_BASE_URL ||
  // 2. Tenta obter uma URL customizada salva no armazenamento local do navegador (LocalStorage).
  localStorage.getItem("apiBaseUrl") ||
  // 3. Verifica se a página está rodando localmente (seja por localhost, IP local ou abrindo o arquivo direto no PC usando o protocolo 'file:').
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:"
    // Se for ambiente local (desenvolvimento), aponta para a porta 3001 onde o servidor Node.js está rodando.
    ? "http://localhost:3001/api"
    // Se for ambiente de produção (como no Render), usa um caminho relativo para bater no mesmo domínio.
    : "/api");

/**
 * Remove do LocalStorage todos os tokens e informações de sessões
 * anteriores de qualquer tipo de perfil, limpando o estado de login.
 */
function limparDadosDeAcesso() {
  [
    "clienteId",
    "clienteNome",
    "clienteEmail",
    "empresaId",
    "empresaNome",
    "empresaEmail",
    "adminId",
    "adminNome",
    "adminEmail",
  ].forEach(function (chave) {
    // Para cada item da lista (chave), remove o dado correspondente do LocalStorage.
    localStorage.removeItem(chave);
  });
}

/**
 * Realiza a requisição HTTP para o endpoint de autenticação
 * e trata possíveis respostas de erro retornadas pela API.
 */
async function chamarApiLogin(caminho, opcoes) {
  // Faz a requisição HTTP assíncrona usando a Fetch API do navegador.
  // 'await' espera a resposta do servidor antes de prosseguir com o código.
  var resposta = await fetch(API_BASE_URL + caminho, {
    // Define cabeçalhos de envio, indicando ao backend que o formato de dados trafegado é JSON.
    headers: {
      "Content-Type": "application/json",
    },
    // O operador spread (...) injeta configurações adicionais (como método POST, corpo da requisição) passadas por parâmetro.
    // O fallback (|| {}) previne erros caso o argumento 'opcoes' seja nulo ou indefinido.
    ...(opcoes || {}),
  });

  // Converte o corpo da resposta em um objeto JavaScript (JSON).
  // O '.catch' garante que, caso a resposta esteja vazia ou não seja um JSON válido, retorne um objeto vazio para não quebrar a execução.
  var corpo = await resposta.json().catch(function () {
    return {};
  });

  // Se o status da requisição HTTP não for de sucesso (fora da faixa 200-299), lança uma exceção.
  if (!resposta.ok) {
    // Usa a mensagem de erro vinda do servidor (corpo.erro) ou uma mensagem padrão ("Falha no login.").
    throw new Error(corpo.erro || "Falha no login.");
  }

  // Se tudo deu certo, retorna o JSON com os dados do usuário autenticado.
  return corpo;
}

/**
 * Controla o fluxo de autenticação do usuário. Valida as entradas do formulário,
 * envia as credenciais para o backend, salva a sessão no LocalStorage
 * e redireciona o usuário para a respectiva tela principal (home).
 */

// Declara a função assíncrona 'realizarLogin' (utiliza await interno para chamadas assíncronas de rede).
async function realizarLogin() {
  // Busca no HTML o elemento de seleção de perfil (select com id "perfil").
  var seletorPerfilAtual = document.getElementById("perfil");
  
  // Se o elemento select existir, obtém o valor da opção selecionada, converte em String, remove espaços nas pontas (.trim()) e guarda em 'perfil'.
  var perfil = seletorPerfilAtual
    ? String(seletorPerfilAtual.value || "").trim()
    : "";
    
  // Verifica se o campo de acesso/email existe, obtém seu valor de texto, limpa os espaços e guarda em 'email'.
  var email = String(campoAcesso ? campoAcesso.value : "").trim();
  
  // Verifica se o campo de senha existe, obtém a senha digitada, limpa os espaços e guarda em 'senha'.
  var senha = String(campoSenha ? campoSenha.value : "").trim();

  // Caso o perfil esteja vazio, mas o elemento select exista e tenha alguma opção de índice válida selecionada (>= 0)...
  if (!perfil && seletorPerfilAtual && seletorPerfilAtual.selectedIndex >= 0) {
    // Acessa o array de options do select usando o índice selecionado para pegar a tag <option> marcada.
    var opcaoSelecionada =
      seletorPerfilAtual.options[seletorPerfilAtual.selectedIndex];
    // Lê o atributo value da tag <option>, converte em String, remove espaços e atribui à variável 'perfil'.
    perfil = String(
      opcaoSelecionada ? opcaoSelecionada.value || "" : ""
    ).trim();
  }

  if (!perfil) {
    alert("Selecione o perfil para entrar.");
    return;
  }

  if (!email || !senha) {
    alert("Preencha email e senha.");
    return;
  }

  // Salva o texto original do botão de login (ex: "Entrar") para podermos restaurá-lo caso ocorra algum erro.
  var textoOriginal = botaoEntrar ? botaoEntrar.textContent : "Entrar";
  // Se o elemento do botão de entrar existir...
  if (botaoEntrar) {
    // Desabilita temporariamente o botão para evitar cliques repetidos que enviariam múltiplas requisições.
    botaoEntrar.disabled = true;
    // Altera o texto do botão para dar um feedback visual de carregamento para o usuário.
    botaoEntrar.textContent = "Entrando...";
  }

  // Tenta executar o bloco de código de autenticação (caso dê erro, cai no bloco catch abaixo).
  try {
    // Faz a chamada assíncrona à API de login no endpoint '/auth/login' e aguarda (await) o retorno.
    var resultado = await chamarApiLogin("/auth/login", {
      // Define que o método HTTP é POST, já que estamos submetendo dados sensíveis (credenciais).
      method: "POST",
      // Serializa os dados de acesso (email, senha, perfil) em uma string no formato JSON para ir no corpo (body) da requisição HTTP.
      body: JSON.stringify({
        email: email,
        senha: senha,
        perfil: perfil,
      }),
    });

    // Se o login for concluído com sucesso, limpa os resquícios de logins antigos salvos no navegador.
    limparDadosDeAcesso();

    // Salva os dados necessarios e abre a pagina de cada perfil.
    // Se o tipo de perfil retornado pelo login for 'cliente':
    if (resultado.perfil === "cliente") {
      // Armazena o ID do cliente convertido em String no LocalStorage do navegador.
      localStorage.setItem("clienteId", String(resultado.usuario.id));
      // Armazena o nome do cliente no LocalStorage (se for nulo, armazena string vazia).
      localStorage.setItem("clienteNome", resultado.usuario.nome || "");
      // Armazena o e-mail do cliente no LocalStorage (se for nulo, armazena string vazia).
      localStorage.setItem("clienteEmail", resultado.usuario.email || "");
      // Redireciona o navegador para a página principal da área do cliente.
      window.location.href = "../../cliente/html/homeDoCliente.html";
    // Se o tipo de perfil retornado for 'empresa':
    } else if (resultado.perfil === "empresa") {
      // Armazena o ID do usuário da empresa convertido em String no LocalStorage.
      localStorage.setItem("empresaId", String(resultado.usuario.id));
      // Armazena o nome da empresa ou estabelecimento no LocalStorage.
      localStorage.setItem("empresaNome", resultado.usuario.nome || "");
      // Armazena o e-mail cadastrado da empresa no LocalStorage.
      localStorage.setItem("empresaEmail", resultado.usuario.email || "");
      // Redireciona o navegador para o painel de controle principal da empresa.
      window.location.href = "../../empresa/html/home-empresa.html";
    // Se o tipo de perfil retornado for 'administrador':
    } else if (resultado.perfil === "administrador") {
      // Armazena o ID do administrador convertido em String no LocalStorage.
      localStorage.setItem("adminId", String(resultado.usuario.id));
      // Armazena o nome do administrador no LocalStorage.
      localStorage.setItem("adminNome", resultado.usuario.nome || "");
      // Armazena o e-mail do administrador no LocalStorage.
      localStorage.setItem("adminEmail", resultado.usuario.email || "");
      // Redireciona o navegador para a página de gerenciamento administrativo (Dashboard).
      window.location.href = "../../administrador/html/Dashboard.html";
    // Caso o perfil retornado não coincida com nenhum dos três perfis esperados...
    } else {
      // Dispara um erro personalizado que será capturado pelo bloco catch logo abaixo.
      throw new Error("Perfil desconhecido retornado pelo servidor.");
    }
  // Bloco que captura qualquer exceção ocorrida durante a chamada da API ou nos blocos internos.
  } catch (error) {
    // Exibe um alerta de navegador com a mensagem detalhada do erro.
    alert("Nao foi possivel entrar: " + error.message);
  // O bloco 'finally' sempre roda ao final do try-catch, independente do resultado ter sido sucesso ou erro.
  } finally {
    // Se o elemento do botão de entrar existir...
    if (botaoEntrar) {
      // Reabilita o botão para que o usuário possa fazer novas tentativas se necessário.
      botaoEntrar.disabled = false;
      // Restaura o texto do botão para o rótulo original (ex: "Entrar").
      botaoEntrar.textContent = textoOriginal;
    }
  }
}

// Se o botão de entrar existir, associa o evento de clique (click) à função realizarLogin.
if (botaoEntrar) {
  botaoEntrar.addEventListener("click", realizarLogin);
}

// O forEach percorre este array contendo os três elementos para aplicar a escuta de eventos a todos de uma vez, evitando duplicação de código.
[campoAcesso, campoSenha, seletorPerfil].forEach(function (campo) {
  // Validação de segurança: se o campo não existir (for null), o return interrompe a execução apenas para esse elemento,
  // impedindo que a aplicação quebre ao tentar registrar eventos em um elemento inexistente.
  if (!campo) {
    return;
  }

  // Adiciona um listener para escutar quando o usuário pressiona uma tecla (keydown) dentro do campo.
  campo.addEventListener("keydown", function (event) {
    // Se a tecla pressionada for 'Enter'...
    if (event.key === "Enter") {
      // Impede a ação padrão da tecla (que seria tentar submeter o form ou recarregar a página).
      event.preventDefault();
      // Dispara o processo de autenticação chamando realizarLogin().
      realizarLogin();
    }
  });
});
