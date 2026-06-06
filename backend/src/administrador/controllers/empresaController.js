const empresaRepository = require("../repositories/empresaRepository");

async function getEmpresasPendentes(req, res) {
    try {
        const { status, nome, data } = req.query;
        const empresas = await empresaRepository.getEmpresasFiltradas({ status, nome, data });
        res.json({ success: true, data: empresas });
    } catch (error) {
        console.error("Erro ao buscar empresas pendentes:", error);
        res.status(500).json({ success: false, message: "Erro ao buscar empresas pendentes." });
    }
}

async function getEmpresaDetalhes(req, res) {
    try {
        const id = req.params.id;
        const empresa = await empresaRepository.getEmpresaById(id);
        
        if (empresa) {
            res.json({ success: true, data: empresa });
        } else {
            res.status(404).json({ success: false, message: "Empresa não encontrada." });
        }
    } catch (error) {
        console.error("Erro ao buscar detalhes da empresa:", error);
        res.status(500).json({ success: false, message: "Erro ao buscar detalhes da empresa." });
    }
}

async function approveEmpresa(req, res) {
    try {
        const id = req.params.id;
        const success = await empresaRepository.updateEmpresaStatus(id, "Aprovado");
        
        if (success) {
            res.json({ success: true, message: `Empresa ${id} aprovada com sucesso.` });
        } else {
            res.status(404).json({ success: false, message: "Empresa não encontrada." });
        }
    } catch (error) {
        console.error("Erro ao aprovar empresa:", error);
        res.status(500).json({ success: false, message: "Erro ao aprovar empresa." });
    }
}

async function rejectEmpresa(req, res) {
    try {
        const id = req.params.id;
        const success = await empresaRepository.updateEmpresaStatus(id, "Reprovado");
        
        if (success) {
            res.json({ success: true, message: `Empresa ${id} reprovada com sucesso.` });
        } else {
            res.status(404).json({ success: false, message: "Empresa não encontrada." });
        }
    } catch (error) {
        console.error("Erro ao reprovar empresa:", error);
        res.status(500).json({ success: false, message: "Erro ao reprovar empresa." });
    }
}

module.exports = {
    getEmpresasPendentes,
    getEmpresaDetalhes,
    approveEmpresa,
    rejectEmpresa
};
