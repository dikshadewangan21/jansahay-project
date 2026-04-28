const Report    = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const Task      = require('../models/Task');
const { buildNeedGraph }    = require('../services/needGraph');
const { generateForecast }  = require('../services/trendForecaster');
const asyncHandler          = require('../middleware/asyncHandler');

const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    openReports, criticalReports, openTasks, inProgressTasks, completedTasks,
    availableVols, totalVols, affectedAgg, categoryAgg, sourceAgg, recentTasks,
  ] = await Promise.all([
    Report.countDocuments({ status: 'open' }),
    Report.countDocuments({ status: { $ne: 'completed' }, urgencyScore: { $gte: 90 } }),
    Task.countDocuments({ status: 'open' }),
    Task.countDocuments({ status: 'in-progress' }),
    Task.countDocuments({ status: 'completed' }),
    Volunteer.countDocuments({ status: 'available' }),
    Volunteer.countDocuments({}),
    Report.aggregate([
      { $match: { status: { $ne: 'completed' } } },
      { $group: { _id: null, total: { $sum: '$affectedCount' } } },
    ]),
    Report.aggregate([
      { $match: { status: { $ne: 'completed' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    Report.aggregate([{ $group: { _id: '$source', count: { $sum: 1 } } }]),
    Task.find({}).sort({ updatedAt: -1 }).limit(5)
      .select('title status category updatedAt').lean({ virtuals: true }),
  ]);

  const categoryBreakdown = {};
  categoryAgg.forEach(({ _id, count }) => { categoryBreakdown[_id] = count; });

  const sourceBreakdown = {};
  sourceAgg.forEach(({ _id, count }) => { sourceBreakdown[_id] = count; });

  const recentActivity = recentTasks.map((t) => ({
    taskId: t._id.toString(), title: t.title, status: t.status,
    updatedAt: t.updatedAt, category: t.category,
  }));

  res.json({
    summary: {
      openReports, criticalReports, openTasks, inProgressTasks, completedTasks,
      availableVolunteers: availableVols, totalVolunteers: totalVols,
      totalAffectedPeople: affectedAgg[0]?.total ?? 0,
    },
    categoryBreakdown,
    sourceBreakdown,
    recentActivity,
    computedAt: new Date().toISOString(),
  });
});

const getNeedGraph = asyncHandler(async (req, res) => {
  const reports = await Report.find({ status: { $ne: 'completed' } }).lean({ virtuals: true });
  const plain = reports.map((r) => ({ ...r, id: r._id.toString() }));
  const clusters = buildNeedGraph(plain);
  res.json({ clusters, count: clusters.length });
});

const getForecast = asyncHandler(async (req, res) => {
  const reports = await Report.find({}).lean();
  const forecast = generateForecast(reports);
  res.json(forecast);
});

module.exports = { getDashboardStats, getNeedGraph, getForecast };
