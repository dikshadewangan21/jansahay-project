/**
 * Email Notification Service (upgraded)
 *
 * Uses Nodemailer with SMTP transport.
 * Configure via SMTP_* environment variables.
 * Gracefully skips sending if no SMTP config is provided (dev mode).
 *
 * Supported triggers:
 *   - notifyComplaintSubmitted    : notify submitter on report creation
 *   - notifyStatusUpdated         : notify submitter when complaint status changes
 *   - notifyVolunteerAssigned     : notify volunteer when assigned to a task
 *   - notifyVolunteerNewReport    : NEW — notify matched volunteer of a new report
 */

const nodemailer = require('nodemailer');
const logger     = require('../config/logger');

// Build transporter once (null if SMTP not configured)
function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER) {
    logger.warn('Email service: SMTP not configured — notifications will be skipped.');
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: SMTP_PORT === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const transporter  = createTransporter();
const FROM_ADDRESS = process.env.SMTP_FROM || 'JanSahay <noreply@jansahay.in>';

// Base email wrapper — silent failure, never throws
async function send(to, subject, html) {
  if (!transporter || !to) return;
  try {
    await transporter.sendMail({ from: FROM_ADDRESS, to, subject, html });
    logger.info('Email sent', { to, subject });
  } catch (err) {
    logger.error('Email send failed', { to, subject, error: err.message });
  }
}

// Shared HTML email shell
function emailShell(body) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0d1117;color:#e6edf3;padding:24px;border-radius:12px;">
      <div style="margin-bottom:20px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:24px;">🤝</span>
        <span style="font-size:18px;font-weight:700;color:#00b4d8;">JanSahay</span>
        <span style="font-size:11px;color:#8b949e;margin-left:4px;">Civic Intelligence Platform</span>
      </div>
      ${body}
      <p style="margin-top:24px;font-size:11px;color:#8b949e;border-top:1px solid #30363d;padding-top:12px;">
        JanSahay — Community Action System, Raipur, Chhattisgarh
      </p>
    </div>
  `;
}

// Urgency colour helper
function urgencyColour(level) {
  return { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' }[level] || '#00b4d8';
}

// ── Templates ─────────────────────────────────────────────────────────────────

/** Confirmation when a complaint is submitted */
async function notifyComplaintSubmitted({ email, name, title, reportId, category }) {
  if (!email) return;
  const subject = `[JanSahay] Report received — ${title}`;
  const html = emailShell(`
    <p>Hi <strong>${name || 'Community Member'}</strong>,</p>
    <p>Your report has been received and is now under review.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <tr><td style="padding:8px 12px;background:#161b22;border-radius:4px 0 0 4px;color:#8b949e;">Title</td>
          <td style="padding:8px 12px;background:#161b22;">${title}</td></tr>
      <tr><td style="padding:8px 12px;color:#8b949e;">Category</td>
          <td style="padding:8px 12px;text-transform:capitalize;">${category}</td></tr>
      <tr><td style="padding:8px 12px;background:#161b22;color:#8b949e;">Reference&nbsp;ID</td>
          <td style="padding:8px 12px;background:#161b22;font-family:monospace;color:#00b4d8;">${reportId}</td></tr>
    </table>
    <p style="font-size:13px;color:#8b949e;">We will notify you when the status changes.</p>
  `);
  await send(email, subject, html);
}

/** Status change notification to submitter */
async function notifyStatusUpdated({ email, name, title, reportId, oldStatus, newStatus }) {
  if (!email) return;
  const colour  = newStatus === 'completed' ? '#22c55e' : '#f59e0b';
  const subject = `[JanSahay] Status updated: ${newStatus.toUpperCase()}`;
  const html = emailShell(`
    <p>Hi <strong>${name || 'Community Member'}</strong>,</p>
    <p>Your report <strong>"${title}"</strong> status has been updated:</p>
    <p style="margin:16px 0;font-size:16px;">
      <span style="text-decoration:line-through;color:#8b949e;">${oldStatus}</span>
      &nbsp;→&nbsp;
      <strong style="color:${colour};">${newStatus}</strong>
    </p>
    <p style="font-size:12px;color:#8b949e;">Reference: ${reportId}</p>
  `);
  await send(email, subject, html);
}

/** Notify volunteer when assigned to a task */
async function notifyVolunteerAssigned({ email, volunteerName, taskTitle, taskId, location }) {
  if (!email) return;
  const subject = `[JanSahay] Task assigned: ${taskTitle}`;
  const html = emailShell(`
    <p>Hi <strong>${volunteerName}</strong>,</p>
    <p>You have been assigned a new task:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <tr><td style="padding:8px 12px;background:#161b22;color:#8b949e;">Task</td>
          <td style="padding:8px 12px;background:#161b22;">${taskTitle}</td></tr>
      <tr><td style="padding:8px 12px;color:#8b949e;">Location</td>
          <td style="padding:8px 12px;">${location?.area || 'See platform'}</td></tr>
      <tr><td style="padding:8px 12px;background:#161b22;color:#8b949e;">Task ID</td>
          <td style="padding:8px 12px;background:#161b22;font-family:monospace;color:#00b4d8;">${taskId}</td></tr>
    </table>
    <p style="font-size:13px;">Please log in to view full details and accept the task.</p>
  `);
  await send(email, subject, html);
}

/**
 * NEW — Notify a matched volunteer when a new report is created.
 * Called by notificationService.js after volunteerMatcher runs.
 */
async function notifyVolunteerNewReport({
  email, volunteerName, reportTitle, reportId,
  category, urgencyLevel, area, matchScore, matchedSkills,
}) {
  if (!email) return;

  const colour  = urgencyColour(urgencyLevel);
  const subject = `[JanSahay] New ${urgencyLevel?.toUpperCase()} report matches your skills`;
  const skillList = matchedSkills?.length
    ? matchedSkills.map((s) => `<span style="background:#00b4d820;color:#00b4d8;padding:2px 8px;border-radius:12px;font-size:11px;margin-right:4px;">${s}</span>`).join('')
    : '<span style="color:#8b949e;font-size:12px;">General</span>';

  const html = emailShell(`
    <p>Hi <strong>${volunteerName}</strong>,</p>
    <p>A new report matching your skills has been submitted near <strong>${area}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <tr><td style="padding:8px 12px;background:#161b22;color:#8b949e;">Title</td>
          <td style="padding:8px 12px;background:#161b22;">${reportTitle}</td></tr>
      <tr><td style="padding:8px 12px;color:#8b949e;">Category</td>
          <td style="padding:8px 12px;text-transform:capitalize;">${category}</td></tr>
      <tr><td style="padding:8px 12px;background:#161b22;color:#8b949e;">Urgency</td>
          <td style="padding:8px 12px;background:#161b22;"><strong style="color:${colour};">${urgencyLevel?.toUpperCase()}</strong></td></tr>
      <tr><td style="padding:8px 12px;color:#8b949e;">Match Score</td>
          <td style="padding:8px 12px;"><strong style="color:#00b4d8;">${matchScore}/100</strong></td></tr>
      <tr><td style="padding:8px 12px;background:#161b22;color:#8b949e;">Your Skills</td>
          <td style="padding:8px 12px;background:#161b22;">${skillList}</td></tr>
      <tr><td style="padding:8px 12px;color:#8b949e;">Report ID</td>
          <td style="padding:8px 12px;font-family:monospace;color:#00b4d8;">${reportId}</td></tr>
    </table>
    <p style="font-size:13px;">Log in to JanSahay to view the full report and coordinate a response.</p>
  `);

  await send(email, subject, html);
}

module.exports = {
  notifyComplaintSubmitted,
  notifyStatusUpdated,
  notifyVolunteerAssigned,
  notifyVolunteerNewReport,
};
