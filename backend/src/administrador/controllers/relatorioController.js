const relatorioRepository = require("../repositories/relatorioRepository");

async function getRelatorio(req, res) {
    try {
        const tipo = req.query.tipo || 'geral';
        const dados = await relatorioRepository.getRelatorio(tipo);
        
        res.json({ success: true, data: dados });
    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        res.status(500).json({ success: false, message: "Erro ao gerar relatório." });
    }
}

module.exports = {
    getRelatorio
};
