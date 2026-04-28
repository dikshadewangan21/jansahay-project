const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();

const { register, login, getMe, updateMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate }     = require('../middleware/validate');

router.post(
  '/register',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['user', 'volunteer']).withMessage('Invalid role'),
  ]),
  register,
);

router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  login,
);

router.get('/me',    authenticate, getMe);
router.patch('/me',  authenticate, updateMe);

module.exports = router;
