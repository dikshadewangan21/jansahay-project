/**
 * Reports Controller (upgraded)
 *
 * Changes from original:
 *  - createReport now calls notifyMatchedVolunteers() from notificationService
 *    after saving, so matched volunteers get in-app + email notifications.
 *  - Everything else is identical to the original.
 */

const Report = require('../models/Report');
const User   = require('../models/User');
const { computeUrgencyScore, urgencyLevel } = require('../services/urgencyScoring');
const { classify }           = require('../services/classifier');
const { computeDeadline, computeSlaStatus } = require('../services/slaService');
const { notifyComplaintSubmitted, notifyStatusUpdated } = require('../services/emailService');
const { notifyMatchedVolunteers } = require('../services/notificationService'); // NEW
const { AppError }           = require('../middleware/errorHandler');
const asyncHandler           = require('../middleware/asyncHandler');
const logger                 = require('../config/logger');

// ── GET /api/reports ──────────────────────────────────────────────────────────
const listReports = asyncHandler(async (req, res) => {
  const {
    category, status, source, minUrgency,
    sortBy = 'urgency',
    limit = 50, offset = 0,
  } = req.query;

  const filter = {};
  if (category)   filter.category    = category;
  if (status)     filter.status      = status;
  if (source)     filter.source      = source;
  if (minUrgency) filter.urgencyScore = { $gte: Number(minUrgency) };

  const sortMap = {
    urgency: { urgencyScore: -1, createdAt: -1 },
    votes:   { voteCount: -1, createdAt: -1 },
    newest:  { createdAt: -1 },
  };
  const sort = sortMap[sortBy] || sortMap.urgency;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort(sort)
      .skip(Number(offset))
      .limit(Number(limit))
      .lean({ virtuals: true }),
    Report.countDocuments(filter),
  ]);

  const enriched = reports.map((r) => {
    const norm = normalise(r);
    if (norm.slaDeadline && norm.status !== 'completed') {
      norm.slaNow = computeSlaStatus(norm.slaDeadline, norm.status);
    }
    return norm;
  });

  res.json({ data: enriched, meta: { total, limit: Number(limit), offset: Number(offset) } });
});

// ── GET /api/reports/heatmap ──────────────────────────────────────────────────
const getHeatmapData = asyncHandler(async (req, res) => {
  const reports = await Report.find({ status: { $ne: 'completed' } })
    .select('location urgencyScore category title voteCount slaStatus')
    .lean({ virtuals: true });

  const points = reports.map((r) => ({
    lat: r.location.lat, lng: r.location.lng,
    weight: r.urgencyScore / 100,
    category: r.category, id: r._id.toString(),
    title: r.title, urgencyScore: r.urgencyScore,
    voteCount: r.voteCount || 0, slaStatus: r.slaStatus, area: r.location.area,
  }));

  res.json({ points, count: points.length });
});

// ── GET /api/reports/:id ──────────────────────────────────────────────────────
const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id).lean({ virtuals: true });
  if (!report) throw new AppError(`Report ${req.params.id} not found`, 404);
  const norm = normalise(report);
  if (norm.slaDeadline) norm.slaNow = computeSlaStatus(norm.slaDeadline, norm.status);
  norm.hasVoted = false;
  res.json(norm);
});

// ── POST /api/reports ─────────────────────────────────────────────────────────
const createReport = asyncHandler(async (req, res) => {
  const {
    source, category, title, description,
    location, reportedBy, affectedCount,
    tags, submitterEmail,
  } = req.body;

  const { category: aiCat, confidence: aiConf } = classify(`${title} ${description}`);
  const { score, breakdown } = computeUrgencyScore({
    category, source, affectedCount: affectedCount || 0, description, tags: tags || [],
  });
  const level       = urgencyLevel(score);
  const slaDeadline = computeDeadline(level, category, new Date());

  const report = await Report.create({
    source, category,
    aiCategory:   aiCat !== category ? aiCat : null,
    aiConfidence: aiConf,
    title:          title.trim(),
    description:    description.trim(),
    location: {
      lat:  location.lat,
      lng:  location.lng,
      ward: location.ward || 'Unknown Ward',
      area: location.area || 'Unknown Area',
    },
    reportedBy:      reportedBy?.trim() || 'Anonymous',
    submitterEmail:  submitterEmail || null,
    submittedByUser: req.user?._id || null,
    urgencyScore:    score,
    urgencyLevel:    level,
    urgencyBreakdown: breakdown,
    status:          'open',
    tags:            tags || [],
    affectedCount:   affectedCount || 0,
    slaDeadline,
    slaStatus:       'on_time',
    voteCount:       0,
    votes:           [],
  });

  logger.info('New report ingested', { id: report._id, category, source, urgencyScore: score });

  // Fire-and-forget: notify submitter via email
  notifyComplaintSubmitted({
    email: submitterEmail, name: reportedBy || 'Community Member',
    title: report.title, reportId: report._id.toString(), category: report.category,
  });

  // Fire-and-forget: match volunteers and send in-app + email notifications
  notifyMatchedVolunteers(report); // NEW

  res.status(201).json(normalise(report.toJSON()));
});

