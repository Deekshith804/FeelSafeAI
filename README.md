# 🛡️ FeelSafeAI — AI-Powered Emergency Intelligence Backend

> A production-ready, no-login AI backend for emergency reporting, FIR generation, severity detection, safety mapping, safe route prediction, and case tracking.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-blue)](https://postgis.net)
[![Redis](https://img.shields.io/badge/Redis-7.0+-red)](https://redis.io)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Modules](#modules)
- [Setup](#setup)
- [API Documentation](#api-documentation)
- [Demo Flow](#demo-flow)
- [Sample API Requests](#sample-api-requests)
- [Database Tables](#database-tables)
- [ML Models](#ml-models)
- [WebSocket](#websocket)
- [Alembic Migrations](#alembic-migrations)

---

## 🏗️ Architecture

```
FeelSafeAI Backend
├── FastAPI (REST API + WebSocket)
├── PostgreSQL + PostGIS (geospatial database)
├── Redis (caching + pub/sub for WebSocket)
├── Groq LLaMA API (FIR generation)
├── Bhashini / Whisper (voice transcription)
├── OpenStreetMap / Overpass (emergency services)
├── OpenRouteService / OSRM (route calculation)
├── Scikit-learn (TF-IDF + Naive Bayes classifier)
└── Random Forest (route risk prediction)
```

## 📁 Folder Structure

```
feelsafeai/
├── app/
│   ├── main.py                    # FastAPI entry point
│   ├── core/
│   │   ├── config.py              # Pydantic settings
│   │   ├── database.py            # Async SQLAlchemy + PostGIS
│   │   ├── redis.py               # Redis client + pub/sub
│   │   └── websocket.py           # WebSocket manager
│   ├── modules/
│   │   ├── emergency/router.py    # /api/v1/emergency/*
│   │   ├── fir/router.py          # /api/v1/fir/*
│   │   ├── safety/router.py       # /api/v1/safety/* + incidents/*
│   │   ├── services/router.py     # /api/v1/services/*
│   │   ├── route/router.py        # /api/v1/route/*
│   │   ├── evidence/router.py     # /api/v1/evidence/*
│   │   └── reports/router.py      # /api/v1/reports/*
│   ├── ai/
│   │   ├── emergency_ml_model.py  # TF-IDF + Naive Bayes classifier
│   │   ├── severity_engine.py     # Rule-based severity scoring
│   │   ├── fir_agent.py           # Groq LLaMA FIR generator
│   │   ├── classifier_agent.py    # ML + rules orchestrator
│   │   └── route_risk_model.py    # Random Forest route risk
│   ├── integrations/
│   │   ├── groq_client.py         # Groq API client
│   │   ├── bhashini_client.py     # Bhashini + Whisper ASR
│   │   ├── osm_client.py          # OpenStreetMap / Overpass
│   │   ├── route_client.py        # ORS + OSRM routing
│   │   └── storage_client.py      # S3 / Cloudinary / Local
│   ├── models/models.py           # SQLAlchemy ORM models
│   ├── schemas/                   # Pydantic request/response schemas
│   ├── repositories/              # Database query layer
│   ├── services/                  # Business logic layer
│   └── tests/test_feelsafeai.py   # pytest test suite
├── alembic/                       # Database migrations
├── requirements.txt
├── .env.example
├── pytest.ini
└── README.md
```

---

## 🧩 Modules

### Module 1: Safety Map & Hotspot Mapping
- Community incident reporting with GPS location
- Street safety ratings (lighting, crowd, police visibility)
- Dynamic safety score (blends incidents + ratings + time-of-day)
- Heatmap data for frontend visualization
- WebSocket alerts for new incidents

### Module 2: Auto FIR & Complaint Generator
- Text and voice emergency reporting
- Bhashini/Whisper transcription for Indian languages
- Groq LLaMA-powered FIR generation with **BNS 2023** sections
- Evidence upload (image/video/audio/PDF)
- Auto case ID generation: `FS-2026-1001`

### Module 3: AI Emergency Severity Detection
- Rule-based keyword engine (fast, always runs)
- ML classifier: TF-IDF + Multinomial Naive Bayes
- Location risk integration from Module 1
- Time-of-day risk factor
- Voice stress score placeholder

**Severity Scale:**
| Level | Score | Response |
|-------|-------|----------|
| LOW | 0–30 | Standard |
| MEDIUM | 31–60 | Expedited |
| HIGH | 61–85 | Immediate |
| CRITICAL | 86–100 | Emergency Dispatch |

### Module 4: Smart Emergency Infrastructure
- Nearby police/hospital/pharmacy/women-center finder via OSM
- SafeRoute AI: ML-powered route risk prediction
- Random Forest model with 8 safety features
- Emergency routing with police escort recommendation

### Module 5: Case Tracking (No Login)
- Track any case by its case ID
- Full event timeline
- Evidence history
- FIR history

---

## ⚙️ Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 14+ with PostGIS extension
- Redis 7.0+

### 1. Clone and Install

```bash
git clone <repo-url>
cd feelsafeai
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

**Minimum required keys:**
```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/feelsafeai
REDIS_URL=redis://localhost:6379/0
GROQ_API_KEY=gsk_your_key_here   # from console.groq.com (free)
```

### 3. Setup PostgreSQL with PostGIS

```sql
-- Connect to PostgreSQL
CREATE DATABASE feelsafeai;
\c feelsafeai
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
```

### 4. Run Migrations

```bash
alembic upgrade head
```

### 5. Train ML Models

```bash
# Train emergency classifier
python -m app.ai.emergency_ml_model

# Train route risk model
python -m app.ai.route_risk_model
```

### 6. Start the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Visit: **http://localhost:8000/docs** for interactive Swagger documentation.

---

## 📖 API Documentation

All endpoints are prefixed with `/api/v1`.

### Emergency (Module 2 & 3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/emergency/report` | Submit text emergency |
| POST | `/emergency/voice-report` | Submit voice audio emergency |
| POST | `/emergency/analyze` | Analyze severity (no DB write) |
| POST | `/emergency/analyze-severity` | Detailed severity breakdown |

### FIR (Module 2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/fir/generate` | Generate AI FIR from case |
| GET | `/fir/{case_id}` | Get FIR for case |

### Safety Map (Module 1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/incidents/report` | Report community incident |
| GET | `/incidents/nearby` | Find nearby incidents |
| GET | `/safety/heatmap` | Get heatmap data |
| POST | `/safety/rate-street` | Rate a street's safety |
| GET | `/safety/score` | Get safety score for location |

### Emergency Services (Module 4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/services/nearby` | All nearby emergency services |
| GET | `/services/police` | Nearby police stations |
| GET | `/services/hospitals` | Nearby hospitals |
| GET | `/services/pharmacies` | Nearby pharmacies |
| GET | `/services/women-centers` | Women help centers |

### Route (Module 4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/route/safest` | Calculate safest route |
| POST | `/route/risk-predict` | ML route risk prediction |
| POST | `/route/emergency` | Emergency routing mode |

### Evidence
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/evidence/upload` | Upload case evidence |

### Case Tracking (Module 5)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/{case_id}` | Get case summary |
| GET | `/reports/{case_id}/timeline` | Get event timeline |
| GET | `/reports/{case_id}/evidence` | Get evidence list |

---

## 🚀 Demo Flow

### Full Flow: "Someone is following me near bus stop"

```bash
# Step 1: Report Emergency
curl -X POST http://localhost:8000/api/v1/emergency/report \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Someone is following me near bus stop on MG Road",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "address": "MG Road Bus Stop, Bengaluru"
  }'

# Response:
# {
#   "case_id": "FS-2026-1001",
#   "severity": "HIGH",
#   "severity_score": 74.5,
#   "category": "women_safety",
#   "recommended_action": "1. Immediately call Women Helpline 1091..."
# }

# Step 2: Generate FIR
curl -X POST http://localhost:8000/api/v1/fir/generate \
  -H "Content-Type: application/json" \
  -d '{"case_id": "FS-2026-1001", "complainant_name": "Anonymous Reporter"}'

# Step 3: Find Nearby Police
curl "http://localhost:8000/api/v1/services/police?latitude=12.9716&longitude=77.5946&radius_meters=3000"

# Step 4: Get Safe Route
curl -X POST http://localhost:8000/api/v1/route/safest \
  -H "Content-Type: application/json" \
  -d '{
    "start_latitude": 12.9716,
    "start_longitude": 77.5946,
    "end_latitude": 12.9352,
    "end_longitude": 77.6245,
    "time_of_day": 22
  }'

# Step 5: Track Case
curl http://localhost:8000/api/v1/reports/FS-2026-1001
curl http://localhost:8000/api/v1/reports/FS-2026-1001/timeline
```

---

## 💾 Database Tables

| Table | Purpose |
|-------|---------|
| `emergencies` | Core emergency events |
| `fir_reports` | AI-generated FIR drafts |
| `evidence` | Uploaded evidence files |
| `case_timeline` | Event log per case |
| `community_incidents` | Community safety reports |
| `street_ratings` | User safety ratings |
| `safety_scores` | Aggregated zone safety scores |
| `emergency_services` | Police/hospital/etc. cache |
| `route_predictions` | ML route risk log |

All location columns use **PostGIS GEOMETRY(POINT, 4326)** with GiST indexes for fast spatial queries.

---

## 🤖 ML Models

### Emergency Classifier
- **Algorithm:** TF-IDF Vectorizer + Multinomial Naive Bayes
- **Training data:** 80+ labeled emergency descriptions
- **Categories:** women_safety, cybercrime, medical, theft, violence, accident, fire, document_loss, harassment
- **Persisted to:** `app/ai/models/emergency_classifier.pkl`

### Route Risk Model
- **Algorithm:** Random Forest Classifier
- **Training:** 500 synthetic samples with heuristic labeling
- **Input features:** incident_count, avg_street_rating, lighting_score, crowd_score, police_visibility_score, women_safety_score, time_of_day, nearby_police_distance
- **Output:** risk_score + risk_level + recommendation

---

## 🔌 WebSocket

Connect to `ws://localhost:8000/ws/alerts` for real-time alerts.

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/alerts?zone=12.97:77.59');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
// Send ping to keep alive:
ws.send('ping');
```

Events received:
- `new_emergency` — HIGH/CRITICAL emergency in area
- `new_incident` — Community incident reported
- `heartbeat` — Server keepalive

---

## 🗄️ Alembic Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply all migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1

# Show current revision
alembic current
```

---

## 🧪 Running Tests

```bash
# Run all tests
pytest app/tests/ -v

# Run with coverage
pytest app/tests/ -v --cov=app --cov-report=html

# Run specific test
pytest app/tests/test_feelsafeai.py::test_ml_classifier_medical -v
```

---

## 🔑 Key API Keys Needed

| Service | Where to Get | Cost |
|---------|-------------|------|
| Groq API | https://console.groq.com | Free |
| OpenRouteService | https://openrouteservice.org/dev | Free tier |
| Bhashini | https://bhashini.gov.in | Free (Indian gov) |
| Cloudinary | https://cloudinary.com | Free tier |

---

## 📞 Emergency Numbers (India)

| Service | Number |
|---------|--------|
| Police | 100 |
| Ambulance | 108 |
| Fire | 101 |
| National Emergency | 112 |
| Women Helpline | 1091 |
| Domestic Violence | 181 |
| Cyber Crime | 1930 |

---

## 📄 License

MIT License — Built for FeelSafeAI hackathon project.
