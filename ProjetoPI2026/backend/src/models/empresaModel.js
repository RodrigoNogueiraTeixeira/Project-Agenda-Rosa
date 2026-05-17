let listaEmpresas = [ // Dados do 'DB'
    {
        id: 1,
        nome: "Studio Rosa Bela",
        responsavel: "Patricia Souza",
        cidade: "São Paulo / Vila Mariana",
        dataCadastro: "01-03-2026",
        status: "Pendente"
    },
    {
        id: 2,
        nome: "Barbearia do Zé",
        responsavel: "José Silva",
        cidade: "Rio de Janeiro / Copacabana",
        dataCadastro: "05-04-2026",
        status: "Pendente"
    },
    {
        id: 3,
        nome: "Clínica Bem Estar",
        responsavel: "Dra. Amanda",
        cidade: "Curitiba / Centro",
        dataCadastro: "10-05-2026",
        status: "Pendente"
    }
];

function getAllEmpresas() {
    return listaEmpresas;
}

function getEmpresasPendentes() {
    // Daniel e Rodrigo: Quando tiverem o banco de dados, substituam isso por:
    // return await db.query("SELECT * FROM empresas WHERE status = 'Pendente'");
    return listaEmpresas.filter(emp => emp.status === "Pendente"); // Dados do 'DB'
}

function updateEmpresaStatus(id, newStatus) {
    // Daniel e Rodrigo: Troquem a busca local (listaEmpresas.find) por um UPDATE real no banco de dados
    // Exemplo: await db.query("UPDATE empresas SET status = ? WHERE id = ?", [newStatus, id]);
    const empresa = listaEmpresas.find(emp => emp.id == id);
    if (empresa) {
        empresa.status = newStatus; // Dados do 'DB'
        return true;
    }
    return false;
}

module.exports = {
    getAllEmpresas,
    getEmpresasPendentes,
    updateEmpresaStatus
};
