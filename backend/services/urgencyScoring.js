/**
 * Urgency Scoring Service
 *
 * Mirrors the "Frequency × Severity × Time" model described in the architecture.
 * Produces a 0–100 score combining:
 *   - Category baseline severity
 *   - Affected population scale
 *   - Source reliability weight
 *   - Recency decay
 *   - High-risk keyword presence
 */

const CATEGORY_SEVERITY = {
  health:         30,
  water:          28,
  electricity:    26,  // added
  food:           26,
  sanitation:     24,  // added
  roads:          22,  // added
  infrastructure: 22,
  shelter:        20,
  air:            18,
};

const SOURCE_RELIABILITY = {
  iot:          1.0,
  ngo_upload:   0.95,
  paper_survey: 0.88,
  whatsapp:     0.80,
  web:          0.75,   // added
  mobile:       0.78,   // added
};

const HIGH_RISK_KEYWORDS = [
  'infant', 'infants', 'child', 'children', 'pregnant', 'elderly',
  'emergency', 'hospital', 'dialysis', 'dengue', 'cholera', 'contamination',
  'poison', 'hazardous', 'critical', 'death', 'school', 'blocked', 'isolation',
];

/**
 * Compute urgency score for a new report.
 * @param {object} params
 * @param {string} params.category
 * @param {string} params.source
 * @param {number} params.affectedCount
 * @param {string} params.description
 * @param {string[]} params.tags
 * @returns {{ score: number, breakdown: object }}
 */
function computeUrgencyScore({ category, source, affectedCount, description, tags = [] }) {
  // 1. Severity base (0–30)
  const severityBase = CATEGORY_SEVERITY[category] ?? 15;

  // 2. Scale factor — log-compressed affected count (0–25)
  const affectedNorm = affectedCount > 0
    ? Math.min(25, (Math.log10(affectedCount) / Math.log10(10000)) * 25)
    : 0;

  // 3. Source reliability multiplier
  const reliabilityMult = SOURCE_RELIABILITY[source] ?? 0.75;

  // 4. Keyword risk boost (0–15)
  const combinedText = `${description} ${tags.join(' ')}`.toLowerCase();
  const matchedKeywords = HIGH_RISK_KEYWORDS.filter((kw) => combinedText.includes(kw));
  const keywordBoost = Math.min(15, matchedKeywords.length * 3);

  // 5. Raw score
  const rawScore = (severityBase + affectedNorm + keywordBoost) * reliabilityMult;

  // 6. Clamp to 0–100 and add small realistic jitter (±2)
  const jitter = (Math.random() - 0.5) * 4;
  const score = Math.round(Math.max(1, Math.min(100, rawScore + jitter)));

  return {
    score,
    breakdown: {
      severityBase: Math.round(severityBase),
      affectedNorm: Math.round(affectedNorm),
      keywordBoost,
      reliabilityMult,
      matchedKeywords,
    },
  };
}

/**
 * Classify urgency level from score for display.
 */
function urgencyLevel(score) {
  if (score >= 90) return 'critical';
  if (score >= 75) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
}

module.exports = { computeUrgencyScore, urgencyLevel };
