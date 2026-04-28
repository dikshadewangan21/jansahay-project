# CommunityPulse — Backend API (MongoDB Edition)

AI-powered community need detection and volunteer dispatch for Raipur, Chhattisgarh.
Data is persisted in **MongoDB** via Mongoose. No more in-memory resets.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| MongoDB | ≥ 6 (local) **or** MongoDB Atlas free tier |

---

## Quick Start

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set MONGODB_URI if using Atlas

# 3. Seed the database (first time only, or to reset)
npm run seed

# 4. Start the server
npm start          # production
npm run dev        # development with auto-reload (nodemon)
```

Server: `http://localhost:5000`
Health: `http://localhost:5000/health`

---

## Environment Variables (.env)

```
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Local MongoDB (no auth required for development):
MONGODB_URI=mongodb://localhost:27017/community_pulse

# MongoDB Atlas (replace with your cluster URL):
# MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/community_pulse
```

---

## Seed Script

```bash
npm run seed
```

Clears **all** existing data and inserts:
- 8 community reports (Raipur wards, real geo-coordinates)
- 7 volunteers with skills, locations, and ratings
- 6 tasks cross-referenced to reports and volunteers by ObjectId
- 7 SDG baseline impact records

Safe to re-run at any time to reset to a clean state.

---

## API Reference

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | List reports (`?category`, `?status`, `?source`, `?minUrgency`, `?limit`, `?offset`) |
| GET | `/api/reports/heatmap` | Geo-weighted points for map overlay |
| GET | `/api/reports/:id` | Single report |
| POST | `/api/reports` | Submit new report (urgency auto-computed) |
| PATCH | `/api/reports/:id/status` | Update status (`open`/`assigned`/`completed`) |
| DELETE | `/api/reports/:id` | Delete report permanently |

### Volunteers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/volunteers` | List volunteers (`?status`, `?skill`, `?availability`) |
| GET | `/api/volunteers/match/:taskId` | AI-ranked volunteer matches for a task |
| GET | `/api/volunteers/:id` | Single volunteer + task history |
| POST | `/api/volunteers` | Register new volunteer |
| PATCH | `/api/volunteers/:id/status` | Update status |
| DELETE | `/api/volunteers/:id` | Delete volunteer |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (`?status`, `?category`) |
| GET | `/api/tasks/:id` | Single task with linked report + volunteer |
| POST | `/api/tasks` | Create task |
| POST | `/api/tasks/:id/assign` | Assign volunteer (marks volunteer `on-task`, report `assigned`) |
| POST | `/api/tasks/:id/complete` | Complete task (frees volunteer, increments `tasksCompleted`) |
| DELETE | `/api/tasks/:id` | Delete task |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Aggregated stats (MongoDB aggregation pipelines) |
| GET | `/api/dashboard/need-graph` | Geo-clustered need clusters |
| GET | `/api/dashboard/forecast` | 7-day category trend forecast |

### SDG

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sdg/scores` | Live UN SDG impact scores from DB |

---

## POST /api/reports — Example Payload

```json
{
  "source": "whatsapp",
  "category": "water",
  "title": "Contaminated water in Block B",
  "description": "Brownish water from taps for 3 days, 40 families affected, children sick",
  "location": {
    "lat": 21.2514,
    "lng": 81.6296,
    "ward": "Ward 7",
    "area": "Shankar Nagar"
  },
  "reportedBy": "+91-9876543210",
  "affectedCount": 200,
  "tags": ["contamination", "children"]
}
```

---

## Data Architecture

```
MongoDB: community_pulse database
├── reports      — community need reports (source, category, urgencyScore, location…)
├── volunteers   — registered volunteers (skills, geo, availability, rating…)
├── tasks        — dispatch tasks (refs reports + volunteers by ObjectId)
└── sdgimpacts   — UN SDG baseline scores (seeded, updated by task completion)
```

All `_id` fields are exposed as `id` (string) in API responses via Mongoose `toJSON` transform.
Cross-references (`reportId`, `assignedVolunteerId`) are also serialised as strings.

---

## What Changed from v1 (in-memory store)

| Area | v1 (in-memory) | v2 (MongoDB) |
|------|----------------|--------------|
| Data persistence | Lost on restart | Persistent in MongoDB |
| IDs | Custom strings (`rpt-001`) | MongoDB ObjectIds → exposed as `id` |
| Filtering | JS `.filter()` | MongoDB query filters + indexes |
| Counts | `.length` | `countDocuments()` |
| Aggregations | JS reduce | MongoDB aggregation pipeline |
| Task assignment | Direct object mutation | `findByIdAndUpdate` + parallel ops |
| Volunteer dedup | Array search | Unique index on `phone` |
| Delete | Not implemented | `findByIdAndDelete` on all resources |
