const relatorioModel = require('../models/relatorioModel');

function getRelatorio(req, res) {
    try {
        const tipo = req.query.tipo || 'geral';
        const dados = relatorioModel.getRelatorio(tipo);
        
        res.json({ success: true, data: dados });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao gerar relatório." });
    }
}

module.exports = {
    getRelatorio
};
