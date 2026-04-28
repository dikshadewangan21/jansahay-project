# 🤝 JanSahay — AI-Powered Community Problem Resolution Platform

> **Hackathon Project** | Raipur, Chhattisgarh | Built for NGOs & Civic Governance

JanSahay ("People's Help" in Hindi) is a full-stack platform that helps NGOs identify community problems, predict future crises, and automatically mobilize volunteers using AI.

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set MONGODB_URI if needed (default: localhost:27017/jansahay)
npm run seed        # Loads 20 demo reports + admin/volunteer users
npm run dev         # Starts API on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev         # Starts UI on http://localhost:5173
```

### 3. Demo Login
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.in | demo1234 |
| Volunteer | vol@demo.in | demo1234 |

---

## 🏗 Architecture

```
jansahay/
├── backend/                  # Node.js + Express + MongoDB
│   ├── config/               # App config, DB connection, logger
│   ├── controllers/          # Route handlers (all wrapped with asyncHandler ✅)
│   ├── middleware/           # Auth, error handler, asyncHandler fix
│   ├── models/               # Mongoose schemas (User, Report, Volunteer, Task)
│   ├── routes/               # Express routers
│   ├── services/             # Business logic
│   │   ├── actionRecommender.js   # 🧠 AI Action Engine
│   │   ├── volunteerMatcher.js    # 🤖 Auto Dispatch Engine
│   │   ├── crisisPredictor.js     # 🔮 Predictive Crisis Map
│   │   ├── urgencyScoring.js      # Urgency algorithm
│   │   ├── classifier.js          # Category AI classifier
│   │   └── slaService.js          # SLA tracking
│   └── scripts/seed.js       # Demo data seeder
│
└── frontend/                 # React + Vite + Tailwind
    └── src/
        ├── components/       # Shared UI components
        ├── pages/
        │   ├── AIEnginePage.jsx     # 🧠 AI Action Engine UI
        │   ├── CrisisMapPage.jsx    # 🔮 Crisis Prediction UI
        │   ├── DashboardPage.jsx
        │   ├── ReportsPage.jsx
        │   └── ...
        └── services/api.js   # API client (all endpoints)
```

---

## 🤖 AI Features

### 1. 🧠 AI Action Recommendation Engine (`/ai`)
- Analyzes any community report
- Recommends specific, prioritized real-world actions
- Considers: urgency score, category, tags (children/hospital/outbreak), affected count
- Example: Water contamination (score 85) → "Deploy 3 water sanitation volunteers immediately (2h)"

### 2. ⚡ Auto Volunteer Dispatch (`/ai` → Auto Dispatch button)
- Automatically matches top 3 volunteers based on: proximity, skills, availability, performance
- Creates a named mission with ID
- Simulates SMS notification: *"You are assigned to Water Relief Mission at 4 PM"*

### 3. 🔮 Predictive Crisis Map (`/crisis-map`)
- Analyzes ward-level historical report patterns
- Applies seasonal multipliers (monsoon spikes water/sanitation risk etc.)
- Outputs: 🟢 Stable | 🟠 At Risk | 🔴 Future Crisis
- Example: *"Ward 7 → Water crisis likely in 3 days (84% confidence)"*

---

## 🔧 Bug Fixes Applied

| # | Issue | Fix |
|---|-------|-----|
| 1 | Login "Invalid server response" | Added `asyncHandler` wrapper to all controllers — async errors now propagate to Express error handler |
| 2 | Reports page blank | Same asyncHandler fix + CORS config made permissive for dev |
| 3 | Token key mismatch | `cp_token` → `js_token` consistent across api.js + AuthContext |
| 4 | CORS not allowing localhost | Updated to allow all dev origins with array-based origin check |
| 5 | Async errors silently crashing | `asyncHandler.js` created and applied to every controller |

---

## 📡 API Endpoints

### Core
- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Register
- `GET  /api/reports` — List reports (with filters)
- `POST /api/reports` — Submit report
- `GET  /api/dashboard/stats` — Dashboard stats
- `GET  /api/volunteers` — List volunteers

### AI Endpoints (new)
- `GET  /api/ai/recommend/:reportId` — Get AI action recommendations
- `POST /api/ai/recommend` — Inline recommendations
- `POST /api/ai/dispatch/:taskId` — Auto-dispatch volunteers
- `GET  /api/ai/crisis-predictions` — Ward-level crisis predictions

---

## 🎯 Demo Script (For Judges)

1. **Login** as `admin@demo.in / demo1234`
2. **Dashboard** → See 20 live community reports from Raipur wards
3. **Reports** → Filter by urgency, see real civic problems
4. **AI Engine** → Select a critical water/health report → Watch AI recommend exact actions
5. Click **Auto-Dispatch** → System creates mission and assigns top 3 volunteers
6. **Crisis Map** → See predictive ward-level risk map with confidence scores
7. **SDG Impact** → See how resolved cases map to UN goals

---

## 🏆 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Leaflet |
| Backend | Node.js, Express 4, MongoDB, Mongoose 8 |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| AI | Rule-based + statistical engine (no external AI API needed) |
| Maps | Leaflet + OpenStreetMap |
