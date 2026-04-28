const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const ctrl   = require('../controllers/reportsController');
const { validate }        = require('../middleware/validate');
const { authenticate, optionalAuth, requireRole } = require('../middleware/authMiddleware');
const { upload }          = require('../middleware/upload');

const VALID_CATEGORIES = [
  'water', 'electricity', 'roads', 'sanitation', 'health',
  'food', 'shelter', 'infrastructure', 'air',
];
const VALID_SOURCES = ['whatsapp', 'paper_survey', 'ngo_upload', 'iot', 'web', 'mobile'];

// ── GET /api/reports ──────────────────────────────────────────────────────────
router.get(
  '/',
  optionalAuth,
  validate([
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 }),
    query('minUrgency').optional().isInt({ min: 0, max: 100 }),
    query('category').optional().isIn(VALID_CATEGORIES),
    query('status').optional().isIn(['open', 'assigned', 'in_progress', 'completed', 'rejected']),
    query('source').optional().isIn(VALID_SOURCES),
    query('sortBy').optional().isIn(['urgency', 'votes', 'newest']),
  ]),
  ctrl.listReports,
);

// ── Analytics (before /:id) ───────────────────────────────────────────────────
router.get('/analytics/summary', ctrl.getAnalytics);

// ── Heatmap (before /:id) ─────────────────────────────────────────────────────
router.get('/heatmap', ctrl.getHeatmapData);

// ── GET /api/reports/:id ──────────────────────────────────────────────────────
router.get(
  '/:id',
  optionalAuth,
  validate([param('id').notEmpty()]),
  ctrl.getReport,
);

// ── POST /api/reports (submit complaint) ──────────────────────────────────────
router.post(
  '/',
  optionalAuth,
  validate([
    body('source').isIn(VALID_SOURCES).withMessage('Invalid source'),
    body('category').isIn(VALID_CATEGORIES).withMessage('Invalid category'),
    body('title').trim().isLength({ min: 5, max: 200 }),
    body('description').trim().isLength({ min: 10, max: 2000 }),
    body('location').isObject(),
    body('location.lat').isFloat({ min: -90, max: 90 }),
    body('location.lng').isFloat({ min: -180, max: 180 }),
    body('affectedCount').optional().isInt({ min: 0 }),
    body('reportedBy').optional().isLength({ max: 100 }),
    body('tags').optional().isArray(),
    body('submitterEmail').optional().isEmail(),
  ]),
  ctrl.createReport,
);

// ── POST /api/reports/:id/images (upload proof images) ────────────────────────
router.post(
  '/:id/images',
  authenticate,
  upload.array('images', 5), // max 5 images per complaint
  async (req, res, next) => {
    try {
      const Report = require('../models/Report');
      const report = await Report.findById(req.params.id);
      if (!report) return res.status(404).json({ error: 'Report not found' });

      const newImages = (req.files || []).map((f) => ({
        url:      `/uploads/${f.filename}`,
        filename: f.filename,
      }));

      await Report.findByIdAndUpdate(req.params.id, {
        $push: { images: { $each: newImages } },
      });

      res.json({ uploaded: newImages.length, images: newImages });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/reports/:id/vote ─────────────────────────────────────────────────
router.post(
  '/:id/vote',
  authenticate,
  validate([param('id').notEmpty()]),
  ctrl.voteReport,
);

// ── POST /api/reports/:id/feedback ────────────────────────────────────────────
router.post(
  '/:id/feedback',
  authenticate,
  validate([
    param('id').notEmpty(),
    body('impactRating').isInt({ min: 1, max: 5 }),
    body('impactFeedback').optional().isLength({ max: 500 }),
  ]),
  ctrl.submitFeedback,
);

// ── POST /api/reports/:id/classify ────────────────────────────────────────────
router.post(
  '/:id/classify',
  authenticate,
  requireRole('admin', 'volunteer'),
  ctrl.classifyReport,
);

// ── PATCH /api/reports/:id/status ─────────────────────────────────────────────
router.patch(
  '/:id/status',
  authenticate,
  requireRole('admin', 'volunteer'),
  validate([
    param('id').notEmpty(),
    body('status').isIn(['open', 'assigned', 'in_progress', 'completed', 'rejected']),
  ]),
  ctrl.updateReportStatus,
);

// ── DELETE /api/reports/:id ───────────────────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate([param('id').notEmpty()]),
  ctrl.deleteReport,
);

module.exports = router;
