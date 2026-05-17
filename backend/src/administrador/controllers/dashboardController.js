const dashboardRepository = require("../repositories/dashboardRepository");

async function getDashboard(req, res) {
    try {
        const stats = await dashboardRepository.getStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ success: false, message: "Erro ao buscar dados do dashboard." });
    }
}

async function applyPeriod(req, res) {
    try {
        const { dataInicial, dataFinal } = req.body;
        
        if (!dataInicial || !dataFinal) {
            return res.status(400).json({ success: false, message: "Data inicial e final são obrigatórias." });
        }

        const stats = await dashboardRepository.getStats();
        stats.agendamentosPeriodo = await dashboardRepository.getAgendamentosPeriodo(dataInicial, dataFinal);

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error("Erro ao aplicar período:", error);
        res.status(500).json({ success: false, message: "Erro ao aplicar período." });
    }
}

module.exports = {
    getDashboard,
    applyPeriod
};
