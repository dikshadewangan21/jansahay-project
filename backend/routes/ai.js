const express = require('express');
const router  = express.Router();
const Report    = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const Task      = require('../models/Task');
const { recommendActions }  = require('../services/actionRecommender');
const { autoDispatch }      = require('../services/volunteerMatcher');
const { predictCrises, getCrisisSummary } = require('../services/crisisPredictor');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');

// ── GET /api/ai/recommend/:reportId ───────────────────────────────────────────
// Get AI action recommendations for a specific report
router.get('/recommend/:reportId', optionalAuth, asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.reportId).lean();
  if (!report) return res.status(404).json({ error: 'Report not found' });

  const recommendation = recommendActions(report);
  res.json(recommendation);
}));

// ── POST /api/ai/recommend ─────────────────────────────────────────────────────
// Get AI action recommendations inline (for new reports before saving)
router.post('/recommend', asyncHandler(async (req, res) => {
  const { category, urgencyScore, location, affectedCount, tags } = req.body;
  if (!category || urgencyScore === undefined) {
    return res.status(400).json({ error: 'category and urgencyScore required' });
  }

  const recommendation = recommendActions({ category, urgencyScore, location, affectedCount, tags });
  res.json(recommendation);
}));

// ── POST /api/ai/dispatch/:taskId ─────────────────────────────────────────────
// Auto-dispatch volunteers for a task
router.post('/dispatch/:taskId', authenticate, asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.taskId).lean();
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const volunteers = await Volunteer.find({ status: 'available' }).lean();
  
  // Normalize volunteers
  const normalizedVols = volunteers.map((v) => ({
    ...v,
    id: v._id.toString(),
  }));

  const result = autoDispatch(task, normalizedVols);
  res.json(result);
}));

// ── GET /api/ai/crisis-predictions ────────────────────────────────────────────
// Get predictive crisis map data
router.get('/crisis-predictions', asyncHandler(async (req, res) => {
  const reports = await Report.find({}).lean();
  const predictions = predictCrises(reports);
  const summary = getCrisisSummary(predictions);

  res.json({
    predictions,
    summary,
    generatedAt: new Date().toISOString(),
  });
}));

module.exports = router;
