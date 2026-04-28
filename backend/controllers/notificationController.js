/**
 * Notification Controller
 * Handles listing, marking as read, and deleting notifications for the
 * currently authenticated user.
 */

const Notification   = require('../models/Notification');
const { AppError }   = require('../middleware/errorHandler');
const asyncHandler   = require('../middleware/asyncHandler');

// ── GET /api/notifications ────────────────────────────────────────────────────
/**
 * List notifications for the logged-in user.
 * Supports ?unreadOnly=true and pagination via ?limit & ?offset.
 */
const listNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly, limit = 20, offset = 0 } = req.query;

  const filter = { recipient: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .lean({ virtuals: true }),

    Notification.countDocuments(filter),

    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.json({
    data: notifications,
    meta: { total, unreadCount, limit: Number(limit), offset: Number(offset) },
  });
});

// ── GET /api/notifications/unread-count ───────────────────────────────────────
/**
 * Lightweight endpoint — returns just the unread count.
 * Called by the bell icon polling logic.
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });
  res.json({ unreadCount: count });
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
/**
 * Mark a single notification as read.
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true },
  ).lean({ virtuals: true });

  if (!notification) throw new AppError('Notification not found', 404);
  res.json(notification);
});

// ── PATCH /api/notifications/read-all ────────────────────────────────────────
/**
 * Mark ALL notifications for the current user as read.
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() },
  );
  res.json({ updated: result.modifiedCount });
});

// ── DELETE /api/notifications/:id ────────────────────────────────────────────
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id,
  });
  if (!notification) throw new AppError('Notification not found', 404);
  res.json({ message: 'Deleted', id: req.params.id });
});

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
