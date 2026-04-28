const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const ctrl = require('../controllers/tasksController');
const { validate }    = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const VALID_CATEGORIES = [
  'food', 'water', 'health', 'shelter', 'infrastructure', 'air',
  'electricity', 'roads', 'sanitation',
];

// Public — list and get
router.get(
  '/',
  validate([
    query('status').optional().isIn(['open', 'in-progress', 'completed']),
    query('category').optional().isIn(VALID_CATEGORIES),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 }),
  ]),
  ctrl.listTasks,
);

router.get('/:id', validate([param('id').notEmpty()]), ctrl.getTask);

// Auth-required — create, assign, complete (volunteer or admin)
router.post(
  '/',
  authenticate,
  requireRole('admin', 'volunteer'),
  validate([
    body('title').trim().isLength({ min: 5, max: 200 }),
    body('description').trim().isLength({ min: 10, max: 2000 }),
    body('category').isIn(VALID_CATEGORIES),
    body('location').isObject(),
    body('location.lat').isFloat({ min: -90,  max: 90  }),
    body('location.lng').isFloat({ min: -180, max: 180 }),
    body('estimatedHours').optional().isInt({ min: 1, max: 48 }),
  ]),
  ctrl.createTask,
);

router.post(
  '/:id/assign',
  authenticate,
  requireRole('admin', 'volunteer'),
  validate([
    param('id').notEmpty(),
    body('volunteerId').notEmpty().withMessage('volunteerId is required'),
  ]),
  ctrl.assignTask,
);

router.post(
  '/:id/complete',
  authenticate,
  requireRole('admin', 'volunteer'),
  validate([param('id').notEmpty()]),
  ctrl.completeTask,
);

router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate([param('id').notEmpty()]),
  ctrl.deleteTask,
);

module.exports = router;
