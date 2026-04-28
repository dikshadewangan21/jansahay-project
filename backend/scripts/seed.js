/**
 * Seed script — populates DB with demo data for hackathon demos.
 * Run: node scripts/seed.js
 *
 * Creates:
 *   - 1 admin user     (admin@demo.in / demo1234)
 *   - 1 volunteer user (vol@demo.in   / demo1234)
 *   - 20 realistic Raipur complaint reports
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const Report   = require('../models/Report');
const { computeUrgencyScore, urgencyLevel } = require('../services/urgencyScoring');
const { classify }            = require('../services/classifier');
const { computeDeadline }     = require('../services/slaService');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jansahay';

const DEMO_REPORTS = [
  { source:'web',     category:'water',       title:'Contaminated tap water in Shankar Nagar',         description:'Black muddy water coming from taps for 3 days. Children getting sick.', area:'Shankar Nagar', ward:'Ward 7', lat:21.2514, lng:81.6296, affected:230, tags:['contamination','children'] },
  { source:'mobile',  category:'roads',       title:'Large pothole on MG Road near bus stop',          description:'2-foot deep pothole causing bike accidents daily near main bus stop. Two injuries reported.', area:'MG Road', ward:'Ward 5', lat:21.2490, lng:81.6320, affected:500, tags:['pothole','accident'] },
  { source:'whatsapp',category:'electricity', title:'Transformer fault causing daily power outages',   description:'Transformer on Pandri road keeps tripping. 12+ hours of outage every day. Hospital nearby affected.', area:'Pandri', ward:'Ward 18', lat:21.2460, lng:81.6500, affected:180, tags:['outage','hospital'] },
  { source:'web',     category:'sanitation',  title:'Garbage not collected for 2 weeks in Tatiband',  description:'Huge garbage pile near school gate. Rats visible. Mosquito breeding. Children at risk.', area:'Tatiband', ward:'Ward 12', lat:21.2389, lng:81.6500, affected:350, tags:['garbage','mosquito','school'] },
  { source:'ngo_upload',category:'health',    title:'Dengue outbreak suspected in Telibandha colony', description:'7 dengue cases in one week. All from same street. No fogging done in past month.', area:'Telibandha', ward:'Ward 19', lat:21.2520, lng:81.6580, affected:90, tags:['dengue','outbreak','fogging'] },
  { source:'mobile',  category:'water',       title:'No water supply for 5 days in Kota area',        description:'Water supply completely cut for 5 days. Residents buying tanker water at Rs 500/day.', area:'Kota', ward:'Ward 22', lat:21.2300, lng:81.6700, affected:420, tags:['shortage','tanker'] },
  { source:'web',     category:'roads',       title:'Broken footpath near primary school Urla',        description:'Broken footpath tiles. Elderly people falling. School kids unsafe during rains.', area:'Urla Industrial Area', ward:'Ward 3', lat:21.2600, lng:81.6150, affected:100, tags:['elderly','school','safety'] },
  { source:'whatsapp',category:'electricity', title:'Exposed live wires on street light pole',         description:'Street light pole has dangling bare wires. Children playing in area. Very dangerous.', area:'Raipur Colony', ward:'Ward 15', lat:21.2450, lng:81.6400, affected:60, tags:['safety','children','wires'] },
  { source:'mobile',  category:'sanitation',  title:'Open drain overflowing onto main road Kurud',    description:'Main nala overflowing since 3 days. Sewage water mixing with road. Foul smell. Shops affected.', area:'Kurud Road', ward:'Ward 9', lat:21.2550, lng:81.6350, affected:200, tags:['drainage','flood','shops'] },
  { source:'ngo_upload',category:'health',    title:'No doctor at PHC Ward 22 for 3 weeks',           description:'Primary health center has had no doctor for 3 weeks. Pregnant women and elderly with no care.', area:'Kota', ward:'Ward 22', lat:21.2310, lng:81.6690, affected:1500, tags:['healthcare','pregnant','PHC'] },
  { source:'web',     category:'infrastructure',title:'Community hall roof collapsed partially',      description:'Roof slab of ward community hall cracked and partially collapsed. Building unsafe.', area:'Shankar Nagar', ward:'Ward 7', lat:21.2505, lng:81.6280, affected:0, tags:['collapse','unsafe'] },
  { source:'mobile',  category:'food',        title:'PDS ration shop closed for 2 months',            description:'Fair price shop (PDS) has been closed for 2 months. BPL families receiving no grains.', area:'Pandri', ward:'Ward 18', lat:21.2470, lng:81.6510, affected:310, tags:['ration','BPL','hunger'] },
  { source:'web',     category:'water',       title:'Borewell handpump broken at public park',        description:'The only drinking water source for labourers in the park area is broken for 10 days.', area:'MG Road', ward:'Ward 5', lat:21.2498, lng:81.6335, affected:80, tags:['handpump','labourers'] },
  { source:'whatsapp',category:'roads',       title:'Road dug up for 6 months – no repair done',     description:'NNDC dug road 6 months ago for pipe laying. Never repaired. Major traffic issues daily.', area:'Telibandha', ward:'Ward 19', lat:21.2530, lng:81.6570, affected:800, tags:['digging','traffic'] },
  { source:'mobile',  category:'shelter',     title:'Flood displaced families living on footpath',    description:'12 families displaced by flood 2 weeks ago still living on footpath near bridge. No shelter.', area:'Kota', ward:'Ward 22', lat:21.2295, lng:81.6695, affected:50, tags:['flood','displaced','homeless'] },
  { source:'web',     category:'air',         title:'Industrial smoke from Urla factory affecting school',description:'Black smoke from illegal furnace near primary school every morning. Children coughing.', area:'Urla Industrial Area', ward:'Ward 3', lat:21.2610, lng:81.6160, affected:600, tags:['pollution','school','PM2.5'] },
  { source:'iot',     category:'water',       title:'IoT sensor: Water pressure drop in Ward 9',     description:'IoT pressure sensor logged consistent drop below 0.5 bar for 48 hours. Likely pipe break.', area:'Kurud Road', ward:'Ward 9', lat:21.2555, lng:81.6340, affected:150, tags:['sensor','pressure','pipe'] },
  { source:'mobile',  category:'electricity', title:'Metering error – bills 3x normal amount',        description:'40+ households received electricity bills 3x higher than normal this month. CSPDCL not responding.', area:'Raipur Colony', ward:'Ward 15', lat:21.2445, lng:81.6395, affected:40, tags:['billing','CSPDCL'] },
  { source:'whatsapp',category:'sanitation',  title:'Public toilet locked – women using open ground', description:'Ward 12 public toilet locked for 1 month. Women forced to use open ground near school.', area:'Tatiband', ward:'Ward 12', lat:21.2380, lng:81.6495, affected:200, tags:['toilet','women','dignity'] },
  { source:'ngo_upload',category:'health',    title:'Malnourished children identified in survey',     description:'NGO survey found 23 severely malnourished children under 5 years in Kota slum cluster.', area:'Kota', ward:'Ward 22', lat:21.2305, lng:81.6685, affected:23, tags:['malnutrition','children','anganwadi'] },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  // Clear existing demo data (not real reports)
  await User.deleteMany({ email: { $in: ['admin@demo.in', 'vol@demo.in'] } });
  await Report.deleteMany({ source: { $in: ['web', 'mobile', 'whatsapp', 'ngo_upload', 'iot'] } });

  // Create demo users
  const hashedPwd = await bcrypt.hash('demo1234', 12);
  const [admin, vol] = await Promise.all([
    User.create({ name: 'Admin User', email: 'admin@demo.in', password: hashedPwd, role: 'admin' }),
    User.create({ name: 'Field Volunteer', email: 'vol@demo.in', password: hashedPwd, role: 'volunteer' }),
  ]);
  console.log('Created demo users: admin@demo.in, vol@demo.in  (password: demo1234)');

  // Build all report docs first, then bulk insert to preserve custom createdAt
  const reportDocs = await Promise.all(DEMO_REPORTS.map(async (r, i) => {
    const { score, breakdown } = computeUrgencyScore({
      category: r.category, source: r.source,
      affectedCount: r.affected, description: r.description, tags: r.tags,
    });
    const level = urgencyLevel(score);
    const { category: aiCat, confidence: aiConf } = classify(`${r.title} ${r.description}`);

    // Stagger created dates over past 30 days for realistic charts
    const daysAgo   = Math.floor(Math.random() * 30);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    return {
      source:       r.source,
      category:     r.category,
      aiCategory:   aiCat !== r.category ? aiCat : null,
      aiConfidence: aiConf,
      title:        r.title,
      description:  r.description,
      location:     { lat: r.lat, lng: r.lng, ward: r.ward, area: r.area },
      reportedBy:   'Seed Data',
      urgencyScore: score, urgencyLevel: level, urgencyBreakdown: breakdown,
      status:       i < 3 ? 'completed' : i < 8 ? 'in_progress' : 'open',
      tags:         r.tags,
      affectedCount: r.affected,
      slaDeadline:  computeDeadline(level, r.category, createdAt),
      slaStatus:    i < 3 ? 'resolved' : 'on_time',
      voteCount:    Math.floor(Math.random() * 40),
      createdAt,
      updatedAt:    createdAt,
      resolvedAt:   i < 3 ? new Date() : null,
    };
  }));

  // Use insertMany with timestamps:false to preserve custom dates
  const created = await Report.insertMany(reportDocs, { timestamps: false });
  console.log(`Created ${created.length} demo reports`);
  console.log('\n✅ Seed complete. You can now start the server and log in with admin@demo.in / demo1234\n');
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
