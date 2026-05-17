const { get, run } = require("../../config/database");

async function buscarCacheGeocoding(enderecoNormalizado) {
  return get(
    `
      SELECT endereco_normalizado, latitude, longitude
      FROM geocoding_cache
      WHERE endereco_normalizado = ?
      LIMIT 1
    `,
    [enderecoNormalizado]
  );
}

async function salvarCacheGeocoding({ enderecoNormalizado, enderecoOriginal, latitude, longitude }) {
  await run(
    `
      INSERT INTO geocoding_cache (
        endereco_normalizado,
        endereco_original,
        latitude,
        longitude,
        atualizado_em
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(endereco_normalizado)
      DO UPDATE SET
        endereco_original = excluded.endereco_original,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        atualizado_em = excluded.atualizado_em
    `,
    [enderecoNormalizado, enderecoOriginal, latitude, longitude, new Date().toISOString()]
  );
}

module.exports = {
  buscarCacheGeocoding,
  salvarCacheGeocoding
};
