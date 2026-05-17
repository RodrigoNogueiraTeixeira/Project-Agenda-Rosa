const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');

router.get('/pendentes', empresaController.getEmpresasPendentes);
router.post('/:id/aprovar', empresaController.approveEmpresa);
router.post('/:id/reprovar', empresaController.rejectEmpresa);

module.exports = router;
