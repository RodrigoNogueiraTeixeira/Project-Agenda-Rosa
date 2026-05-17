const express = require('express');
const cors = require('cors');

// Importação das rotas
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const empresaRoutes = require('./src/routes/empresaRoutes');
const relatorioRoutes = require('./src/routes/relatorioRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globais
app.use(cors()); // Permite que o frontend em outra porta consuma esta API
app.use(express.json()); // Permite o parsing de JSON no body das requisições

// Rotas Base da Aplicação
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/relatorios', relatorioRoutes);

// Rota padrão para teste
app.get('/api', (req, res) => {
    res.json({ message: 'API do Dashboard Administrativo funcionando perfeitamente!' });
});

// Inicialização do Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta http://localhost:${PORT}`);
});
