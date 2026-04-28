/**
 * 🔮 Predictive Crisis Map Engine
 * JanSahay — AI-powered future crisis prediction
 *
 * Uses past reports + trends to predict upcoming issues with confidence scores.
 * Each ward gets a risk status: stable (green), risk (orange), crisis (red).
 */

// Historical crisis patterns by category & season (Chhattisgarh / central India context)
const SEASONAL_RISK = {
  // Month (0-indexed) → risk multipliers per category
  // Monsoon (June-Sep): water, sanitation, infrastructure, health risks spike
  // Summer (Mar-May): water, air risks spike
  // Winter (Nov-Feb): health, food risks spike
  water: [0.8, 0.8, 1.2, 1.4, 1.5, 1.8, 2.0, 2.0, 1.6, 0.9, 0.7, 0.7],
  sanitation: [0.8, 0.8, 0.9, 1.0, 1.2, 1.8, 2.2, 2.2, 1.8, 1.0, 0.8, 0.8],
  health: [0.9, 0.9, 0.9, 1.0, 1.1, 1.3, 1.8, 1.8, 1.5, 1.0, 1.2, 1.3],
  infrastructure: [0.9, 0.9, 1.0, 1.0, 1.0, 1.4, 1.8, 1.8, 1.5, 0.9, 0.8, 0.8],
  roads: [0.9, 0.9, 1.0, 1.0, 1.0, 1.3, 1.7, 1.7, 1.4, 0.9, 0.8, 0.8],
  food: [1.0, 1.0, 1.0, 0.9, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 1.2],
  electricity: [1.0, 1.0, 1.2, 1.4, 1.6, 1.4, 1.2, 1.2, 1.0, 0.9, 0.9, 1.0],
  shelter: [0.9, 0.9, 1.0, 1.0, 1.1, 1.5, 2.0, 2.0, 1.6, 1.0, 0.9, 0.9],
  air: [1.0, 1.0, 1.2, 1.4, 1.5, 1.0, 0.9, 0.9, 0.9, 1.0, 1.2, 1.3],
};

// Days to look back for trend analysis
const TREND_WINDOW_DAYS = 30;

// Crisis threshold scores
const CRISIS_THRESHOLD = 70;
const RISK_THRESHOLD   = 40;

/**
 * Analyze historical reports to predict future crises by ward.
 * @param {object[]} reports - all historical reports from DB
 * @returns {object[]} ward predictions
 */
