// ==========================================
// ARQUIVO: server.js
// OBJETIVO PRINCIPAL: É a "ignição" (ponto de entrada) de todo o sistema.
// ELE É RESPONSÁVEL POR:
// 1. Carregar as variáveis de ambiente e segredos (como chaves e portas de rede).
// 2. Inicializar o banco de dados.
// 3. Configurar middlewares de segurança e leitura de dados (CORS, JSON Parser).
// 4. Servir os arquivos visuais (HTML, CSS, JS) da pasta 'frontend'.
// 5. Acoplar as rotas da API (/api) que respondem a requisições do sistema.
// 6. Colocar o servidor "escutando" em uma porta (ex: http://localhost:3001) pronta para uso.
// ==========================================

// Import do path: usamos para montar caminhos de pastas de forma segura.
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

// Import do express: framework HTTP para criar API e servir arquivos.
const express = require("express");

// Import do cors: libera chamadas entre origens diferentes durante desenvolvimento.
const cors = require("cors");

// Importa a função do arquivo de configuração do banco de dados que cria as tabelas e inicia a conexão.
const { inicializarBanco } = require("./src/config/database");

// Importa o roteador central do sistema, que agrupa todas as rotas da nossa API (clientes, agendamentos, etc).
const apiRoutes = require("./src/routes");

// Cria uma instância do Express para começarmos a configurar nossa aplicação web.
const app = express();

// Define a porta de rede em que o servidor vai rodar. Tenta ler do .env, se não achar usa a porta padrão 3001.
const PORT = Number(process.env.PORT || 3001);

// Constrói o caminho de pastas para a pasta 'frontend' voltando um diretório a partir do backend.
const FRONTEND_PATH = path.join(__dirname, "..", "frontend");

// Configura o Express para ler dados JSON enviados pelo app, limitando a 2mb para suportar fotos em Base64.
app.use(express.json({ limit: "2mb" }));

// Ativa o CORS no servidor, liberando que o aplicativo faça chamadas de rede sem bloqueios de segurança do navegador.
app.use(cors());

// Configura a pasta 'frontend' como estática para servir arquivos (HTML, CSS, imagens) direto para o navegador.
app.use(express.static(FRONTEND_PATH));

// Registra todas as rotas da API sob o prefixo '/api' (Ex: /api/agendamentos).
app.use("/api", apiRoutes);

// Rota inicial: quando alguém entra no link principal (/), o backend redireciona direto para a home do cliente.
app.get("/", (req, res) => {
  res.redirect("/cliente/html/homeDoCliente.html");
});

// Middleware fallback para tratar qualquer link inválido ou rota não encontrada (Erro 404).
app.use((req, res) => {
  // Se o link inválido for uma rota de dados da API...
  if (req.path.startsWith("/api/")) {
    // Retorna status HTTP 404 (Não Encontrado) em formato JSON.
    res.status(404).json({ erro: "Rota nao encontrada." });
    return;
  }

  // Se for uma página normal que não existe, apenas redireciona de volta para a Home.
  res.redirect("/cliente/html/homeDoCliente.html");
});

// Função assíncrona responsável por inicializar todo o ecossistema do servidor de forma segura.
async function startServer() {
  // 'try': Tenta conectar ao banco e subir o servidor.
  try {
    // Primeiro aguarda a conexão e criação de tabelas no banco de dados.
    await inicializarBanco();

    // Se o banco conectou, coloca o servidor para escutar requisições de rede na porta configurada.
    app.listen(PORT, () => {
      console.log(`Servidor em execucao: http://localhost:${PORT}`);
    });
  // 'catch': Se o banco estiver fora do ar ou a porta estiver em uso, captura o erro e previne travamento silencioso.
  } catch (error) {
    console.error("Falha ao iniciar servidor:", error.message);
    // Encerra imediatamente o processo do Node.js com código de falha (1).
    process.exit(1);
  }
}

// Dispara a função de partida descrita acima.
startServer();
