const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboardController');

router.get('/stats',      ctrl.getDashboardStats);
router.get('/need-graph', ctrl.getNeedGraph);
router.get('/forecast',   ctrl.getForecast);

module.exports = router;
