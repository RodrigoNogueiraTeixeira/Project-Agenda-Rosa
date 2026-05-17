const dashboardModel = require('../models/dashboardModel');

function getDashboard(req, res) {
    try {
        const stats = dashboardModel.getDashboardStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar dados do dashboard." });
    }
}

function applyPeriod(req, res) {
    try {
        const { dataInicial, dataFinal } = req.body;
        
        if (!dataInicial || !dataFinal) {
            return res.status(400).json({ success: false, message: "Data inicial e final são obrigatórias." });
        }

        const stats = dashboardModel.updateAgendamentosPeriodo(dataInicial, dataFinal);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao aplicar período." });
    }
}

module.exports = {
    getDashboard,
    applyPeriod
};
