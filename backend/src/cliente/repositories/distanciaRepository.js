const localizacaoDAO = require("../dao/localizacaoDAO");
const estabelecimentosRepository = require("./estabelecimentosRepository");
const { normalizarTexto } = require("../../utils/texto");
const { obterConfigOpenRouteService } = require("../config/openRouteService");

// Calcula a distancia em linha reta (Km) entre duas coordenadas usando a formula de Haversine.
function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function geocodificarEndereco(endereco) {
  const enderecoLimpo = String(endereco || "").trim();
  if (!enderecoLimpo) {
    throw new Error("Endereco obrigatorio para geocodificacao.");
  }

  const enderecoNormalizado = normalizarTexto(enderecoLimpo);
  const cache = await localizacaoDAO.buscarCacheGeocoding(enderecoNormalizado);
  if (cache) {
    return {
      latitude: Number(cache.latitude),
      longitude: Number(cache.longitude),
      enderecoNormalizado
    };
  }

  const config = obterConfigOpenRouteService();
  if (!config.apiKey) {
    throw new Error("OpenRouteService nao configurado. Defina ORS_API_KEY no .env.");
  }

  const params = new URLSearchParams();
  params.set("api_key", config.apiKey);
  params.set("text", enderecoLimpo);
  params.set("size", "1");
  params.set("boundary.country", "BR");

  const resposta = await fetch(`${config.baseUrl}/geocode/search?${params.toString()}`, { method: "GET" });
  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(dados.error?.message || "Falha ao geocodificar endereco.");
  }

  const feature = (dados.features || [])[0];
  if (!feature || !feature.geometry || !Array.isArray(feature.geometry.coordinates)) {
    throw new Error("Nao foi possivel localizar esse endereco.");
  }

  const [longitude, latitude] = feature.geometry.coordinates;
  await localizacaoDAO.salvarCacheGeocoding({
    enderecoNormalizado,
    enderecoOriginal: enderecoLimpo,
    latitude: Number(latitude),
    longitude: Number(longitude)
  });

  return { latitude: Number(latitude), longitude: Number(longitude), enderecoNormalizado };
}

async function calcularDistanciaEntrePontos({ origem, destino }) {
  const config = obterConfigOpenRouteService();
  if (!config.apiKey) {
    throw new Error("OpenRouteService nao configurado. Defina ORS_API_KEY no .env.");
  }

  const resposta = await fetch(`${config.baseUrl}/v2/directions/${config.profile}`, {
    method: "POST",
    headers: {
      Authorization: config.apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      coordinates: [
        [origem.longitude, origem.latitude],
        [destino.longitude, destino.latitude]
      ]
    })
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.error?.message || "Falha ao calcular distancia.");
  }

  const resumo = dados.routes?.[0]?.summary;
  if (!resumo) {
    throw new Error("Nao foi possivel calcular rota para os enderecos informados.");
  }

  return {
    distanciaMetros: Number(resumo.distance || 0),
    duracaoSegundos: Number(resumo.duration || 0)
  };
}

async function calcularDistanciaPorEndereco({ origemEndereco, destinoEndereco }) {
  const origem = await geocodificarEndereco(origemEndereco);
  const destino = await geocodificarEndereco(destinoEndereco);
  const rota = await calcularDistanciaEntrePontos({ origem, destino });

  return {
    distanciaMetros: rota.distanciaMetros,
    distanciaKm: Number((rota.distanciaMetros / 1000).toFixed(2)),
    duracaoSegundos: rota.duracaoSegundos,
    duracaoMinutos: Math.round(rota.duracaoSegundos / 60)
  };
}

async function filtrarEstabelecimentosPorRaio({ cidade, bairro, tipo, busca, origemEndereco, origemCoordenadas, raioKm }) {
  const raio = Number(raioKm);
  if ((!origemEndereco && !origemCoordenadas) || !Number.isFinite(raio) || raio <= 0) {
    throw new Error("Origem e raioKm validos sao obrigatorios.");
  }

  const base = await estabelecimentosRepository.listarEstabelecimentosComFiltro({
    cidade,
    bairro,
    tipo,
    busca,
    page: 1,
    limit: 200
  });

  let origem;
  if (origemCoordenadas && origemCoordenadas.latitude && origemCoordenadas.longitude) {
    origem = {
      latitude: Number(origemCoordenadas.latitude),
      longitude: Number(origemCoordenadas.longitude)
    };
  } else {
    origem = await geocodificarEndereco(origemEndereco);
  }

  const { atualizarCoordenadas } = require("../dao/estabelecimentosDAO");
  const resultado = [];

  for (const estabelecimento of base.estabelecimentos || []) {
    try {
      let lat = estabelecimento.latitude;
      let lon = estabelecimento.longitude;

      // Lazy load: se não tem no banco, busca na API e salva!
      if (!lat || !lon) {
        const destino = await geocodificarEndereco(estabelecimento.endereco);
        lat = destino.latitude;
        lon = destino.longitude;

        // Salva no banco para a próxima vez a conta ser instantânea e local
        await atualizarCoordenadas(estabelecimento.id, lat, lon);
      }

      // Cálculo matemático ultra rápido e local
      const distanciaKm = Number(calcularDistanciaHaversine(origem.latitude, origem.longitude, lat, lon).toFixed(2));

      if (distanciaKm <= raio) {
        resultado.push({
          ...estabelecimento,
          distanciaKm,
          // Estimativa básica de tempo (assumindo média de 30km/h na cidade)
          duracaoMinutos: Math.round((distanciaKm / 30) * 60)
        });
      }
    } catch (_error) {
      // Se uma loja falhar no geocode, seguimos com as demais.
    }
  }

  resultado.sort((a, b) => a.distanciaKm - b.distanciaKm);
  return resultado;
}

module.exports = {
  calcularDistanciaPorEndereco,
  filtrarEstabelecimentosPorRaio
};
