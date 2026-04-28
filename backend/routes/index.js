/**
 * Root API Router
 * Mounts all sub-routers under /api/*
 */

const express = require('express');
const router  = express.Router();

router.use('/auth',          require('./auth'));
router.use('/reports',       require('./reports'));
router.use('/volunteers',    require('./volunteers'));
router.use('/tasks',         require('./tasks'));
router.use('/dashboard',     require('./dashboard'));
router.use('/sdg',           require('./sdg'));
router.use('/ai',            require('./ai'));
router.use('/notifications', require('./notifications')); // NEW

module.exports = router;
