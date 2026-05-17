const { run, get } = require("./src/config/database");

async function inserir() {
  console.log("Inserindo loja Clouvecor...");
  
  await run(`
    INSERT INTO estabelecimentos (nome, cidade, bairro, endereco, cep, logo_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    "Clouvecor",
    "Goiânia",
    "Setor Bueno",
    "Avenida T-4, Setor Bueno, Goiânia - GO, Brasil",
    "74230-030",
    "https://picsum.photos/seed/clouvecor/320/180"
  ]);
  
  const loja = await get(`SELECT id FROM estabelecimentos WHERE nome = 'Clouvecor' ORDER BY id DESC LIMIT 1`);
  if (loja) {
    await run(`INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES (?, ?)`, [loja.id, "cabelo"]);
    await run(`INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES (?, ?)`, [loja.id, "manicure"]);
    await run(`INSERT INTO servicos (estabelecimento_id, nome, preco) VALUES (?, ?, ?)`, [loja.id, "Corte Teste Barato", 1]);
    await run(`INSERT INTO servicos (estabelecimento_id, nome, preco) VALUES (?, ?, ?)`, [loja.id, "Pintura Teste Barata", 1.5]);
  }

  console.log("Loja Clouvecor inserida com sucesso!");
  process.exit(0);
}

inserir().catch((erro) => {
  console.error("Erro ao inserir:", erro);
  process.exit(1);
});