// ── PATCH /api/reports/:id/status ─────────────────────────────────────────────
const updateReportStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['open', 'assigned', 'in_progress', 'completed', 'rejected'];
  if (!allowed.includes(status)) throw new AppError(`Invalid status: ${allowed.join(', ')}`, 400);

  const existing = await Report.findById(req.params.id);
  if (!existing) throw new AppError(`Report ${req.params.id} not found`, 404);

  const oldStatus = existing.status;
  const updates   = { status };
  if (status === 'completed') { updates.resolvedAt = new Date(); updates.slaStatus = 'resolved'; }

  const report = await Report.findByIdAndUpdate(req.params.id, updates, {
    new: true, runValidators: true,
  }).lean({ virtuals: true });

  notifyStatusUpdated({
    email: report.submitterEmail, name: report.reportedBy,
    title: report.title, reportId: report._id.toString(), oldStatus, newStatus: status,
  });

  res.json(normalise(report));
});

// ── POST /api/reports/:id/vote ─────────────────────────────────────────────────
const voteReport = asyncHandler(async (req, res) => {
  const userId   = req.user._id;
  const reportId = req.params.id;
  const report   = await Report.findById(reportId);
  if (!report) throw new AppError('Report not found', 404);

  const alreadyVoted = report.votes.some((v) => v.toString() === userId.toString());
  let updatedReport;

  if (alreadyVoted) {
    updatedReport = await Report.findByIdAndUpdate(
      reportId, { $pull: { votes: userId }, $inc: { voteCount: -1 } }, { new: true },
    );
    await User.findByIdAndUpdate(userId, { $pull: { votedReports: reportId } });
  } else {
    updatedReport = await Report.findByIdAndUpdate(
      reportId, { $addToSet: { votes: userId }, $inc: { voteCount: 1 } }, { new: true },
    );
    await User.findByIdAndUpdate(userId, { $addToSet: { votedReports: reportId } });
  }

  res.json({ voteCount: updatedReport.voteCount, hasVoted: !alreadyVoted, reportId });
});

// ── POST /api/reports/:id/feedback ────────────────────────────────────────────
const submitFeedback = asyncHandler(async (req, res) => {
  const { impactRating, impactFeedback } = req.body;
  if (!impactRating || impactRating < 1 || impactRating > 5)
    throw new AppError('Rating must be 1–5', 400);

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    {
      impactRating, impactFeedback: impactFeedback?.trim() || null,
      markedResolvedBy: req.user._id, status: 'completed',
      resolvedAt: new Date(), slaStatus: 'resolved',
    },
    { new: true, runValidators: true },
  ).lean({ virtuals: true });

  if (!report) throw new AppError('Report not found', 404);
  res.json(normalise(report));
});

// ── POST /api/reports/:id/classify ────────────────────────────────────────────
const classifyReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new AppError('Report not found', 404);
  const { category: aiCat, confidence, scores } = classify(`${report.title} ${report.description}`);
  await Report.findByIdAndUpdate(req.params.id, { aiCategory: aiCat, aiConfidence: confidence });
  res.json({ aiCategory: aiCat, confidence, scores, reportId: req.params.id });
});

// ── DELETE /api/reports/:id ───────────────────────────────────────────────────
const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndDelete(req.params.id);
  if (!report) throw new AppError(`Report ${req.params.id} not found`, 404);
  logger.info('Report deleted', { id: req.params.id });
  res.json({ message: 'Report deleted successfully', id: req.params.id });
});

// ── GET /api/reports/analytics/summary ────────────────────────────────────────
const getAnalytics = asyncHandler(async (req, res) => {
  const [byCategory, byStatus, bySla, topVoted] = await Promise.all([
    Report.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, avgScore: { $avg: '$urgencyScore' } } },
      { $sort: { count: -1 } },
    ]),
    Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Report.aggregate([{ $group: { _id: '$slaStatus', count: { $sum: 1 } } }]),
    Report.find({ status: { $ne: 'completed' } })
      .sort({ voteCount: -1 }).limit(5)
      .select('title category voteCount urgencyScore location'),
  ]);

  const resolutionData = await Report.aggregate([
    { $match: { status: 'completed', resolvedAt: { $ne: null } } },
    { $project: { category: 1, hoursToResolve: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] } } },
    { $group: { _id: '$category', avgHours: { $avg: '$hoursToResolve' }, count: { $sum: 1 } } },
    { $sort: { avgHours: 1 } },
  ]);

  res.json({ byCategory, byStatus, bySla, topVoted, resolutionData });
});

// ── helper ────────────────────────────────────────────────────────────────────
function normalise(r) {
  const out = { ...r };
  if (!out.id && out._id) out.id = out._id.toString();
  delete out._id; delete out.__v;
  if (!out.urgencyLevel) out.urgencyLevel = urgencyLevel(out.urgencyScore);
  return out;
}

module.exports = {
  listReports, getReport, createReport, updateReportStatus,
  getHeatmapData, deleteReport, voteReport, submitFeedback,
  classifyReport, getAnalytics,
};
