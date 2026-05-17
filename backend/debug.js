const { all } = require("./src/config/database");

async function debug() {
  const lojas = await all("SELECT id, nome, endereco, latitude, longitude FROM estabelecimentos");
  console.log("--- LOJAS ---");
  console.table(lojas);

  const cache = await all("SELECT * FROM geocoding_cache");
  console.log("--- CACHE GEOCODING ---");
  console.table(cache);
}

debug().catch(console.error);