function predictCrises(reports) {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const cutoff = new Date(now.getTime() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Group reports by ward
  const wardMap = {};
  for (const r of reports) {
    const ward = r.location?.ward || 'Unknown Ward';
    const area = r.location?.area || 'Unknown';
    if (!wardMap[ward]) {
      wardMap[ward] = {
        ward, area,
        lat: r.location?.lat || 21.25,
        lng: r.location?.lng || 81.63,
        reports: [],
        recentReports: [],
        categoryCount: {},
        recentCategoryCount: {},
      };
    }

    wardMap[ward].reports.push(r);

    const createdAt = new Date(r.createdAt);
    if (createdAt >= cutoff) {
      wardMap[ward].recentReports.push(r);
      wardMap[ward].recentCategoryCount[r.category] = (wardMap[ward].recentCategoryCount[r.category] || 0) + 1;
    }

    wardMap[ward].categoryCount[r.category] = (wardMap[ward].categoryCount[r.category] || 0) + 1;
  }

  const predictions = [];

  for (const [ward, data] of Object.entries(wardMap)) {
    const totalReports = data.reports.length;
    const recentCount  = data.recentReports.length;

    if (totalReports === 0) continue;

    // Find the most concerning category
    const categories = Object.entries(data.recentCategoryCount)
      .sort(([, a], [, b]) => b - a);

    const topCategory = categories[0]?.[0] || 'infrastructure';
    const topCategoryCount = categories[0]?.[1] || 0;

    // Trend ratio: recent vs historical average
    const historicalAvgPerMonth = (totalReports / 3); // assume 3 months of data
    const trendRatio = recentCount / Math.max(historicalAvgPerMonth / TREND_WINDOW_DAYS * 30, 1);

    // Base risk score from recent activity
    let riskScore = Math.min(100, Math.round(
      (recentCount * 12) +           // raw recent reports weighted heavily
      (trendRatio > 1.5 ? 20 : 0) +  // trend spike bonus
      (trendRatio > 2.0 ? 15 : 0)    // severe spike bonus
    ));

    // Apply seasonal multiplier for top category
    const seasonalMult = SEASONAL_RISK[topCategory]?.[month] ?? 1.0;
    riskScore = Math.min(100, Math.round(riskScore * seasonalMult));

    // Determine status
    let status, statusColor, daysToEvent;
    if (riskScore >= CRISIS_THRESHOLD) {
      status = 'FUTURE_CRISIS';
      statusColor = 'red';
      daysToEvent = Math.max(1, Math.round(10 - (riskScore - CRISIS_THRESHOLD) / 5));
    } else if (riskScore >= RISK_THRESHOLD) {
      status = 'AT_RISK';
      statusColor = 'orange';
      daysToEvent = Math.round(15 + (CRISIS_THRESHOLD - riskScore));
    } else {
      status = 'STABLE';
      statusColor = 'green';
      daysToEvent = null;
    }

    // Confidence: based on data richness
    const confidence = Math.min(95, Math.max(50,
      60 + Math.min(25, totalReports * 2) + (recentCount > 3 ? 10 : 0)
    ));

    // Human-readable prediction message
    let predictionText;
    if (status === 'FUTURE_CRISIS') {
      predictionText = `${ward} → ${topCategory.charAt(0).toUpperCase() + topCategory.slice(1)} crisis likely in ${daysToEvent} day${daysToEvent !== 1 ? 's' : ''} (${confidence}% confidence)`;
    } else if (status === 'AT_RISK') {
      predictionText = `${ward} → Elevated ${topCategory} risk, monitor closely`;
    } else {
      predictionText = `${ward} → Stable, routine monitoring`;
    }

    predictions.push({
      ward,
      area: data.area,
      lat: data.lat,
      lng: data.lng,
      riskScore,
      status,
      statusColor,
      topCategory,
      topCategoryCount,
      totalReports,
      recentReports: recentCount,
      trendRatio: Math.round(trendRatio * 10) / 10,
      daysToEvent,
      confidence,
      predictionText,
      seasonalMultiplier: seasonalMult,
      categories: categories.slice(0, 3).map(([cat, count]) => ({ category: cat, count })),
    });
  }

  // Sort by risk score descending
  return predictions.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Generate a summary of crisis predictions for the dashboard.
 */
function getCrisisSummary(predictions) {
  const crisisCount = predictions.filter((p) => p.status === 'FUTURE_CRISIS').length;
  const riskCount   = predictions.filter((p) => p.status === 'AT_RISK').length;
  const stableCount = predictions.filter((p) => p.status === 'STABLE').length;

  const topCrisis = predictions.find((p) => p.status === 'FUTURE_CRISIS');
  const mostCommonCategory = predictions
    .reduce((acc, p) => {
      acc[p.topCategory] = (acc[p.topCategory] || 0) + 1;
      return acc;
    }, {});
  const topCategoryTrend = Object.entries(mostCommonCategory).sort(([, a], [, b]) => b - a)[0]?.[0];

  return {
    totalWards: predictions.length,
    crisisCount,
    riskCount,
    stableCount,
    highestRiskWard: topCrisis?.ward || null,
    highestRiskScore: topCrisis?.riskScore || 0,
    topCategoryTrend,
    alertMessage: crisisCount > 0
      ? `⚠️ ${crisisCount} ward${crisisCount > 1 ? 's' : ''} predicted to face crisis within 10 days`
      : riskCount > 0
      ? `📊 ${riskCount} ward${riskCount > 1 ? 's' : ''} at elevated risk — proactive action recommended`
      : '✅ All wards currently stable',
  };
}

module.exports = { predictCrises, getCrisisSummary };
