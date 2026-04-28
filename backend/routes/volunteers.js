const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const ctrl = require('../controllers/volunteersController');
const { validate }    = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const VALID_SKILLS = [
  'medical','first-aid','counseling','elderly-care','medicine-distribution',
  'logistics','food-distribution','coordination','driving',
  'plumbing','water-sanitation','construction','heavy-lifting','shelter-setup',
  'field-survey','documentation',
  'translation-hindi','translation-bengali','translation-odia',
  'education','child-welfare','woman-child-welfare',
];

// Public — list and view
router.get(
  '/',
  validate([
    query('status').optional().isIn(['available', 'on-task', 'inactive']),
    query('availability').optional().isIn(['daily', 'weekdays', 'weekends']),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 }),
  ]),
  ctrl.listVolunteers,
);

// /match/:taskId MUST come before /:id to avoid conflict
router.get('/match/:taskId', ctrl.matchForTask);
router.get('/:id', validate([param('id').notEmpty()]), ctrl.getVolunteer);

// Register volunteer — requires login (any role); admins can also register on behalf
router.post(
  '/',
  authenticate,
  validate([
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name required (2–100 chars)'),
    body('phone').trim().matches(/^\+?[\d\s\-]{7,15}$/).withMessage('Valid phone number required'),
    body('skills').isArray({ min: 1 }).withMessage('At least one skill required'),
    body('skills.*').isIn(VALID_SKILLS).withMessage('Invalid skill value'),
    body('availability').isIn(['daily', 'weekdays', 'weekends']).withMessage('Invalid availability'),
    body('location').isObject(),
    body('location.lat').isFloat({ min: -90,  max: 90  }),
    body('location.lng').isFloat({ min: -180, max: 180 }),
  ]),
  ctrl.registerVolunteer,
);

// Status update — volunteer updating their own status or admin
router.patch(
  '/:id/status',
  authenticate,
  validate([
    param('id').notEmpty(),
    body('status').isIn(['available', 'on-task', 'inactive']),
  ]),
  ctrl.updateVolunteerStatus,
);

// Delete — admin only
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate([param('id').notEmpty().withMessage('Volunteer ID required')]),
  ctrl.deleteVolunteer,
);

module.exports = router;
