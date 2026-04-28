/**
 * SLA (Service Level Agreement) Service
 *
 * Assigns resolution deadlines per category + urgency level.
 * Computes current SLA status: 'on_time' | 'at_risk' | 'breached'
 *
 * SLA deadlines (hours from submission):
 *   critical: 24h | high: 48h | medium: 96h | low: 168h (7 days)
 * Category multipliers reduce deadline for more critical infrastructure.
 */

// Base hours by urgency level
const SLA_HOURS = {
  critical: 24,
  high:     48,
  medium:   96,
  low:      168,
};

// Category-specific multiplier (<1 = tighter SLA)
const CATEGORY_MULTIPLIER = {
  health:        0.75,  // health issues get 25% tighter SLA
  water:         0.80,
  electricity:   0.85,
  roads:         1.00,
  sanitation:    0.90,
  infrastructure:1.00,
  food:          0.85,
  shelter:       0.90,
  air:           1.00,
};

/**
 * Calculate the SLA deadline for a complaint.
 * @param {string} urgencyLevel - critical | high | medium | low
 * @param {string} category
 * @param {Date}   createdAt
 * @returns {Date} deadline
 */
function computeDeadline(urgencyLevel, category, createdAt) {
  const baseHours  = SLA_HOURS[urgencyLevel] || SLA_HOURS.low;
  const multiplier = CATEGORY_MULTIPLIER[category] || 1;
  const deadlineMs = new Date(createdAt).getTime() + (baseHours * multiplier * 60 * 60 * 1000);
  return new Date(deadlineMs);
}

/**
 * Compute real-time SLA status for a complaint.
 * @param {Date}   deadline
 * @param {string} status - complaint status (completed complaints are exempt)
 * @returns {{ status: 'on_time'|'at_risk'|'breached', hoursRemaining: number }}
 */
function computeSlaStatus(deadline, complaintStatus) {
  if (complaintStatus === 'completed') {
    return { status: 'resolved', hoursRemaining: null };
  }

  const now  = Date.now();
  const dead = new Date(deadline).getTime();
  const hoursRemaining = parseFloat(((dead - now) / (1000 * 60 * 60)).toFixed(1));

  let status;
  if (hoursRemaining < 0) {
    status = 'breached';
  } else if (hoursRemaining < SLA_HOURS.critical) {
    status = 'at_risk';  // less than 24h remaining
  } else {
    status = 'on_time';
  }

  return { status, hoursRemaining };
}

module.exports = { computeDeadline, computeSlaStatus };
