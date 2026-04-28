const Task      = require('../models/Task');
const Report    = require('../models/Report');
const SdgImpact = require('../models/SdgImpact');
const { computeLiveSdgScores } = require('../services/sdgScorer');
const asyncHandler = require('../middleware/asyncHandler');

const getSdgScores = asyncHandler(async (req, res) => {
  const [tasks, reports, sdgBaselines] = await Promise.all([
    Task.find({}).lean(), Report.find({}).lean(), SdgImpact.find({}).lean(),
  ]);

  const seedImpact = {};
  sdgBaselines.forEach((s) => {
    seedImpact[`sdg-${s.goal}`] = {
      goal: s.goal, label: s.label, score: s.score, trend: s.trend,
      tasksLinked: s.tasksLinked, peopleReached: s.peopleReached,
    };
  });

  const scores = computeLiveSdgScores(tasks, reports, seedImpact);
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const totalPeopleReached = scores.reduce((s, g) => s + (g.peopleReached || 0), 0);
  const avgScore = scores.length ? Math.round(scores.reduce((s, g) => s + g.score, 0) / scores.length) : 0;

  res.json({
    goals: scores,
    summary: { totalPeopleReached, avgScore, totalGoalsTracked: scores.length, topGoal: sorted[0]?.label || null },
    computedAt: new Date().toISOString(),
  });
});

module.exports = { getSdgScores };
