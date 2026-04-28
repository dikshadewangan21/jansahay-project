const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sdgController');

router.get('/scores', ctrl.getSdgScores);

module.exports = router;
