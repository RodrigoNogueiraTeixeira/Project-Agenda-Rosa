const { run, get, all } = require("./src/config/database");

async function checkDatabase() {
  console.log("--- INICIANDO VERIFICAÇÃO DO BANCO ---");
  try {
    const estabelecimentos = await all("SELECT id, nome, cidade, bairro FROM estabelecimentos LIMIT 5");
    console.log("\n--- ESTABELECIMENTOS ---");
    console.table(estabelecimentos);

    const empresas = await all("SELECT id, nome_responsavel, nome_estabelecimento, email FROM empresas LIMIT 5");
    console.log("\n--- EMPRESAS ---");
    console.table(empresas);

    const servicos = await all("SELECT id, nome, preco, estabelecimento_id, empresa_id FROM servicos LIMIT 5");
    console.log("\n--- SERVICOS ---");
    console.table(servicos);

    const profissionais = await all("SELECT id, nome, empresa_id, ativo FROM profissionais LIMIT 5");
    console.log("\n--- PROFISSIONAIS ---");
    console.table(profissionais);
  } catch (error) {
    console.error("Erro na verificação:", error);
  }
}

checkDatabase().catch(console.error);
