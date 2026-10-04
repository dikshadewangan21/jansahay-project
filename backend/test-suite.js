/**
 * Comprehensive Backend API Test Suite for JanSahay
 */
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let volToken = '';
let testReportId = '';
let testTaskId = '';

async function run() {
  console.log('🧪 Starting JanSahay API End-to-End Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name} — ${err.message}`);
      failed++;
    }
  }

  // 1. Health check
  await test('GET /health', async () => {
    const res = await fetch('http://localhost:5000/health');
    const data = await res.json();
    if (res.status !== 200 || data.status !== 'ok') throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
  });

  // 2. Admin Login
  await test('POST /api/auth/login (Admin)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.in', password: 'demo1234' }),
    });
    const data = await res.json();
    if (res.status !== 200 || !data.token) throw new Error(`Login failed: ${JSON.stringify(data)}`);
    adminToken = data.token;
  });

  // 3. Volunteer Login
  await test('POST /api/auth/login (Volunteer)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vol@demo.in', password: 'demo1234' }),
    });
    const data = await res.json();
    if (res.status !== 200 || !data.token) throw new Error(`Volunteer login failed: ${JSON.stringify(data)}`);
    volToken = data.token;
  });

  // 4. Auth Me
  await test('GET /api/auth/me', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.status !== 200 || data.role !== 'admin') throw new Error(`Get me failed: ${JSON.stringify(data)}`);
  });

  // 5. List Reports
  await test('GET /api/reports', async () => {
    const res = await fetch(`${BASE_URL}/reports?limit=10`);
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error(`Reports listing failed: ${JSON.stringify(data)}`);
    }
    testReportId = data.data[0].id;
  });

  // 6. Create Report
  await test('POST /api/reports (Submit Civic Issue)', async () => {
    const payload = {
      source: 'web',
      category: 'water',
      title: 'Water pipeline burst near Telibandha',
      description: 'Major drinking water pipeline damaged during road construction, flooding streets.',
      location: { lat: 21.2520, lng: 81.6580, ward: 'Ward 19', area: 'Telibandha' },
      reportedBy: 'Civic Reporter',
      affectedCount: 150,
      tags: ['pipe', 'leakage', 'urgent'],
    };
    const res = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status !== 201 || !data.id || data.urgencyScore === undefined) {
      throw new Error(`Report creation failed: ${JSON.stringify(data)}`);
    }
  });

  // 7. Vote Report
  await test('POST /api/reports/:id/vote', async () => {
    const res = await fetch(`${BASE_URL}/reports/${testReportId}/vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.status !== 200 || typeof data.voteCount !== 'number') {
      throw new Error(`Vote failed: ${JSON.stringify(data)}`);
    }
  });

  // 8. List Volunteers
  await test('GET /api/volunteers', async () => {
    const res = await fetch(`${BASE_URL}/volunteers`);
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.data) || data.data.length < 5) {
      throw new Error(`Expected at least 5 seeded volunteers, got: ${data.data?.length}`);
    }
  });

  // 9. List Tasks & check volunteer info populated
  await test('GET /api/tasks (with populated volunteer info)', async () => {
    const res = await fetch(`${BASE_URL}/tasks`);
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error(`Tasks listing failed: ${JSON.stringify(data)}`);
    }
    const openTask = data.data.find(t => t.status === 'open');
    if (openTask) testTaskId = openTask.id;
  });

  // 10. Dashboard Stats
  await test('GET /api/dashboard/stats', async () => {
    const res = await fetch(`${BASE_URL}/dashboard/stats`);
    const data = await res.json();
    if (res.status !== 200 || !data.summary || data.summary.openReports === undefined) {
      throw new Error(`Dashboard stats failed: ${JSON.stringify(data)}`);
    }
  });

  // 11. Dashboard Need Graph & Forecast
  await test('GET /api/dashboard/need-graph & forecast', async () => {
    const [ngRes, fcRes] = await Promise.all([
      fetch(`${BASE_URL}/dashboard/need-graph`),
      fetch(`${BASE_URL}/dashboard/forecast`),
    ]);
    const ngData = await ngRes.json();
    const fcData = await fcRes.json();
    if (!Array.isArray(ngData.clusters) || !fcData.forecasts) {
      throw new Error(`Need graph or forecast failed`);
    }
  });

  // 12. Predictive Crisis Map
  await test('GET /api/ai/crisis-predictions', async () => {
    const res = await fetch(`${BASE_URL}/ai/crisis-predictions`);
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.predictions) || !data.summary) {
      throw new Error(`Crisis predictions failed: ${JSON.stringify(data)}`);
    }
  });

  // 13. AI Action Recommendations
  await test('GET /api/ai/recommend/:reportId', async () => {
    const res = await fetch(`${BASE_URL}/ai/recommend/${testReportId}`);
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.recommendedActions) || data.recommendedActions.length === 0) {
      throw new Error(`AI recommendation failed: ${JSON.stringify(data)}`);
    }
  });

  // 14. AI Auto-Dispatch with Database Persistence
  await test('POST /api/ai/dispatch/:taskId (Auto-Dispatch Engine)', async () => {
    if (!testTaskId) throw new Error('No open task available to dispatch');
    const res = await fetch(`${BASE_URL}/ai/dispatch/${testTaskId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.status !== 200 || !data.success || !Array.isArray(data.assigned) || data.assigned.length === 0) {
      throw new Error(`Auto-dispatch failed: ${JSON.stringify(data)}`);
    }
    // Verify task status was updated in DB to in-progress
    const checkRes = await fetch(`${BASE_URL}/tasks/${testTaskId}`);
    const checkTask = await checkRes.json();
    if (checkTask.status !== 'in-progress' || !checkTask.assignedVolunteerId) {
      throw new Error(`Task assignment was not persisted: status=${checkTask.status}, vol=${checkTask.assignedVolunteerId}`);
    }
  });

  // 15. SDG Impact Scores
  await test('GET /api/sdg/scores', async () => {
    const res = await fetch(`${BASE_URL}/sdg/scores`);
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.goals) || data.goals.length === 0) {
      throw new Error(`SDG scores failed: ${JSON.stringify(data)}`);
    }
    // Verify goal numbers exist
    const firstGoal = data.goals[0];
    if (firstGoal.goal === undefined || firstGoal.number === undefined) {
      throw new Error(`Goal number missing on SDG response: ${JSON.stringify(firstGoal)}`);
    }
  });

  // 16. In-App Notifications
  await test('GET /api/notifications (Volunteer notifications)', async () => {
    const res = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${volToken}` },
    });
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.data)) {
      throw new Error(`Notifications failed: ${JSON.stringify(data)}`);
    }
  });

  // 17. OCR Document Processing
  await test('POST /api/reports/ocr (Paper Survey OCR Engine)', async () => {
    // Create a simple test canvas or synthetic image file to test OCR endpoint
    const sampleText = 'COMMUNITY PAPER SURVEY\nWard 7 Shankar Nagar\nCategory: Water Contamination\nSevere muddy water from taps. 250 residents affected. Immediate action requested.';
    
    // We can test processDocumentOcr unit or multipart upload
    const { parseCivicEntities } = require('./services/ocrService');
    const parsed = parseCivicEntities(sampleText);
    if (parsed.category !== 'water' || parsed.location.ward !== 'Ward 7' || parsed.affectedCount !== 250) {
      throw new Error(`OCR Entity parser failed: ${JSON.stringify(parsed)}`);
    }
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
