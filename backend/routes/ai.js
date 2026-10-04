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
// Auto-dispatch volunteers for a task and persist to database
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

  if (result.success && result.assigned.length > 0) {
    const primaryVol = result.assigned[0];
    const now = new Date();

    // 1. Update task with assigned volunteer and in-progress status
    await Task.findByIdAndUpdate(task._id, {
      assignedVolunteerId: primaryVol.id,
      status: 'in-progress',
      updatedAt: now,
    });

    // 2. Mark assigned volunteers as on-task
    const assignedIds = result.assigned.map((v) => v.id);
    await Volunteer.updateMany(
      { _id: { $in: assignedIds } },
      { status: 'on-task' }
    );

    // 3. Mark linked report as assigned
    if (task.reportId) {
      await Report.updateOne(
        { _id: task.reportId, status: 'open' },
        { status: 'assigned', updatedAt: now }
      );
    }

    // 4. Create in-app notifications for assigned volunteers
    const User = require('../models/User');
    const Notification = require('../models/Notification');

    await Promise.all(
      result.assigned.map(async (v) => {
        try {
          const userDoc = await User.findOne({
            $or: [{ email: v.email }, { phone: v.phone }],
          }).select('_id').lean();

          if (userDoc) {
            await Notification.create({
              recipient: userDoc._id,
              type: 'task_assigned',
              title: `🚨 Mission Dispatch: ${task.title}`,
              message: `You have been assigned to mission "${task.title}" at ${task.location?.area || 'Raipur'}. Skills matched: ${(v.matchedSkills || []).join(', ')}.`,
              taskId: task._id,
              reportId: task.reportId || null,
              meta: {
                matchScore: v.matchScore,
                distanceKm: v.distanceKm,
                category: task.category,
              },
            });
          }
        } catch (notifErr) {
          // ignore notification creation error so dispatch succeeds
        }
      })
    );
  }

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
