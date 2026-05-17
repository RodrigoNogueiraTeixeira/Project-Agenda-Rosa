// Remove acentos, espacos extras e deixa texto minusculo para comparar melhor.
function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// Retorna tipos equivalentes para melhorar a busca por tipo de servico.
function obterSinonimosTipo(tipo) {
  const tipoNormalizado = normalizarTexto(tipo);

  const mapa = {
    cabelo: ["cabelo", "cabelos", "corte", "escova", "hidratacao", "penteado"],
    manicure: ["manicure", "unha", "unhas", "pe e mao", "pedicure", "esmalteria"],
    pedicure: ["pedicure", "pe", "pes", "pe e mao", "spa dos pes", "manicure"],
    depilacao: ["depilacao", "depilacao feminina", "cera", "estetica"],
    sobrancelha: ["sobrancelha", "design de sobrancelha", "henna", "estetica"],
    cilios: ["cilios", "alongamento de cilios", "lash lifting", "estetica"],
    maquiagem: ["maquiagem", "make", "makeup", "estetica"],
    massagem: ["massagem", "massagem modeladora", "drenagem", "estetica"],
    "estetica facial": ["estetica", "estetica facial", "limpeza de pele", "peeling"],
    estetica_facial: ["estetica", "estetica facial", "limpeza de pele", "peeling"],
    "estetica corporal": ["estetica corporal", "drenagem", "modeladora", "tratamento corporal"],
    estetica_corporal: ["estetica corporal", "drenagem", "modeladora", "tratamento corporal"]
  };

  return mapa[tipoNormalizado] || [tipoNormalizado];
}

module.exports = {
  normalizarTexto,
  obterSinonimosTipo
};
