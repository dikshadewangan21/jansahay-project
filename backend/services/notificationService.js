/**
 * Notification Dispatch Service
 *
 * Called after a new report is created.
 * 1. Uses volunteerMatcher to find relevant volunteers
 * 2. Maps volunteer → User account (by email)
 * 3. Creates in-app Notification documents
 * 4. Sends email via the existing emailService
 *
 * Import and call: notifyMatchedVolunteers(report)
 */

const Volunteer      = require('../models/Volunteer');
const User           = require('../models/User');
const Notification   = require('../models/Notification');
const { matchVolunteers } = require('./volunteerMatcher');
const emailService   = require('./emailService');
const logger         = require('../config/logger');

/**
 * Builds a clean notification title based on urgency level.
 */
function buildTitle(report) {
  const icons = { critical: '🚨', high: '⚠️', medium: '📋', low: 'ℹ️' };
  const icon  = icons[report.urgencyLevel] || '📋';
  return `${icon} New ${report.urgencyLevel?.toUpperCase()} report: ${report.title}`;
}

/**
 * Main entry point — call this after a new report is saved.
 *
 * @param {object} report  - Mongoose document or plain object from createReport
 */
async function notifyMatchedVolunteers(report) {
  try {
    // 1 — Fetch all available volunteers
    const volunteers = await Volunteer.find({ status: 'available' }).lean({ virtuals: true });
    if (!volunteers.length) return;

    // 2 — Run the existing matcher (top 5 volunteers for this report)
    const matched = matchVolunteers(
      {
        category: report.category,
        location: report.location,
        title:    report.title,
      },
      volunteers,
      5,
    );

    if (!matched.length) {
      logger.info('No volunteers matched for report', { reportId: report._id });
      return;
    }

    logger.info(`Matched ${matched.length} volunteers for report`, { reportId: report._id });

    const title   = buildTitle(report);
    const message =
      `A new civic report has been submitted in ${report.location?.area || 'your area'}. ` +
      `Category: ${report.category}. Urgency: ${report.urgencyScore}/100. ` +
      `Your skills are a match — please review and take action.`;

    // 3 — For each matched volunteer, find their User account and create notification
    await Promise.all(
      matched.map(async (volunteer) => {
        try {
          // Try to link volunteer → User via email
          let userDoc = null;
          if (volunteer.email) {
            userDoc = await User.findOne({ email: volunteer.email }).select('_id').lean();
          }

          // Create in-app notification (only if we have a user account)
          if (userDoc) {
            await Notification.create({
              recipient: userDoc._id,
              type:      'new_report_match',
              title,
              message,
              reportId:  report._id,
              meta: {
                category:      report.category,
                urgencyLevel:  report.urgencyLevel,
                urgencyScore:  report.urgencyScore,
                area:          report.location?.area,
                matchScore:    volunteer._matchScore,
                matchedSkills: volunteer._skillMatch,
              },
            });
          }

          // Send email notification (using improved emailService)
          if (volunteer.email) {
            await emailService.notifyVolunteerNewReport({
              email:         volunteer.email,
              volunteerName: volunteer.name,
              reportTitle:   report.title,
              reportId:      report._id.toString(),
              category:      report.category,
              urgencyLevel:  report.urgencyLevel,
              area:          report.location?.area || 'your area',
              matchScore:    volunteer._matchScore,
              matchedSkills: volunteer._skillMatch || [],
            });
          }
        } catch (innerErr) {
          // Never let one failed volunteer notification block others
          logger.error('Failed to notify volunteer', {
            volunteerId: volunteer.id,
            error: innerErr.message,
          });
        }
      }),
    );
  } catch (err) {
    logger.error('notifyMatchedVolunteers failed', { error: err.message });
  }
}

module.exports = { notifyMatchedVolunteers };
