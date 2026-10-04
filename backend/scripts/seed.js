/**
 * Seed script — populates DB with full demo data for JanSahay.
 * Run: node scripts/seed.js
 *
 * Populates:
 *   - Admin user (admin@demo.in / demo1234)
 *   - Volunteer user (vol@demo.in / demo1234)
 *   - 20 realistic Raipur community reports
 *   - 7 realistic Volunteers with skills, locations, ratings, and contact info
 *   - Tasks linked to reports across open, in-progress, and completed states
 *   - Baseline SDG Impact records
 *   - Sample notifications for volunteers
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const Report   = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const Task     = require('../models/Task');
const SdgImpact = require('../models/SdgImpact');
const Notification = require('../models/Notification');
const { computeUrgencyScore, urgencyLevel } = require('../services/urgencyScoring');
const { classify }            = require('../services/classifier');
const { computeDeadline }     = require('../services/slaService');
const { SDG_CATEGORY_MAP }    = require('../services/sdgScorer');

const DEMO_REPORTS = [
  { source:'web',        category:'water',          title:'Contaminated tap water in Shankar Nagar',            description:'Black muddy water coming from taps for 3 days. Children getting sick.', area:'Shankar Nagar', ward:'Ward 7', lat:21.2514, lng:81.6296, affected:230, tags:['contamination','children'] },
  { source:'mobile',     category:'roads',          title:'Large pothole on MG Road near bus stop',             description:'2-foot deep pothole causing bike accidents daily near main bus stop. Two injuries reported.', area:'MG Road', ward:'Ward 5', lat:21.2490, lng:81.6320, affected:500, tags:['pothole','accident'] },
  { source:'whatsapp',   category:'electricity',    title:'Transformer fault causing daily power outages',      description:'Transformer on Pandri road keeps tripping. 12+ hours of outage every day. Hospital nearby affected.', area:'Pandri', ward:'Ward 18', lat:21.2460, lng:81.6500, affected:180, tags:['outage','hospital'] },
  { source:'web',        category:'sanitation',     title:'Garbage not collected for 2 weeks in Tatiband',     description:'Huge garbage pile near school gate. Rats visible. Mosquito breeding. Children at risk.', area:'Tatiband', ward:'Ward 12', lat:21.2389, lng:81.6500, affected:350, tags:['garbage','mosquito','school'] },
  { source:'ngo_upload', category:'health',         title:'Dengue outbreak suspected in Telibandha colony',    description:'7 dengue cases in one week. All from same street. No fogging done in past month.', area:'Telibandha', ward:'Ward 19', lat:21.2520, lng:81.6580, affected:90, tags:['dengue','outbreak','fogging'] },
  { source:'mobile',     category:'water',          title:'No water supply for 5 days in Kota area',           description:'Water supply completely cut for 5 days. Residents buying tanker water at Rs 500/day.', area:'Kota', ward:'Ward 22', lat:21.2300, lng:81.6700, affected:420, tags:['shortage','tanker'] },
  { source:'paper_survey',category:'roads',         title:'Broken footpath near primary school Urla',           description:'Broken footpath tiles. Elderly people falling. School kids unsafe during rains.', area:'Urla Industrial Area', ward:'Ward 3', lat:21.2600, lng:81.6150, affected:100, tags:['elderly','school','safety'] },
  { source:'whatsapp',   category:'electricity',    title:'Exposed live wires on street light pole',            description:'Street light pole has dangling bare wires. Children playing in area. Very dangerous.', area:'Raipur Colony', ward:'Ward 15', lat:21.2450, lng:81.6400, affected:60, tags:['safety','children','wires'] },
  { source:'mobile',     category:'sanitation',     title:'Open drain overflowing onto main road Kurud',       description:'Main nala overflowing since 3 days. Sewage water mixing with road. Foul smell. Shops affected.', area:'Kurud Road', ward:'Ward 9', lat:21.2550, lng:81.6350, affected:200, tags:['drainage','flood','shops'] },
  { source:'ngo_upload', category:'health',         title:'No doctor at PHC Ward 22 for 3 weeks',              description:'Primary health center has had no doctor for 3 weeks. Pregnant women and elderly with no care.', area:'Kota', ward:'Ward 22', lat:21.2310, lng:81.6690, affected:1500, tags:['healthcare','pregnant','PHC'] },
  { source:'web',        category:'infrastructure', title:'Community hall roof collapsed partially',         description:'Roof slab of ward community hall cracked and partially collapsed. Building unsafe.', area:'Shankar Nagar', ward:'Ward 7', lat:21.2505, lng:81.6280, affected:50, tags:['collapse','unsafe'] },
  { source:'mobile',     category:'food',           title:'PDS ration shop closed for 2 months',               description:'Fair price shop (PDS) has been closed for 2 months. BPL families receiving no grains.', area:'Pandri', ward:'Ward 18', lat:21.2470, lng:81.6510, affected:310, tags:['ration','BPL','hunger'] },
  { source:'web',        category:'water',          title:'Borewell handpump broken at public park',           description:'The only drinking water source for labourers in the park area is broken for 10 days.', area:'MG Road', ward:'Ward 5', lat:21.2498, lng:81.6335, affected:80, tags:['handpump','labourers'] },
  { source:'whatsapp',   category:'roads',          title:'Road dug up for 6 months – no repair done',        description:'NNDC dug road 6 months ago for pipe laying. Never repaired. Major traffic issues daily.', area:'Telibandha', ward:'Ward 19', lat:21.2530, lng:81.6570, affected:800, tags:['digging','traffic'] },
  { source:'mobile',     category:'shelter',        title:'Flood displaced families living on footpath',       description:'12 families displaced by flood 2 weeks ago still living on footpath near bridge. No shelter.', area:'Kota', ward:'Ward 22', lat:21.2295, lng:81.6695, affected:50, tags:['flood','displaced','homeless'] },
  { source:'web',        category:'air',            title:'Industrial smoke from Urla factory affecting school',description:'Black smoke from illegal furnace near primary school every morning. Children coughing.', area:'Urla Industrial Area', ward:'Ward 3', lat:21.2610, lng:81.6160, affected:600, tags:['pollution','school','PM2.5'] },
  { source:'iot',        category:'water',          title:'IoT sensor: Water pressure drop in Ward 9',        description:'IoT pressure sensor logged consistent drop below 0.5 bar for 48 hours. Likely pipe break.', area:'Kurud Road', ward:'Ward 9', lat:21.2555, lng:81.6340, affected:150, tags:['sensor','pressure','pipe'] },
  { source:'mobile',     category:'electricity',    title:'Metering error – bills 3x normal amount',           description:'40+ households received electricity bills 3x higher than normal this month. CSPDCL not responding.', area:'Raipur Colony', ward:'Ward 15', lat:21.2445, lng:81.6395, affected:40, tags:['billing','CSPDCL'] },
  { source:'whatsapp',   category:'sanitation',     title:'Public toilet locked – women using open ground',    description:'Ward 12 public toilet locked for 1 month. Women forced to use open ground near school.', area:'Tatiband', ward:'Ward 12', lat:21.2380, lng:81.6495, affected:200, tags:['toilet','women','dignity'] },
  { source:'ngo_upload', category:'health',         title:'Malnourished children identified in survey',        description:'NGO survey found 23 severely malnourished children under 5 years in Kota slum cluster.', area:'Kota', ward:'Ward 22', lat:21.2305, lng:81.6685, affected:23, tags:['malnutrition','children','anganwadi'] },
];

const DEMO_VOLUNTEERS = [
  {
    name: 'Arjun Mehta',
    phone: '+91-9801234567',
    email: 'arjun.mehta@example.com',
    skills: ['medical', 'first-aid', 'translation-hindi', 'counseling'],
    availability: 'weekends',
    location: { lat: 21.2500, lng: 81.6300, ward: 'Ward 7', area: 'Shankar Nagar' },
    rating: 4.8,
    tasksCompleted: 23,
    status: 'available',
  },
  {
    name: 'Priya Nair',
    phone: '+91-9812345000',
    email: 'priya.nair@example.com',
    skills: ['logistics', 'food-distribution', 'coordination', 'driving'],
    availability: 'daily',
    location: { lat: 21.2400, lng: 81.6480, ward: 'Ward 12', area: 'Tatiband' },
    rating: 4.9,
    tasksCompleted: 41,
    status: 'on-task',
  },
  {
    name: 'Ravi Kumar',
    phone: '+91-9898765432',
    email: 'ravi.kumar@example.com',
    skills: ['plumbing', 'water-sanitation', 'construction', 'heavy-lifting'],
    availability: 'weekdays',
    location: { lat: 21.2520, lng: 81.6290, ward: 'Ward 7', area: 'Shankar Nagar' },
    rating: 4.6,
    tasksCompleted: 15,
    status: 'available',
  },
  {
    name: 'Sunita Devi',
    phone: '+91-9870012345',
    email: 'sunita.devi@example.com',
    skills: ['medical', 'counseling', 'woman-child-welfare', 'field-survey'],
    availability: 'daily',
    location: { lat: 21.2455, lng: 81.6395, ward: 'Ward 15', area: 'Raipur Colony' },
    rating: 5.0,
    tasksCompleted: 67,
    status: 'available',
  },
  {
    name: 'Deepak Sahu',
    phone: '+91-9900011122',
    email: 'deepak.sahu@example.com',
    skills: ['driving', 'logistics', 'heavy-lifting', 'shelter-setup'],
    availability: 'weekends',
    location: { lat: 21.2310, lng: 81.6690, ward: 'Ward 22', area: 'Kota' },
    rating: 4.3,
    tasksCompleted: 9,
    status: 'available',
  },
  {
    name: 'Kavita Bose',
    phone: '+91-9711223344',
    email: 'kavita.bose@example.com',
    skills: ['education', 'child-welfare', 'documentation', 'translation-bengali'],
    availability: 'daily',
    location: { lat: 21.2550, lng: 81.6360, ward: 'Ward 9', area: 'Kurud Road' },
    rating: 4.7,
    tasksCompleted: 32,
    status: 'available',
  },
  {
    name: 'Suresh Patel',
    phone: '+91-9833445566',
    email: 'suresh.patel@example.com',
    skills: ['medical', 'elderly-care', 'medicine-distribution', 'first-aid'],
    availability: 'weekdays',
    location: { lat: 21.2465, lng: 81.6510, ward: 'Ward 18', area: 'Pandri' },
    rating: 4.5,
    tasksCompleted: 19,
    status: 'available',
  },
];

const BASELINE_SDG = [
  { goal: 1,  label: 'No Poverty',                           score: 61, trend: 4,  tasksLinked: 3, peopleReached: 610 },
  { goal: 2,  label: 'Zero Hunger',                          score: 72, trend: 11, tasksLinked: 2, peopleReached: 350 },
  { goal: 3,  label: 'Good Health & Well-being',             score: 68, trend: 7,  tasksLinked: 5, peopleReached: 292 },
  { goal: 6,  label: 'Clean Water & Sanitation',             score: 55, trend: 3,  tasksLinked: 2, peopleReached: 200 },
  { goal: 7,  label: 'Affordable & Clean Energy',            score: 58, trend: 2,  tasksLinked: 2, peopleReached: 280 },
  { goal: 9,  label: 'Industry, Innovation & Infrastructure',score: 64, trend: 5,  tasksLinked: 4, peopleReached: 850 },
  { goal: 10, label: 'Reduced Inequalities',                 score: 48, trend: 2,  tasksLinked: 2, peopleReached: 262 },
  { goal: 11, label: 'Sustainable Cities & Communities',     score: 74, trend: 9,  tasksLinked: 6, peopleReached: 3512 },
  { goal: 13, label: 'Climate Action',                       score: 52, trend: 1,  tasksLinked: 1, peopleReached: 600 },
  { goal: 17, label: 'Partnerships for the Goals',           score: 81, trend: 5,  tasksLinked: 4, peopleReached: 0 },
];

async function seedDatabase() {
  const hashedPwd = await bcrypt.hash('demo1234', 12);

  // Clear existing demo data
  await Promise.all([
    User.deleteMany({ email: { $in: ['admin@demo.in', 'vol@demo.in', ...DEMO_VOLUNTEERS.map(v => v.email)] } }),
    Report.deleteMany({ reportedBy: { $in: ['Seed Data', 'Sahayata Trust (NGO)', 'Field Worker: Meena Sharma', 'Asha Foundation (NGO)'] } }),
    Volunteer.deleteMany({ phone: { $in: DEMO_VOLUNTEERS.map(v => v.phone) } }),
    Task.deleteMany({ title: { $regex: /Tatiband|Shankar Nagar|Raipur Colony|Kurud Road|Pandri|Kota/i } }),
    SdgImpact.deleteMany({}),
  ]);

  // 1. Create Core Users
  const [adminUser, volUser] = await Promise.all([
    User.create({ name: 'Admin User', email: 'admin@demo.in', password: 'demo1234', role: 'admin' }),
    User.create({ name: 'Field Volunteer', email: 'vol@demo.in', password: 'demo1234', role: 'volunteer' }),
  ]);

  // Create accounts for all demo volunteers so they can receive in-app notifications
  await Promise.all(
    DEMO_VOLUNTEERS.map(v =>
      User.create({
        name: v.name,
        email: v.email,
        password: 'demo1234',
        phone: v.phone,
        role: 'volunteer',
      }),
    ),
  );

  // 2. Create Volunteers
  const createdVolunteers = await Volunteer.insertMany(DEMO_VOLUNTEERS);
  const priyaVol = createdVolunteers.find(v => v.name === 'Priya Nair');
  const deepakVol = createdVolunteers.find(v => v.name === 'Deepak Sahu');

  // 3. Create Reports
  const reportDocs = DEMO_REPORTS.map((r, i) => {
    const { score, breakdown } = computeUrgencyScore({
      category: r.category, source: r.source,
      affectedCount: r.affected, description: r.description, tags: r.tags,
    });
    const level = urgencyLevel(score);
    const { category: aiCat, confidence: aiConf } = classify(`${r.title} ${r.description}`);

    const daysAgo = Math.floor(Math.random() * 25);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    return {
      source: r.source,
      category: r.category,
      aiCategory: aiCat !== r.category ? aiCat : null,
      aiConfidence: aiConf,
      title: r.title,
      description: r.description,
      location: { lat: r.lat, lng: r.lng, ward: r.ward, area: r.area },
      reportedBy: 'Seed Data',
      urgencyScore: score,
      urgencyLevel: level,
      urgencyBreakdown: breakdown,
      status: i < 3 ? 'completed' : i < 7 ? 'in_progress' : i < 9 ? 'assigned' : 'open',
      tags: r.tags,
      affectedCount: r.affected,
      slaDeadline: computeDeadline(level, r.category, createdAt),
      slaStatus: i < 3 ? 'resolved' : i === 4 ? 'breached' : 'on_time',
      voteCount: Math.floor(Math.random() * 35) + 2,
      createdAt,
      updatedAt: createdAt,
      resolvedAt: i < 3 ? new Date() : null,
    };
  });

  const createdReports = await Report.insertMany(reportDocs, { timestamps: false });

  // 4. Create Linked Tasks
  const taskData = [
    {
      reportId: createdReports[0]?._id,
      title: 'Emergency water filtration setup — Shankar Nagar',
      description: 'Deploy water filtration unit and distribute clean water jerrycans to affected families in Shankar Nagar.',
      category: 'water',
      urgencyScore: createdReports[0]?.urgencyScore || 85,
      urgencyLevel: urgencyLevel(createdReports[0]?.urgencyScore || 85),
      status: 'in-progress',
      assignedVolunteerId: priyaVol?._id || null,
      estimatedHours: 4,
      location: { lat: 21.2514, lng: 81.6296, area: 'Shankar Nagar' },
      sdgGoals: [3, 6, 11],
    },
    {
      reportId: createdReports[1]?._id,
      title: 'Barricading and road hazard marking — MG Road',
      description: 'Place safety cones, flashers, and signboards around the 2-foot pothole to prevent two-wheeler accidents.',
      category: 'roads',
      urgencyScore: createdReports[1]?.urgencyScore || 78,
      urgencyLevel: urgencyLevel(createdReports[1]?.urgencyScore || 78),
      status: 'open',
      assignedVolunteerId: null,
      estimatedHours: 2,
      location: { lat: 21.2490, lng: 81.6320, area: 'MG Road' },
      sdgGoals: [9, 11],
    },
    {
      reportId: createdReports[2]?._id,
      title: 'Hospital route backup power coordination — Pandri',
      description: 'Coordinate with CSPDCL and emergency mobile generator unit for uninterrupted hospital power.',
      category: 'electricity',
      urgencyScore: createdReports[2]?.urgencyScore || 90,
      urgencyLevel: urgencyLevel(createdReports[2]?.urgencyScore || 90),
      status: 'open',
      assignedVolunteerId: null,
      estimatedHours: 5,
      location: { lat: 21.2460, lng: 81.6500, area: 'Pandri' },
      sdgGoals: [7, 9, 11],
    },
    {
      reportId: createdReports[3]?._id,
      title: 'Sanitation drive near Tatiband primary school',
      description: 'Coordinate municipal waste disposal team to clear accumulated garbage heap near school entrance.',
      category: 'sanitation',
      urgencyScore: createdReports[3]?.urgencyScore || 70,
      urgencyLevel: urgencyLevel(createdReports[3]?.urgencyScore || 70),
      status: 'open',
      assignedVolunteerId: null,
      estimatedHours: 3,
      location: { lat: 21.2389, lng: 81.6500, area: 'Tatiband' },
      sdgGoals: [3, 6, 11],
    },
    {
      reportId: createdReports[4]?._id,
      title: 'Dengue breeding site survey & fogging coordination',
      description: 'Door-to-door survey for stagnant water in Telibandha and coordinate fogging with health department.',
      category: 'health',
      urgencyScore: createdReports[4]?.urgencyScore || 92,
      urgencyLevel: urgencyLevel(createdReports[4]?.urgencyScore || 92),
      status: 'in-progress',
      assignedVolunteerId: createdVolunteers[0]?._id || null,
      estimatedHours: 6,
      location: { lat: 21.2520, lng: 81.6580, area: 'Telibandha' },
      sdgGoals: [3, 10],
    },
    {
      reportId: createdReports[5]?._id,
      title: 'Temporary water tanker distribution — Kota Ward 22',
      description: 'Task completed. Water tankers dispatched and 420 residents provided emergency drinking water.',
      category: 'water',
      urgencyScore: createdReports[5]?.urgencyScore || 88,
      urgencyLevel: urgencyLevel(createdReports[5]?.urgencyScore || 88),
      status: 'completed',
      assignedVolunteerId: deepakVol?._id || null,
      estimatedHours: 4,
      location: { lat: 21.2300, lng: 81.6700, area: 'Kota' },
      sdgGoals: [3, 6, 11],
      completedAt: new Date(Date.now() - 3600000 * 6),
      completionNotes: 'Emergency municipal tanker deployed. Water distributed successfully.',
    },
  ];

  await Task.insertMany(taskData);

  // 5. Seed SDG Impact Baselines
  await SdgImpact.insertMany(BASELINE_SDG);

  // 6. Seed Sample Notifications for volUser
  await Notification.create([
    {
      recipient: volUser._id,
      type: 'new_report_match',
      title: '🚨 High Priority Report in Shankar Nagar',
      message: 'Contaminated tap water reported affecting 230 people. Your water sanitation skills are needed.',
      reportId: createdReports[0]?._id,
      meta: { urgencyLevel: 'high', urgencyScore: 85, category: 'water', area: 'Shankar Nagar', matchScore: 92 },
      isRead: false,
    },
    {
      recipient: volUser._id,
      type: 'task_assigned',
      title: '📋 Mission Assigned: Dengue survey & fogging',
      message: 'You have been assigned to coordinate health survey in Telibandha.',
      isRead: false,
    },
  ]);

  return {
    users: 2 + DEMO_VOLUNTEERS.length,
    volunteers: createdVolunteers.length,
    reports: createdReports.length,
    tasks: taskData.length,
    sdgGoals: BASELINE_SDG.length,
  };
}

async function runStandalone() {
  const { connectDB, disconnectDB } = require('../config/database');
  const config = require('../config');

  console.log('Connecting to database...');
  await connectDB(config.mongoUri || 'mongodb://localhost:27017/jansahay');

  console.log('Seeding demo data...');
  const res = await seedDatabase();

  console.log(`\n✅ Seed complete!`);
  console.log(`   - Users created: ${res.users}`);
  console.log(`   - Volunteers created: ${res.volunteers}`);
  console.log(`   - Reports created: ${res.reports}`);
  console.log(`   - Tasks created: ${res.tasks}`);
  console.log(`   - SDG Impact goals: ${res.sdgGoals}`);
  console.log(`\nDemo Credentials:`);
  console.log(`   Admin:     admin@demo.in / demo1234`);
  console.log(`   Volunteer: vol@demo.in   / demo1234\n`);

  await disconnectDB();
}

if (require.main === module) {
  runStandalone().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
