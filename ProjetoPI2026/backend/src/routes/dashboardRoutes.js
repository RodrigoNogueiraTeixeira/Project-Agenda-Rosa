const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/stats', dashboardController.getDashboard);
router.post('/apply-period', dashboardController.applyPeriod);

module.exports = router;
