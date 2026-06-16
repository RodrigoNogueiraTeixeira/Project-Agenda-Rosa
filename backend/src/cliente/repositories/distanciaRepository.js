// --- IMPORTAÇÕES DO ECOSSISTEMA DE LOCALIZAÇÃO ---

// DAO de Localização: Acessa o banco de dados local para ler/escrever no cache de endereços.
const localizacaoDAO = require("../dao/localizacaoDAO");

// Repositório de Estabelecimentos: Usado para carregar a lista de salões que serão filtrados por proximidade.
const estabelecimentosRepository = require("./estabelecimentosRepository");

// Utilitário de Texto: Função para normalizar strings (limpar acentos, espaços e padronizar minúsculas).
const { normalizarTexto } = require("../../utils/texto");

// Configuração do OpenRouteService: Obtém a chave API e configurações gerais para fazer requisições de mapas.
const { obterConfigOpenRouteService } = require("../config/openRouteService");

/**
 * FUNÇÃO: calcularDistanciaHaversine
 * OBJETIVO: Calcular a distância física aproximada em linha reta (em quilômetros) entre dois pontos do planeta Terra usando suas coordenadas geográficas (latitude e longitude).
 * POR QUE ISSO É IMPORTANTE? Fazer requisições de rotas de carro na internet para dezenas de salões seria extremamente lento e caro.
 * Com esta fórmula matemática local, filtramos instantaneamente quais lojas estão perto antes de sequer encostar na API de rotas.
 */
function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  // R: Raio médio da Terra estimado em 6371 quilômetros.
  const R = 6371; 
  
  // dLat: Calcula a diferença de latitude convertendo graus para radianos (multiplicando por PI e dividindo por 180).
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  
  // dLon: Calcula a diferença de longitude convertendo graus para radianos.
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  // a: Aplica a primeira parte da fórmula de Haversine (calculando a distância angular baseada nos senos e cossenos).
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  // c: Calcula a curvatura da superfície esférica terrestre entre os dois pontos.
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Retorna o raio multiplicado pela curvatura, resultando na distância exata em quilômetros.
  return R * c;
}

/**
 * FUNÇÃO: geocodificarEndereco
 * OBJETIVO: Transformar um endereço em formato de texto (Ex: "Av. Paulista, 1000 - São Paulo") em coordenadas geográficas (latitude e longitude).
 * COMO FUNCIONA: Ela possui um sistema de Cache Inteligente. Primeiro pergunta ao banco se já calculou esse endereço antes.
 * Se já calculou, devolve a coordenada salva (custo zero e velocidade instantânea). Se não, vai na internet consultar a API do OpenRouteService.
 */
