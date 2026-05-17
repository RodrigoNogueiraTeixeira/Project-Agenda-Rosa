const { run, get } = require("./src/config/database");

async function inserir() {
  console.log("Inserindo lojas de teste em Goiânia...");
  
  // Loja 1: Perto (Marechal Rondon)
  await run(`
    INSERT INTO estabelecimentos (nome, cidade, bairro, endereco, cep, logo_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    "Salão Marechal Rondon",
    "Goiânia",
    "Setor Centro Oeste",
    "Avenida Marechal Rondon, Setor Centro Oeste, Goiânia - GO, Brasil",
    "74450-020",
    "https://picsum.photos/seed/goiania-perto/320/180"
  ]);
  
  const loja1 = await get(`SELECT id FROM estabelecimentos WHERE nome = 'Salão Marechal Rondon' ORDER BY id DESC LIMIT 1`);
  if (loja1) {
    await run(`INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES (?, ?)`, [loja1.id, "cabelo"]);
    await run(`INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES (?, ?)`, [loja1.id, "manicure"]);
    await run(`INSERT INTO servicos (estabelecimento_id, nome, preco) VALUES (?, ?, ?)`, [loja1.id, "Corte de Cabelo", 50]);
    await run(`INSERT INTO servicos (estabelecimento_id, nome, preco) VALUES (?, ?, ?)`, [loja1.id, "Manicure", 35]);
  }

  // Loja 2: Bem longe (Extremo Noroeste de Goiânia)
  await run(`
    INSERT INTO estabelecimentos (nome, cidade, bairro, endereco, cep, logo_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    "Salão Extremo Longe",
    "Goiânia",
    "Jardim Curitiba",
    "Avenida do Povo, Jardim Curitiba, Goiânia - GO, Brasil",
    "74480-110",
    "https://picsum.photos/seed/goiania-longe/320/180"
  ]);
  
  const loja2 = await get(`SELECT id FROM estabelecimentos WHERE nome = 'Salão Extremo Longe' ORDER BY id DESC LIMIT 1`);
  if (loja2) {
    await run(`INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES (?, ?)`, [loja2.id, "cabelo"]);
    await run(`INSERT INTO servicos (estabelecimento_id, nome, preco) VALUES (?, ?, ?)`, [loja2.id, "Corte de Cabelo (Longe)", 45]);
  }

  console.log("Lojas de teste inseridas com sucesso!");
  process.exit(0);
}

inserir().catch((erro) => {
  console.error("Erro ao inserir:", erro);
  process.exit(1);
});
