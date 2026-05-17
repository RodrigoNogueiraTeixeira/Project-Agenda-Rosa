const categoriaRepository = require("../repositories/categoriaRepository");

async function getCategorias(req, res) {
    try {
        const categorias = await categoriaRepository.getCategorias();
        res.json({ success: true, data: categorias });
    } catch (error) {
        console.error("Erro ao buscar categorias:", error);
        res.status(500).json({ success: false, message: "Erro ao buscar categorias." });
    }
}

async function criarCategoria(req, res) {
    try {
        const { nome, descricao, status } = req.body;
        if (!nome) {
            return res.status(400).json({ success: false, message: "Nome é obrigatório." });
        }
        const nova = await categoriaRepository.criarCategoria({ nome, descricao, status });
        res.status(201).json({ success: true, data: nova });
    } catch (error) {
        console.error("Erro ao cadastrar categoria:", error);
        res.status(500).json({ success: false, message: "Erro ao cadastrar categoria." });
    }
}

module.exports = {
    getCategorias,
    criarCategoria
};
