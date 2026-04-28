/**
 * 🤖 Auto Volunteer Dispatch Engine
 * JanSahay — AI-powered volunteer matching & auto-assignment
 *
 * Matches volunteers based on: distance, availability, skill match, past performance
 * Then auto-assigns top 3 and creates a mock notification system.
 */

const CATEGORY_SKILL_MAP = {
  food:           ['food-distribution', 'logistics', 'driving', 'coordination'],
  water:          ['water-sanitation', 'plumbing', 'field-survey', 'medical'],
  health:         ['medical', 'first-aid', 'counseling', 'elderly-care', 'medicine-distribution', 'field-survey'],
  shelter:        ['shelter-setup', 'construction', 'heavy-lifting', 'logistics', 'driving'],
  infrastructure: ['construction', 'heavy-lifting', 'driving', 'coordination'],
  air:            ['field-survey', 'documentation', 'coordination'],
  electricity:    ['construction', 'field-survey', 'documentation', 'coordination'],
  roads:          ['construction', 'heavy-lifting', 'driving', 'coordination', 'field-survey'],
  sanitation:     ['water-sanitation', 'field-survey', 'documentation', 'coordination'],
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreVolunteer(volunteer, task) {
  if (volunteer.status !== 'available') return { score: 0, distanceKm: null, skillMatch: [] };

  const requiredSkills = CATEGORY_SKILL_MAP[task.category] || [];
  const skillMatch = volunteer.skills.filter((s) => requiredSkills.includes(s));

  if (skillMatch.length === 0 && requiredSkills.length > 0) return { score: 0, distanceKm: null, skillMatch: [] };

  const distanceKm = haversineKm(
    volunteer.location.lat, volunteer.location.lng,
    task.location.lat, task.location.lng,
  );

  // Weighted scoring:
  const geoScore    = Math.max(0, 40 - (distanceKm / 15) * 40);       // 40pts geo proximity
  const skillScore  = Math.min(35, (skillMatch.length / Math.max(requiredSkills.length, 1)) * 35); // 35pts skills
  const ratingScore = ((volunteer.rating - 1) / 4) * 15;               // 15pts rating
  const expScore    = Math.min(10, Math.log(volunteer.tasksCompleted + 1) * 2.5); // 10pts exp

  const score = Math.round(geoScore + skillScore + ratingScore + expScore);
  return { score, distanceKm: Math.round(distanceKm * 10) / 10, skillMatch };
}

function matchVolunteers(task, volunteers, limit = 5) {
  return volunteers
    .map((v) => {
      const { score, distanceKm, skillMatch } = scoreVolunteer(v, task);
      return { ...v, _matchScore: score, _distanceKm: distanceKm, _skillMatch: skillMatch };
    })
    .filter((v) => v._matchScore > 0)
    .sort((a, b) => b._matchScore - a._matchScore)
    .slice(0, limit);
}

/**
 * Auto-dispatch: select top 3 volunteers and simulate mission creation + notifications.
 * @param {object} task - task/mission object with category and location
 * @param {object[]} volunteers - all available volunteers
 * @returns {object} dispatch result with assigned volunteers and notifications
 */
function autoDispatch(task, volunteers) {
  const candidates = matchVolunteers(task, volunteers, 10);
  const assigned = candidates.slice(0, 3); // Top 3

  if (assigned.length === 0) {
    return {
      success: false,
      message: 'No available volunteers matched for this task.',
      assigned: [],
      notifications: [],
      missionId: null,
    };
  }

  // Generate mock notifications
  const missionTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
  const timeStr = missionTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = missionTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const notifications = assigned.map((v) => ({
    volunteerId: v.id,
    volunteerName: v.name,
    phone: v.phone,
    message: `🚨 JanSahay Mission Alert: You are assigned to "${task.title}" mission at ${task.location?.area || 'assigned area'} on ${dateStr} at ${timeStr}. Skills needed: ${v._skillMatch.join(', ')}. Reply YES to confirm. -JanSahay`,
    channel: 'SMS',
    status: 'queued',
    sentAt: new Date().toISOString(),
    matchScore: v._matchScore,
    distanceKm: v._distanceKm,
  }));

  const missionId = `MISSION-${Date.now().toString(36).toUpperCase()}`;

  return {
    success: true,
    message: `Auto-dispatched ${assigned.length} volunteers for "${task.title}"`,
    missionId,
    missionTime: missionTime.toISOString(),
    assigned: assigned.map((v) => ({
      id: v.id, name: v.name, phone: v.phone,
      matchScore: v._matchScore, distanceKm: v._distanceKm, matchedSkills: v._skillMatch,
    })),
    notifications,
    totalCandidates: candidates.length,
  };
}

module.exports = { matchVolunteers, autoDispatch, haversineKm };
