// Import do path: usamos para montar caminhos de pastas de forma segura.
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

// Import do express: framework HTTP para criar API e servir arquivos.
const express = require("express");

// Import do cors: libera chamadas entre origens diferentes durante desenvolvimento.
const cors = require("cors");

// Import da inicializacao do banco PostgreSQL.
const { inicializarBanco } = require("./src/config/database");

// Import do arquivo central que agrupa todas as rotas da API.
const apiRoutes = require("./src/routes");

const app = express();
const PORT = Number(process.env.PORT || 3001);
const FRONTEND_PATH = path.join(__dirname, "..", "frontend");

// Middleware para aceitar JSON no corpo das requisicoes.
app.use(express.json());

// Middleware CORS para facilitar testes locais (front e back separados).
app.use(cors());

// Serve arquivos estaticos (html, css, js, imagens) da pasta frontend.
app.use(express.static(FRONTEND_PATH));

// Prefixo principal da API. Ex: /api/estabelecimentos
app.use("/api", apiRoutes);

// Rota inicial: abre a tela de login.
app.get("/", (req, res) => {
  res.redirect("/login/html/login.html");
});

// Fallback para qualquer rota nao encontrada.
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ erro: "Rota nao encontrada." });
    return;
  }

  res.redirect("/login/html/login.html");
});

async function startServer() {
  try {
    await inicializarBanco();

    app.listen(PORT, () => {
      console.log(`Servidor em execucao: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Falha ao iniciar servidor:", error.message);
    process.exit(1);
  }
}

startServer();
