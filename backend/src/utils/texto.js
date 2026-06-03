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
    depilacao: ["depilacao", "depilação", "depilacao feminina", "depilação feminina", "cera", "estetica", "estética"],
    sobrancelha: ["sobrancelha", "design de sobrancelha", "henna", "estetica", "estética"],
    cilios: ["cilios", "cílios", "alongamento de cilios", "alongamento de cílios", "lash lifting", "estetica", "estética"],
    maquiagem: ["maquiagem", "make", "makeup", "estetica", "estética"],
    massagem: ["massagem", "massagem modeladora", "drenagem", "estetica", "estética"],
    "estetica facial": ["estetica", "estética", "estetica facial", "estética facial", "limpeza de pele", "peeling"],
    estetica_facial: ["estetica", "estética", "estetica facial", "estética facial", "limpeza de pele", "peeling"],
    "estetica corporal": ["estetica corporal", "estética corporal", "drenagem", "modeladora", "tratamento corporal", "estetica", "estética"],
    estetica_corporal: ["estetica corporal", "estética corporal", "drenagem", "modeladora", "tratamento corporal", "estetica", "estética"]
  };

  return mapa[tipoNormalizado] || [tipoNormalizado, tipo];
}

module.exports = {
  normalizarTexto,
  obterSinonimosTipo
};
