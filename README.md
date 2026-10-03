# DEGRADE — Immersive Multi-Domain Decision-Making Trainer for Degraded Communication Environments

**Smart India Hackathon 2026** | **Problem Statement ID: 26248**  
**Ministry of Defence, Defence Services Staff College (DSSC)**

---

## 🎖️ Executive Summary
In modern multi-domain warfare (Land, Air, Cyber, Electronic Warfare), communication systems are actively targeted through jamming, node destruction, spoofing, and electromagnetic interference. 

**DEGRADE** is a tactical simulation platform where the server maintains the uncompromised **ground truth**. Every participant only perceives a degraded reality shaped by physical link quality, electromagnetic jamming zones, and global intensity parameters. Commanders learn to operate under uncertainty, cross-examine conflicting intelligence, and calibrate confidence under stress.

Instructors command real-time live exercise controls, inject disruptions on the fly, and conduct exhaustive After-Action Reviews (AAR) to contrast **"What Was True" vs. "What You Saw"**.

---

## 🏛️ Monorepo Architecture

```
DEFENCE_SIH/
├── backend/            # Django 5 + DRF + Django Channels (ASGI/WS) + Celery
├── web/                # React 18 + TypeScript + Vite + Tailwind CSS + MapLibre GL
├── mobile/             # Expo + React Native + TypeScript + GPS location streaming
├── packages/shared/    # OpenAPI Client, Resilient WebSocket Client, Zustand Reducers, Theme Tokens
├── docs/               # Architecture diagram, REST & WS API docs, Demo script, Screenshots
├── scripts/            # dev.ps1, dev.sh, seed.sh
├── docker-compose.yml  # Multi-container orchestration (Postgres, Redis, Daphne, Worker)
├── .env.example
├── .gitignore
├── README.md
└── PUSHING_TO_GITHUB.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Python 3.11+
- Node.js 20+ and npm 10+
- (Optional) Docker & Docker Compose

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
daphne -b 127.0.0.1 -p 8000 degrade.asgi:application
```

Default credentials seeded:
- **Admin**: `admin` / `admin12345` (Full access to Admin Panel)
- **Instructor**: `instructor` / `instructor123` (Exercise control, live injects, AAR)
- **Trainees**: `land1`, `air1`, `cyber1` / password `trainee123`

### 3. Frontend Web Setup
From workspace root:
```bash
npm install
npm --workspace=web run dev
```
Open [http://localhost:5173](http://localhost:5173).

---

## 🧪 Running Tests
```bash
# Backend test suite
cd backend && python manage.py test

# Web test suite
npm --workspace=web run test
```
