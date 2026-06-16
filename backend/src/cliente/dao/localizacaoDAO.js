// Importa as funções 'get' (buscar um registro) e 'run' (escrever no banco) da configuração do banco de dados.
const { get, run } = require("../../config/database");

/**
 * FUNÇÃO: buscarCacheGeocoding
 * OBJETIVO: Procurar no banco de dados local se o endereço (normalizado) já foi convertido em coordenadas GPS (latitude e longitude) anteriormente.
 * Isso impede que façamos requisições repetidas para a API de mapas na internet, economizando custos e limites.
 */
async function buscarCacheGeocoding(enderecoNormalizado) {
  // 'get': Executa uma query SQL que retorna uma única linha (registro).
  return get(
    `
      -- Seleciona a chave de busca (endereço normalizado) e as coordenadas GPS.
      SELECT endereco_normalizado, latitude, longitude
      -- Busca na tabela que criamos especificamente para cache de mapas.
      FROM geocoding_cache
      -- Filtra buscando pelo texto exato normalizado (evitando letras maiúsculas ou acentos diferentes).
      WHERE endereco_normalizado = ?
      -- Performance pura: achou o primeiro registro, para a busca.
      LIMIT 1
    `,
    // Injeta a variável com o endereço no lugar do '?' de forma segura (proteção contra SQL Injection).
    [enderecoNormalizado]
  );
}

/**
 * FUNÇÃO: salvarCacheGeocoding
 * OBJETIVO: Salvar ou atualizar (UPSERT) a tradução de um endereço para coordenadas GPS no banco de dados local.
 */
async function salvarCacheGeocoding({ enderecoNormalizado, enderecoOriginal, latitude, longitude }) {
  // 'run': Executa um comando SQL de escrita no banco de dados (inserção ou atualização).
  await run(
    `
      -- Tenta inserir as informações de geocodificação na tabela de cache.
      INSERT INTO geocoding_cache (
        endereco_normalizado,
        endereco_original,
        latitude,
        longitude,
        atualizado_em
      ) VALUES (?, ?, ?, ?, ?)
      -- LÓGICA DE UPSERT: Se o endereço normalizado já existir no banco (conflito de chave primária/única).
      ON CONFLICT(endereco_normalizado)
      -- Transforma o insert em uma atualização (UPDATE) dos dados antigos pelos novos.
      DO UPDATE SET
        endereco_original = excluded.endereco_original,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        atualizado_em = excluded.atualizado_em
    `,
    // Parâmetros que substituem cada '?' ordenadamente. Injeta também a data e hora atualizada no padrão ISO.
    [enderecoNormalizado, enderecoOriginal, latitude, longitude, new Date().toISOString()]
  );
}

// Exporta as funções para serem utilizadas na camada de repositório (distanciaRepository).
module.exports = {
  buscarCacheGeocoding,
  salvarCacheGeocoding
};
