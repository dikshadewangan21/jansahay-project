/**
 * Need Graph Service
 *
 * Clusters spatially and categorically related open reports into "need clusters"
 * to surface compound problems (e.g. flood → water + food + shelter).
 *
 * Production: runs as a Vertex AI graph embedding job.
 * Here: deterministic spatial clustering with Ward-level grouping.
 */

const { haversineKm } = require('./volunteerMatcher');

const CLUSTER_RADIUS_KM = 2.5;

/**
 * Group open reports into geographic + category clusters.
 *
 * @param {object[]} reports
 * @returns {object[]} clusters sorted by combined urgency (desc)
 */
function buildNeedGraph(reports) {
  const openReports = reports.filter((r) => r.status !== 'completed');

  const visited = new Set();
  const clusters = [];

  for (const anchor of openReports) {
    if (visited.has(anchor.id)) continue;

    const nearby = openReports.filter((r) => {
      if (r.id === anchor.id || visited.has(r.id)) return false;
      const dist = haversineKm(
        anchor.location.lat, anchor.location.lng,
        r.location.lat, r.location.lng,
      );
      return dist <= CLUSTER_RADIUS_KM;
    });

    const members = [anchor, ...nearby];
    members.forEach((r) => visited.add(r.id));

    const categories = [...new Set(members.map((r) => r.category))];
    const totalAffected = members.reduce((sum, r) => sum + (r.affectedCount || 0), 0);
    const avgUrgency = Math.round(members.reduce((sum, r) => sum + r.urgencyScore, 0) / members.length);
    const maxUrgency = Math.max(...members.map((r) => r.urgencyScore));

    const centroid = {
      lat: members.reduce((s, r) => s + r.location.lat, 0) / members.length,
      lng: members.reduce((s, r) => s + r.location.lng, 0) / members.length,
    };

    // Compound label
    let label = anchor.location.area;
    if (members.length > 1) {
      label = `${anchor.location.area} compound crisis (${categories.join(', ')})`;
    }

    clusters.push({
      id: `cluster-${clusters.length + 1}`,
      label,
      centroid,
      reportIds: members.map((r) => r.id),
      categories,
      reportCount: members.length,
      totalAffected,
      avgUrgency,
      maxUrgency,
      isCompound: members.length > 1,
      ward: anchor.location.ward,
    });
  }

  return clusters.sort((a, b) => b.maxUrgency - a.maxUrgency);
}

module.exports = { buildNeedGraph };
