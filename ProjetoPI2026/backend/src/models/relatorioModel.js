const relatoriosData = { // Dados do 'DB'
    geral: {
        usuariosCadastrados: "1.248",
        empresasAprovadas: "144",
        cancelamentos: "5.920"
    },
    usuarios: {
        usuariosCadastrados: "1.248",
        empresasAprovadas: "N/A",
        cancelamentos: "N/A"
    },
    empresas: {
        usuariosCadastrados: "N/A",
        empresasAprovadas: "144",
        cancelamentos: "20"
    }
};

function getRelatorio(tipo) {
    // Daniel e Rodrigo: Substituir esta simulação por um GROUP BY ou SUM() no banco de dados real
    if (relatoriosData[tipo.toLowerCase()]) {
        return relatoriosData[tipo.toLowerCase()];
    }
    return relatoriosData.geral;
}

module.exports = {
    getRelatorio
};