async function geocodificarEndereco(endereco) {
  // Limpa o endereço removendo espaços extras nas pontas e garante que seja uma string válida.
  const enderecoLimpo = String(endereco || "").trim();
  // Se o endereço enviado estiver em branco, trava a execução com um erro.
  if (!enderecoLimpo) {
    throw new Error("Endereco obrigatorio para geocodificacao.");
  }

  // Normaliza o texto (remove acentos e deixa tudo em minúsculo) para garantir que a chave do cache seja idêntica.
  const enderecoNormalizado = normalizarTexto(enderecoLimpo);
  
  // --- PASSO 1: CONSULTA O CACHE LOCAL ---
  // Pergunta ao banco se já geocodificamos esse exato endereço normalizado anteriormente.
  const cache = await localizacaoDAO.buscarCacheGeocoding(enderecoNormalizado);
  
  // Se encontrou no banco...
  if (cache) {
    // Retorna as coordenadas do banco convertidas para números e encerra a função economizando API.
    return {
      latitude: Number(cache.latitude),
      longitude: Number(cache.longitude),
      enderecoNormalizado
    };
  }

  // --- PASSO 2: CONSULTA A API EXTERNA (CASO NÃO ESTEJA NO CACHE) ---
  // IMPORTANTE: Chamar 'obterConfigOpenRouteService()' apenas lê as chaves locais e configurações da memória (carregadas do arquivo .env). 
  // Isso NÃO faz nenhuma requisição de rede ou chamada para a internet (é super rápido e sem custo).
  const config = obterConfigOpenRouteService();
  // Se não houver chave de API configurada, interrompe com erro.
  if (!config.apiKey) {
    throw new Error("OpenRouteService nao configurado. Defina ORS_API_KEY no .env.");
  }

  // Instancia um formatador seguro de parâmetros para URLs (trata acentos, espaços e caracteres especiais automaticamente).
  const params = new URLSearchParams();
  params.set("api_key", config.apiKey); // Define nossa chave de segurança para autorizar o acesso.
  params.set("text", enderecoLimpo);    // Define o texto do endereço digitado pela cliente.
  params.set("size", "1");              // Pede apenas o 1º resultado (o mais relevante), economizando dados.
  params.set("boundary.country", "BR"); // Delimita a busca apenas para o Brasil, evitando ruas de mesmo nome fora do país.

  // Realiza a chamada HTTP GET de rede (envia o endereço para a API de mapas na internet).
  // O 'await' faz o servidor pausar e esperar a internet responder.
  const resposta = await fetch(`${config.baseUrl}/geocode/search?${params.toString()}`, { method: "GET" });
  
  // Lê o corpo da resposta em formato JSON. O '.catch()' garante que, se a API retornar um texto
  // inválido ou quebrado, o servidor assume um objeto vazio '{}' ao invés de cair a aplicação.
  const dados = await resposta.json().catch(() => ({}));

  // Se o servidor de mapas retornou erro HTTP (status diferente de 200).
  if (!resposta.ok) {
    // Para a execução e joga o erro contendo a mensagem vinda do mapa.
    throw new Error(dados.error?.message || "Falha ao geocodificar endereco.");
  }

  // Extrai o primeiro resultado da lista de localizações ('features'). O '|| []' impede crash caso a lista venha nula.
  const feature = (dados.features || [])[0];
  // Se o mapa não encontrou nenhuma rua correspondente ou a estrutura do resultado for inválida.
  if (!feature || !feature.geometry || !Array.isArray(feature.geometry.coordinates)) {
    throw new Error("Nao foi possivel localizar esse endereco.");
  }

  // O OpenRouteService retorna [Longitude, Latitude] (inverso do padrão de mapas). Separamos aqui.
  const [longitude, latitude] = feature.geometry.coordinates;
  
  // --- PASSO 3: SALVA NO CACHE LOCAL ---
  // Grava as coordenadas e o endereço no banco de dados para nunca mais precisar consultar a internet por este endereço.
  await localizacaoDAO.salvarCacheGeocoding({
    enderecoNormalizado,
    enderecoOriginal: enderecoLimpo,
    latitude: Number(latitude),
    longitude: Number(longitude)
  });

  // Retorna as coordenadas encontradas para o sistema utilizar.
  return { latitude: Number(latitude), longitude: Number(longitude), enderecoNormalizado };
}

/**
 * FUNÇÃO: calcularDistanciaEntrePontos
 * OBJETIVO: Calcular a rota de trânsito real pelas ruas e avenidas da cidade entre dois pontos geográficos (origem e destino).
 * COMO FUNCIONA: Faz uma chamada HTTP POST na API de Directions (Direções) do OpenRouteService, enviando as coordenadas do ponto A e do ponto B.
 * A API calcula o caminho viário real e nos devolve a distância exata em metros e o tempo estimado em segundos considerando as vias de trânsito.
 */
