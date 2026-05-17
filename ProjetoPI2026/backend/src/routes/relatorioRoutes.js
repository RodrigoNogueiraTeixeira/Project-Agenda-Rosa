const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');

router.get('/', relatorioController.getRelatorio);

module.exports = router;
