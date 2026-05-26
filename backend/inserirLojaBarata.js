require("dotenv").config();
const { run, get, transaction } = require("./src/config/database");

async function inserirLojaBarata() {
  console.log("Iniciando a inserção da Loja Promocional (produtos a 1 real)...");

  // Usamos nossa função transaction recém-criada para garantir segurança
  await transaction(async (tx) => {
    // 1. Inserir o estabelecimento
    const resultadoLoja = await tx.run(`
      INSERT INTO estabelecimentos (nome, cidade, bairro, endereco, cep, logo_url, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      "Salão Popular (Tudo Baratinho)",
      "São Paulo",
      "Centro",
      "Rua das Promoções, 123 - Centro, São Paulo - SP",
      "01001-000",
      "https://picsum.photos/seed/salaopopular/320/180",
      -23.55052,
      -46.633309
    ]);

    const lojaId = resultadoLoja.lastID;
    console.log(`✅ Estabelecimento criado com ID: ${lojaId}`);

    // 2. Inserir tipos do estabelecimento
    await tx.run(`INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES (?, ?)`, [lojaId, "cabelo"]);
    await tx.run(`INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES (?, ?)`, [lojaId, "manicure"]);
    await tx.run(`INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES (?, ?)`, [lojaId, "estética"]);
    console.log(`✅ Tipos vinculados!`);

    // 3. Criar os serviços bem baratos
    const servicos = [
      { nome: "Corte Simples Promocional", preco: 1.00, categoria: "Cabelo" },
      { nome: "Manicure Express", preco: 1.50, categoria: "Unhas" },
      { nome: "Design de Sobrancelha", preco: 2.00, categoria: "Estética" },
      { nome: "Escova Rápida", preco: 1.00, categoria: "Cabelo" },
      { nome: "Hidratação de 1 Real", preco: 1.00, categoria: "Cabelo" }
    ];

    for (const servico of servicos) {
      await tx.run(`
        INSERT INTO servicos (estabelecimento_id, nome, preco, preco_centavos, categoria, duracao_minutos, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        lojaId, 
        servico.nome, 
        servico.preco,
        Math.round(servico.preco * 100), // convertendo para centavos, ex: 100, 150
        servico.categoria,
        30, // 30 minutos de duração padrão
        "ativo"
      ]);
    }
    
    console.log(`✅ ${servicos.length} serviços baratos criados com sucesso!`);
  });

  console.log("🎉 Loja Baratinha inserida com sucesso no banco de dados na nuvem!");
  process.exit(0);
}

inserirLojaBarata().catch((erro) => {
  console.error("❌ Erro ao inserir a loja:", erro);
  process.exit(1);
});
