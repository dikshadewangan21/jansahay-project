/**
 * 🧠 AI Action Recommendation Engine
 * JanSahay — core AI feature for hackathon demo
 *
 * Given a problem report, produces specific real-world action recommendations
 * with priority ordering, estimated resolution time, and resource requirements.
 */

const ACTIONS = {
  water: {
    critical: [
      { action: 'Deploy 3 water sanitation volunteers immediately', priority: 1, timeHours: 2 },
      { action: 'Request emergency municipal water tanker supply', priority: 2, timeHours: 4 },
      { action: 'Coordinate with partner NGO WaterAid India', priority: 3, timeHours: 6 },
      { action: 'Issue public health advisory for affected ward', priority: 4, timeHours: 8 },
      { action: 'Set up temporary water distribution point', priority: 5, timeHours: 12 },
    ],
    high: [
      { action: 'Assign 2 field survey volunteers to assess pipe damage', priority: 1, timeHours: 4 },
      { action: 'Notify PHED (Public Health Engineering Dept)', priority: 2, timeHours: 6 },
      { action: 'Arrange bottled water for elderly/children in ward', priority: 3, timeHours: 8 },
    ],
    medium: [
      { action: 'Log complaint with municipal water board', priority: 1, timeHours: 24 },
      { action: 'Schedule inspection within 48 hours', priority: 2, timeHours: 48 },
    ],
    low: [
      { action: 'Add to weekly maintenance schedule', priority: 1, timeHours: 72 },
    ],
  },
  health: {
    critical: [
      { action: 'Dispatch medical team with first-aid supplies', priority: 1, timeHours: 1 },
      { action: 'Alert nearest government hospital', priority: 2, timeHours: 1 },
      { action: 'Arrange ambulance standby for affected area', priority: 3, timeHours: 2 },
      { action: 'Begin contact tracing for outbreak', priority: 4, timeHours: 4 },
      { action: 'Initiate door-to-door health survey', priority: 5, timeHours: 8 },
    ],
    high: [
      { action: 'Deploy 2 medical volunteers for assessment', priority: 1, timeHours: 3 },
      { action: 'Arrange fogging/disinfection of area', priority: 2, timeHours: 6 },
      { action: 'Set up temporary health camp', priority: 3, timeHours: 12 },
    ],
    medium: [
      { action: 'Schedule community health check-up', priority: 1, timeHours: 24 },
      { action: 'Distribute basic medicines and ORS packets', priority: 2, timeHours: 24 },
    ],
    low: [
      { action: 'Add to monthly health camp agenda', priority: 1, timeHours: 168 },
    ],
  },
  food: {
    critical: [
      { action: 'Activate emergency food distribution protocol', priority: 1, timeHours: 2 },
      { action: 'Contact Food Corporation of India (FCI) emergency line', priority: 2, timeHours: 3 },
      { action: 'Deploy 4 food distribution volunteers with dry rations', priority: 3, timeHours: 4 },
      { action: 'Reach out to Akshaya Patra Foundation for meals', priority: 4, timeHours: 6 },
    ],
    high: [
      { action: 'Open temporary food distribution center in ward', priority: 1, timeHours: 6 },
      { action: 'Identify BPL families not receiving rations', priority: 2, timeHours: 8 },
    ],
    medium: [
      { action: 'Report PDS shop closure to district supply officer', priority: 1, timeHours: 24 },
      { action: 'Arrange temporary ration supply', priority: 2, timeHours: 48 },
    ],
    low: [
      { action: 'Escalate PDS compliance issue to block officer', priority: 1, timeHours: 72 },
    ],
  },
  electricity: {
    critical: [
      { action: 'Report to CSPDCL emergency helpline (1912)', priority: 1, timeHours: 1 },
      { action: 'Secure exposed wires — deploy safety volunteer', priority: 2, timeHours: 2 },
      { action: 'Coordinate generator/backup for critical facilities', priority: 3, timeHours: 4 },
    ],
    high: [
      { action: 'File formal complaint with DISCOM', priority: 1, timeHours: 4 },
      { action: 'Survey affected households for safety hazards', priority: 2, timeHours: 6 },
    ],
    medium: [
      { action: 'Document outage pattern for escalation', priority: 1, timeHours: 24 },
      { action: 'Organize community petition to electricity board', priority: 2, timeHours: 48 },
    ],
    low: [
      { action: 'Schedule routine maintenance request', priority: 1, timeHours: 72 },
    ],
  },
  roads: {
    critical: [
      { action: 'Place safety barricades at hazard point immediately', priority: 1, timeHours: 2 },
      { action: 'Report to PWD emergency cell with geo-coordinates', priority: 2, timeHours: 3 },
      { action: 'Arrange traffic diversion volunteers', priority: 3, timeHours: 4 },
    ],
    high: [
      { action: 'File complaint with Nagar Panchayat/Municipal corp', priority: 1, timeHours: 6 },
      { action: 'Document damage with photos for official record', priority: 2, timeHours: 8 },
    ],
    medium: [
      { action: 'Schedule road inspection with municipal engineer', priority: 1, timeHours: 24 },
    ],
    low: [
      { action: 'Add to road repair maintenance queue', priority: 1, timeHours: 72 },
    ],
  },
  sanitation: {
    critical: [
      { action: 'Deploy sanitation team for emergency cleanup', priority: 1, timeHours: 3 },
      { action: 'Arrange anti-larval spraying in affected area', priority: 2, timeHours: 6 },
      { action: 'Issue health advisory for residents', priority: 3, timeHours: 8 },
    ],
    high: [
      { action: 'Report to Swachh Bharat Mission cell', priority: 1, timeHours: 8 },
      { action: 'Coordinate with municipal sanitation department', priority: 2, timeHours: 12 },
    ],
    medium: [
      { action: 'Register complaint on Swachh Bharat App', priority: 1, timeHours: 24 },
    ],
    low: [
      { action: 'Add to weekly sanitation schedule', priority: 1, timeHours: 72 },
    ],
  },
  shelter: {
    critical: [
      { action: 'Activate relief camp at nearest community center', priority: 1, timeHours: 3 },
      { action: 'Coordinate with SDRF (State Disaster Response Force)', priority: 2, timeHours: 4 },
      { action: 'Deploy 5 shelter volunteers with tarpaulins & blankets', priority: 3, timeHours: 6 },
      { action: 'Arrange food and water at relief camp', priority: 4, timeHours: 8 },
    ],
    high: [
      { action: 'Identify vacant government buildings for temporary shelter', priority: 1, timeHours: 6 },
      { action: 'Contact Red Cross for emergency materials', priority: 2, timeHours: 8 },
    ],
    medium: [
      { action: 'Initiate housing repair assistance process', priority: 1, timeHours: 24 },
    ],
    low: [
      { action: 'Link families to Pradhan Mantri Awas Yojana', priority: 1, timeHours: 168 },
    ],
  },
  infrastructure: {
    critical: [
      { action: 'Evacuate building/area — deploy safety volunteers', priority: 1, timeHours: 1 },
      { action: 'Notify municipal engineering department immediately', priority: 2, timeHours: 2 },
      { action: 'Arrange structural safety inspection', priority: 3, timeHours: 4 },
    ],
    high: [
      { action: 'Barricade unsafe structure', priority: 1, timeHours: 4 },
      { action: 'File PWD/municipal complaint with photos', priority: 2, timeHours: 6 },
    ],
    medium: [
      { action: 'Schedule structural assessment', priority: 1, timeHours: 48 },
    ],
    low: [
      { action: 'Add to infrastructure maintenance register', priority: 1, timeHours: 72 },
    ],
  },
  air: {
    critical: [
      { action: 'File pollution complaint with CPCB/SPCB immediately', priority: 1, timeHours: 2 },
      { action: 'Distribute N95 masks to affected school/community', priority: 2, timeHours: 4 },
      { action: 'Demand factory inspection by pollution control board', priority: 3, timeHours: 6 },
    ],
    high: [
      { action: 'Document pollution evidence with timestamped photos', priority: 1, timeHours: 4 },
      { action: 'Alert Chhattisgarh Environment Conservation Board', priority: 2, timeHours: 6 },
    ],
    medium: [
      { action: 'File complaint on CPCB Sameer app', priority: 1, timeHours: 24 },
    ],
    low: [
      { action: 'Monitor AQI and prepare community report', priority: 1, timeHours: 72 },
    ],
  },
};

