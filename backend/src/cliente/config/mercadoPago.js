const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

function obrigatorio(valor, nome) {
  if (!valor) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${nome}`);
  }

  return valor;
}

function obterConfigMercadoPago() {
  return {
    accessToken: obrigatorio(process.env.MP_ACCESS_TOKEN, "MP_ACCESS_TOKEN"),
    baseUrl: process.env.MP_API_BASE_URL || "https://api.mercadopago.com",
    appBaseUrl: obrigatorio(process.env.APP_BASE_URL, "APP_BASE_URL"),
    webhookUrl: process.env.MP_WEBHOOK_URL || "",
    integratorId: process.env.MP_INTEGRATOR_ID || ""
  };
}

module.exports = {
  obterConfigMercadoPago
};
