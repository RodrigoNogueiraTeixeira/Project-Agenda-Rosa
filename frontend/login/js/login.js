// ============================================================
// BLOCO 1: CONTROLE DE VISIBILIDADE DA SENHA
// ============================================================

var campoSenha = document.getElementById("senha");
var botaoSenha = document.getElementById("botao-mostrar-senha");

function alternarSenha() {
  // Validacao 1: garante que os elementos existem no HTML antes de usar.
  // Sem essa checagem, o JavaScript geraria erro ao tentar acessar propriedades
  // de algo inexistente.
  if (!campoSenha || !botaoSenha) {
    return;
  }

  // Validacao 2: verifica o estado atual do campo para decidir a acao.
  // Se estiver como "password", mostra o conteudo; senao, volta a ocultar.
  if (campoSenha.type === "password") {
    campoSenha.type = "text";
    // textContent: altera o texto exibido dentro do botao.
    botaoSenha.textContent = "Oculta";
    botaoSenha.setAttribute("aria-label", "Ocultar senha");
  } else {
    campoSenha.type = "password";
    // textContent: altera o texto exibido dentro do botao.
    botaoSenha.textContent = "Mostrar";
    botaoSenha.setAttribute("aria-label", "Mostrar senha");
  }

}

if (botaoSenha) {
  // Validacao 3: so registra o evento de clique se o botao existir.
  // addEventListener: escuta o clique e executa a funcao alternarSenha.
  botaoSenha.addEventListener("click", alternarSenha);
}

// ============================================================
// BLOCO 2: VALIDACAO E ORIENTACAO POR PERFIL SELECIONADO
// ============================================================

var seletorPerfil = document.getElementById("perfil");
var campoInformacao = document.getElementById("informacao");

function atualizarInfoPerfil() {
  // Validacao 1: confirma se os elementos necessarios estao disponiveis.
  // Evita erro caso o select ou a area de mensagem nao estejam na pagina.
  if (!seletorPerfil || !campoInformacao) {
    return;
  }

  var perfil = seletorPerfil.value;
  var texto = "Selecione um perfil para visualizar os campos necessarios.";

  if (perfil === "cliente") {
    texto = "Cliente: entre com email/usuario e senha cadastrados.";
  } else if (perfil === "empresa") {
    texto = "Empresa/Profissional: use o acesso da conta profissional.";
  } else if (perfil === "administrador") {
    texto = "Administrador: informe as credenciais de administracao.";
  }
  
  // Validacao 2: se nenhum perfil valido for selecionado, o texto padrao
  // continua sendo usado para orientar o usuario.

  campoInformacao.textContent = texto;
}

if (seletorPerfil) {
  // Validacao 3: so adiciona o evento de mudanca se o select existir.
  // addEventListener: escuta mudanca no select e executa atualizarInfoPerfil.
  seletorPerfil.addEventListener("change", atualizarInfoPerfil);
}

// Executa uma vez ao carregar a pagina para exibir o texto inicial.
atualizarInfoPerfil();

// ============================================================
// BLOCO 3: LOGIN REAL VIA API
// ============================================================

var campoAcesso = document.getElementById("acesso");
var botaoEntrar = document.getElementById("btn-entrar");
var API_BASE_URL = window.API_BASE_URL || localStorage.getItem("apiBaseUrl") || "http://localhost:3001/api";

async function chamarApiLogin(caminho, opcoes) {
  var resposta = await fetch(API_BASE_URL + caminho, {
    headers: {
      "Content-Type": "application/json"
    },
    ...(opcoes || {})
  });

  var corpo = await resposta.json().catch(function () {
    return {};
  });

  if (!resposta.ok) {
    throw new Error(corpo.erro || "Falha no login.");
  }

  return corpo;
}

async function realizarLogin() {
  // Lemos o select novamente no clique para evitar problema de estado antigo.
  var seletorPerfilAtual = document.getElementById("perfil");
  var perfil = seletorPerfilAtual ? String(seletorPerfilAtual.value || "").trim() : "";
  var email = String(campoAcesso ? campoAcesso.value : "").trim();
  var senha = String(campoSenha ? campoSenha.value : "").trim();

  // Fallback: alguns navegadores podem manter value vazio em cenarios de autofill/UI.
  // Nesse caso tentamos usar a opcao selecionada diretamente.
  if (!perfil && seletorPerfilAtual && seletorPerfilAtual.selectedIndex >= 0) {
    var opcaoSelecionada = seletorPerfilAtual.options[seletorPerfilAtual.selectedIndex];
    perfil = String(opcaoSelecionada ? opcaoSelecionada.value || "" : "").trim();
  }

  // Se o perfil vier vazio tratamos automaticamente como "cliente" para nao bloquear o acesso.
  if (!perfil) {
    perfil = "cliente";
  }

  if (!email || !senha) {
    alert("Preencha email e senha.");
    return;
  }

  var textoOriginal = botaoEntrar ? botaoEntrar.textContent : "Entrar";
  if (botaoEntrar) {
    botaoEntrar.disabled = true;
    botaoEntrar.textContent = "Entrando...";
  }

  try {
    var resultado = await chamarApiLogin("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email, senha: senha, perfil: perfil })
    });

    if (resultado.perfil === "cliente") {
      localStorage.setItem("clienteId", String(resultado.usuario.id));
      localStorage.setItem("clienteNome", resultado.usuario.nome || "");
      localStorage.setItem("clienteEmail", resultado.usuario.email || "");
      
      // A tela fica dentro de login/html, entao usamos caminho relativo para ir a cliente/html.
      window.location.href = "../../cliente/html/homeDoCliente.html";
    } else if (resultado.perfil === "empresa") {
      localStorage.setItem("empresaId", String(resultado.usuario.id));
      localStorage.setItem("empresaNome", resultado.usuario.nome || "");
      localStorage.setItem("empresaEmail", resultado.usuario.email || "");
      
      // Vai para a página inicial da empresa.
      window.location.href = "../../empresa/html/home-empresa.html";
    } else if (resultado.perfil === "administrador") {
      localStorage.setItem("adminId", String(resultado.usuario.id));
      localStorage.setItem("adminNome", resultado.usuario.nome || "");
      localStorage.setItem("adminEmail", resultado.usuario.email || "");
      
      // Vai para o dashboard do administrador.
      window.location.href = "../../administrador/html/Dashboard.html";
    } else {
      throw new Error("Perfil desconhecido retornado pelo servidor.");
    }
  } catch (error) {
    alert("Nao foi possivel entrar: " + error.message);
  } finally {
    if (botaoEntrar) {
      botaoEntrar.disabled = false;
      botaoEntrar.textContent = textoOriginal;
    }
  }
}

if (botaoEntrar) {
  botaoEntrar.addEventListener("click", realizarLogin);
}
