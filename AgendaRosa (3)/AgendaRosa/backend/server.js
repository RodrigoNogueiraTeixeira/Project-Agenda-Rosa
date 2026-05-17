const express = require("express");
const cors = require("cors");
const { initializeDatabase } = require("./src/database/database");
const empresaRoutes = require("./src/routes/empresaRoutes");
const servicoRoutes = require("./src/routes/servicoRoutes");
const horarioFuncionamentoRoutes = require("./src/routes/horarioFuncionamentoRoutes");
const bloqueioHorarioRoutes = require("./src/routes/bloqueioHorarioRoutes");
const agendamentoRoutes = require("./src/routes/agendamentoRoutes");
const profissionalRoutes = require("./src/routes/profissionalRoutes");
const homeEmpresaRoutes = require("./src/routes/homeEmpresaRoutes");

// Cria a aplicacao Express responsavel por receber as requisicoes HTTP.
const app = express();

// Define a porta usada pelo servidor. Se nao houver variavel de ambiente, usa 3000.
const PORT = process.env.PORT || 3000;

// Libera acesso da API para as telas HTML abertas no navegador.
app.use(cors());

// Permite que a API receba dados em formato JSON no corpo das requisicoes.
app.use(express.json());

// Rotas relacionadas ao cadastro e manutencao de empresas.
app.use("/api/empresas", empresaRoutes);

// Rotas relacionadas ao cadastro e gerenciamento de servicos da empresa.
app.use("/api/servicos", servicoRoutes);

// Rotas relacionadas aos horarios semanais de funcionamento da empresa.
app.use("/api/horarios-funcionamento", horarioFuncionamentoRoutes);

// Rotas relacionadas aos bloqueios pontuais de agenda da empresa.
app.use("/api/bloqueios-horarios", bloqueioHorarioRoutes);

// Rotas relacionadas aos agendamentos da empresa.
app.use("/api/agendamentos", agendamentoRoutes);

// Rotas relacionadas ao cadastro e gerenciamento de profissionais.
app.use("/api/profissionais", profissionalRoutes);

// Rotas relacionadas aos indicadores da home da empresa.
app.use("/api/home-empresa", homeEmpresaRoutes);

// Rota inicial simples para confirmar que a API esta online.
app.get("/", (req, res) => {
  res.json({
    message: "API Agenda Rosa em execucao",
  });
});

// Rota de saude usada para testes rapidos do servidor.
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

// Inicializa o banco antes de colocar o servidor para escutar requisicoes.
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor Agenda Rosa rodando em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    // Encerra a aplicacao se o banco nao puder ser preparado.
    console.error("Erro ao iniciar banco de dados:", error);
    process.exit(1);
  });
