/**
 * ARQUIVO: openRouteService.js
 * OBJETIVO: Centralizar as configurações da API do OpenRouteService.
 * FUNCIONAMENTO: O OpenRouteService é um mapa (estilo Google Maps gratuito) que usamos para calcular a distância
 * entre o salão/profissional e a casa da cliente. Isso é crucial para calcular a taxa de deslocamento.
 */

// ==========================================
// IMPORTAÇÃO: DOTENV (O Cofre de Senhas)
// ==========================================
// O QUE É: Mesma lógica do Mercado Pago. Usamos a biblioteca externa 'dotenv' para proteger nossas chaves.
// Ela vai ler o arquivo secreto '.env' e jogar as informações na memória (process.env).
const dotenv = require("dotenv");
const path = require("path");

// ==========================================
// CONFIGURAÇÃO DO CAMINHO DO ARQUIVO .ENV
// ==========================================
// O QUE É: O 'path.join' + '__dirname' funciona como um GPS para achar o arquivo .env
// voltando duas pastas para trás, garantindo que vai funcionar em qualquer computador ou servidor.
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

/**
 * FUNÇÃO: obterConfigOpenRouteService
 * OBJETIVO: Empacotar as chaves e links do mapa para o sistema usar quando precisar calcular distâncias.
 */
function obterConfigOpenRouteService() {
  return {
    // ==========================================
    // 1. apiKey (A Chave de Acesso do Mapa)
    // ==========================================
    // O QUE É: A senha secreta fornecida pela conta do OpenRouteService.
    // FLUXO: Toda vez que o sistema pergunta "Qual a distância da Rua A para a Rua B?", enviamos essa chave.
    // Se estiver em branco ('|| ""'), o sistema do mapa vai recusar a nossa pergunta (Dando erro de Unauthorized).
    apiKey: process.env.ORS_API_KEY || "",
    
    // ==========================================
    // 2. baseUrl (O Endereço do Servidor do Mapa)
    // ==========================================
    // O QUE É: É o link oficial do servidor onde o mapa está hospedado.
    // FLUXO: Se não definirmos nada no arquivo .env, o operador '||' garante um fallback (Plano B), 
    // usando o endereço oficial "https://api.openrouteservice.org" automaticamente.
    baseUrl: process.env.ORS_BASE_URL || "https://api.openrouteservice.org",
    
    // ==========================================
    // 3. profile (Perfil de Locomoção)
    // ==========================================
    // O QUE É: Diz para o mapa como a profissional vai se deslocar até a casa da cliente.
    // FLUXO: Pode ser "driving-car" (carro), "foot-walking" (a pé), ou "cycling-regular" (bicicleta). 
    // Usamos carro ("driving-car") como padrão para calcular a rota exata pelas ruas e avenidas (evitando ruas na contramão), 
    // dando a distância em km real da viagem, e não a distância em "linha reta".
    profile: process.env.ORS_PROFILE || "driving-car"
  };
}

module.exports = {
  obterConfigOpenRouteService
};
