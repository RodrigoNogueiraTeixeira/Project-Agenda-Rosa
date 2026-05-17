const empresaModel = require('../models/empresaModel');

function getEmpresasPendentes(req, res) {
    try {
        const empresas = empresaModel.getEmpresasPendentes();
        res.json({ success: true, data: empresas });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao buscar empresas pendentes." });
    }
}

function approveEmpresa(req, res) {
    try {
        const id = req.params.id;
        const success = empresaModel.updateEmpresaStatus(id, "Aprovado");
        
        if (success) {
            res.json({ success: true, message: `Empresa ${id} aprovada com sucesso.` });
        } else {
            res.status(404).json({ success: false, message: "Empresa não encontrada." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao aprovar empresa." });
    }
}

function rejectEmpresa(req, res) {
    try {
        const id = req.params.id;
        const success = empresaModel.updateEmpresaStatus(id, "Reprovado");
        
        if (success) {
            res.json({ success: true, message: `Empresa ${id} reprovada com sucesso.` });
        } else {
            res.status(404).json({ success: false, message: "Empresa não encontrada." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Erro ao reprovar empresa." });
    }
}

module.exports = {
    getEmpresasPendentes,
    approveEmpresa,
    rejectEmpresa
};
