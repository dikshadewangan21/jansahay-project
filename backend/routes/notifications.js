/**
 * Notification Routes
 * All routes require authentication (JWT).
 *
 * GET    /api/notifications               — list notifications (with ?unreadOnly=true)
 * GET    /api/notifications/unread-count  — lightweight unread count
 * PATCH  /api/notifications/read-all      — mark all as read
 * PATCH  /api/notifications/:id/read      — mark one as read
 * DELETE /api/notifications/:id           — delete one
 */

const express = require('express');
const { param, query } = require('express-validator');
const router = express.Router();

const ctrl = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate }     = require('../middleware/validate');

// All notification routes are protected
router.use(authenticate);

router.get(
  '/',
  validate([
    query('unreadOnly').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ]),
  ctrl.listNotifications,
);

router.get('/unread-count', ctrl.getUnreadCount);

router.patch('/read-all', ctrl.markAllAsRead);

router.patch(
  '/:id/read',
  validate([param('id').notEmpty()]),
  ctrl.markAsRead,
);

router.delete(
  '/:id',
  validate([param('id').notEmpty()]),
  ctrl.deleteNotification,
);

module.exports = router;