// Resolution time estimates in days
const RESOLUTION_TIME = {
  critical: 2, high: 5, medium: 14, low: 30,
};

// Required volunteer count
const VOLUNTEER_COUNT = {
  critical: { min: 3, max: 5 },
  high:     { min: 2, max: 3 },
  medium:   { min: 1, max: 2 },
  low:      { min: 1, max: 1 },
};

/**
 * Recommend actions for a given report.
 * @param {object} report - { category, urgencyScore, location, affectedCount, tags }
 * @param {string[]} availableSkills - skills available from matched volunteers
 * @returns {object} recommendation
 */
function recommendActions(report) {
  const { category, urgencyScore, location, affectedCount = 0, tags = [] } = report;

  // Determine urgency tier
  let tier;
  if (urgencyScore >= 85)      tier = 'critical';
  else if (urgencyScore >= 65) tier = 'high';
  else if (urgencyScore >= 45) tier = 'medium';
  else                          tier = 'low';

  const categoryActions = ACTIONS[category] || ACTIONS.infrastructure;
  const actions = categoryActions[tier] || categoryActions.medium || [];

  // Tag-based action boosters
  const extraActions = [];
  if (tags.includes('children') || tags.includes('school')) {
    extraActions.push({ action: 'Priority alert: Children at risk — fast-track response', priority: 0, timeHours: 1 });
  }
  if (tags.includes('hospital') || tags.includes('PHC')) {
    extraActions.push({ action: 'Critical: Healthcare facility affected — escalate to CMO', priority: 0, timeHours: 1 });
  }
  if (tags.includes('outbreak') || tags.includes('dengue') || tags.includes('malnutrition')) {
    extraActions.push({ action: 'Health emergency protocol: Notify District Health Officer', priority: 0, timeHours: 1 });
  }
  if (tags.includes('women') || tags.includes('dignity')) {
    extraActions.push({ action: 'Gender-sensitive response: Assign female volunteers', priority: 1, timeHours: 2 });
  }
  if (tags.includes('BPL') || tags.includes('hunger')) {
    extraActions.push({ action: 'Vulnerable household protocol: PM Garib Kalyan Yojana linkage', priority: 2, timeHours: 4 });
  }

  const allActions = [...extraActions, ...actions].sort((a, b) => a.priority - b.priority);

  const volCount = VOLUNTEER_COUNT[tier];
  const estimatedDays = RESOLUTION_TIME[tier];

  // Populate-scale estimate
  let populationRisk = 'Low';
  if (affectedCount > 500) populationRisk = 'Very High';
  else if (affectedCount > 200) populationRisk = 'High';
  else if (affectedCount > 50)  populationRisk = 'Medium';

  return {
    reportCategory: category,
    urgencyTier: tier,
    urgencyScore,
    recommendedActions: allActions,
    volunteerRequirement: {
      min: volCount.min,
      max: volCount.max,
      priority: tier === 'critical' ? 'IMMEDIATE' : tier === 'high' ? 'URGENT' : 'STANDARD',
    },
    estimatedResolution: `${estimatedDays} day${estimatedDays > 1 ? 's' : ''}`,
    populationRisk,
    affectedCount,
    location: location?.area || location?.ward || 'Unknown area',
    generatedAt: new Date().toISOString(),
    confidence: Math.min(95, 70 + Math.floor(urgencyScore / 5)),
  };
}

module.exports = { recommendActions };
