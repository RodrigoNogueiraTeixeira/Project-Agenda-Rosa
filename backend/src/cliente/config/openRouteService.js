const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

function obterConfigOpenRouteService() {
  return {
    apiKey: process.env.ORS_API_KEY || "",
    baseUrl: process.env.ORS_BASE_URL || "https://api.openrouteservice.org",
    profile: process.env.ORS_PROFILE || "driving-car"
  };
}

module.exports = {
  obterConfigOpenRouteService
};