async function calcularDistanciaEntrePontos({ origem, destino }) {
  // Puxa as configurações de acesso à API (chave, URL base e se é de carro/a pé).
  const config = obterConfigOpenRouteService();
  // Se não houver chave de API configurada, para e lança o erro.
  if (!config.apiKey) {
    throw new Error("OpenRouteService nao configurado. Defina ORS_API_KEY no .env.");
  }

  // Faz a chamada HTTP POST para a rota de direções do mapa.
  // Injeta o perfil de locomoção dinamicamente no final do link (Ex: /directions/driving-car).
  const resposta = await fetch(`${config.baseUrl}/v2/directions/${config.profile}`, {
    method: "POST", // Método POST pois enviaremos um corpo (body) com as coordenadas em JSON.
    headers: {
      Authorization: config.apiKey, // Passa a nossa chave no cabeçalho de autorização.
      "Content-Type": "application/json" // Avisa ao servidor que o corpo enviado é um JSON.
    },
    // Converte o objeto de coordenadas para texto JSON.
    body: JSON.stringify({
      coordinates: [
        [origem.longitude, origem.latitude], // Ponto de partida [longitude, latitude].
        [destino.longitude, destino.latitude] // Ponto de chegada [longitude, latitude].
      ]
    })
  });

  // Tenta ler e converter a resposta JSON da API. Se vier quebrado, assume objeto vazio.
  const dados = await resposta.json().catch(() => ({}));
  
  // Se a chamada de rede deu erro.
  if (!resposta.ok) {
    throw new Error(dados.error?.message || "Falha ao calcular distancia.");
  }

  // Pega o resumo da primeira rota sugerida (contém a distância e o tempo total).
  const resumo = dados.routes?.[0]?.summary;
  // Se a API não conseguiu traçar nenhuma rota viária válida entre esses dois locais.
  if (!resumo) {
    throw new Error("Nao foi possivel calcular rota para os enderecos informados.");
  }

  // Retorna a distância exata convertida em metros e a duração estimada em segundos.
  return {
    distanciaMetros: Number(resumo.distance || 0),
    duracaoSegundos: Number(resumo.duration || 0)
  };
}

/**
 * FUNÇÃO: calcularDistanciaPorEndereco
 * OBJETIVO: Orquestrar o cálculo de distância completo a partir de dois textos de endereço.
 * FLUXO: Ela converte o texto da origem em coordenadas -> converte o texto do destino em coordenadas -> calcula a rota entre essas coordenadas -> formata a resposta amigável para o app.
 */
async function calcularDistanciaPorEndereco({ origemEndereco, destinoEndereco }) {
  // Passo 1: Converte o texto do endereço de origem em latitude e longitude.
  const origem = await geocodificarEndereco(origemEndereco);
  // Passo 2: Converte o texto do endereço de destino em latitude e longitude.
  const destino = await geocodificarEndereco(destinoEndereco);
  // Passo 3: Pede para calcular a rota de carro real entre os dois pontos geográficos obtidos.
  const rota = await calcularDistanciaEntrePontos({ origem, destino });

  // Devolve o resultado em um formato amigável para o aplicativo de celular usar.
  return {
    distanciaMetros: rota.distanciaMetros, // Distância crua em metros.
    // Converte metros para Kilômetros dividindo por 1000 e fixa em duas casas decimais (ex: 2.34 km).
    distanciaKm: Number((rota.distanciaMetros / 1000).toFixed(2)), 
    duracaoSegundos: rota.duracaoSegundos, // Tempo de viagem cru em segundos.
    // Converte segundos para minutos dividindo por 60 e arredonda matematicamente para o inteiro mais próximo.
    duracaoMinutos: Math.round(rota.duracaoSegundos / 60) 
  };
}

/**
 * FUNÇÃO: filtrarEstabelecimentosPorRaio
 * OBJETIVO: Buscar todos os salões/estabelecimentos do banco e filtrar retornando apenas os que estão em um raio limite de Km da cliente.
 * DESEMPENHO E ECONOMIA: 
 * 1. Resolve a coordenada de origem da cliente (geocodificando apenas uma vez).
 * 2. Faz uma busca inicial no banco filtrando pela cidade, bairro ou tipo de salão.
 * 3. Usa um sistema de "Lazy Load" (Carga Tardia): se a loja do banco não tiver latitude/longitude salva, faz a geocodificação dela e já atualiza o banco para futuras consultas.
 * 4. Faz o cálculo de raio usando a fórmula de Haversine localmente (super veloz).
 * 5. Ordena a lista da mais próxima para a mais distante.
 */
