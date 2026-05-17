const { Router } = require("express");
const healthController = require("../controllers/healthController");

const router = Router();

// Endpoint de verificacao rapida do servidor.
router.get("/health", healthController.health);

module.exports = router;