async function filtrarEstabelecimentosPorRaio({ cidade, bairro, tipo, busca, origemEndereco, origemCoordenadas, raioKm }) {
  // Converte o raio recebido para número decimal.
  const raio = Number(raioKm);
  // Validação: Garante que foi fornecido um endereço de origem (texto ou coordenadas GPS) e um raio válido maior que zero.
  if ((!origemEndereco && !origemCoordenadas) || !Number.isFinite(raio) || raio <= 0) {
    throw new Error("Origem e raioKm validos sao obrigatorios.");
  }

  // Busca uma lista inicial de estabelecimentos do banco usando filtros básicos (traz até 200 lojas de uma vez).
  const base = await estabelecimentosRepository.listarEstabelecimentosComFiltro({
    cidade,
    bairro,
    tipo,
    busca,
    page: 1,
    limit: 200
  });

  // Variável que guardará a latitude e longitude da cliente.
  let origem;
  
  // Se o aplicativo de celular já enviou as coordenadas GPS diretas do aparelho.
  if (origemCoordenadas && origemCoordenadas.latitude && origemCoordenadas.longitude) {
    // Apenas armazena convertendo para números.
    origem = {
      latitude: Number(origemCoordenadas.latitude),
      longitude: Number(origemCoordenadas.longitude)
    };
  } else {
    // Se enviou apenas endereço escrito em texto, geocodifica usando o cache ou a API externa.
    origem = await geocodificarEndereco(origemEndereco);
  }

  // Importa dinamicamente a função para salvar coordenadas geográficas de lojas no banco.
  const { atualizarCoordenadas } = require("../dao/estabelecimentosDAO");
  // Inicializa a lista de lojas filtradas que estão dentro do raio limite.
  const resultado = [];

  // Percorre cada salão da lista trazida do banco de dados.
  for (const estabelecimento of base.estabelecimentos || []) {
    // 'try-catch': Envolve cada loja individualmente. Se uma loja der falha de geocodificação,
    // o loop não quebra e continua processando as demais lojas normalmente.
    try {
      let lat = estabelecimento.latitude;
      let lon = estabelecimento.longitude;

      // --- ESTRATÉGIA LAZY LOAD (CARGA TARDIA) ---
      // Se essa loja do banco de dados ainda não tem as coordenadas geográficas cadastradas.
      if (!lat || !lon) {
        // Converte o endereço físico da loja em coordenadas GPS.
        const destino = await geocodificarEndereco(estabelecimento.endereco);
        lat = destino.latitude;
        lon = destino.longitude;

        // Salva essas coordenadas no banco para que nas próximas consultas a conta seja instantânea e local.
        await atualizarCoordenadas(estabelecimento.id, lat, lon);
      }

      // Calcula a distância em Km em linha reta entre a cliente (origem) e a loja (lat/lon).
      // Reduz o resultado para 2 casas decimais (ex: 3.14 km).
      const distanciaKm = Number(calcularDistanciaHaversine(origem.latitude, origem.longitude, lat, lon).toFixed(2));

      // Se a distância calculada for menor ou igual ao raio máximo definido pela cliente.
      if (distanciaKm <= raio) {
        // Adiciona a loja à lista de resultados válidos.
        resultado.push({
          ...estabelecimento,
          distanciaKm, // Anexa a distância em km na resposta.
          // Estima o tempo de viagem assumindo uma velocidade média urbana de 30 km/h.
          duracaoMinutos: Math.round((distanciaKm / 30) * 60)
        });
      }
    } catch (_error) {
      // Ignora erros individuais de geocodificação de uma loja específica para não travar a lista inteira.
    }
  }

  // Ordena a lista final: as lojas mais próximas aparecem primeiro na tela.
  resultado.sort((a, b) => a.distanciaKm - b.distanciaKm);
  
  // Retorna os salões filtrados e ordenados.
  return resultado;
}

// Exporta as funções para o controlador.
module.exports = {
  calcularDistanciaPorEndereco,
  filtrarEstabelecimentosPorRaio
};
