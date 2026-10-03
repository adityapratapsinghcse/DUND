# DEGRADE — Immersive Multi-Domain Decision-Making Trainer for Degraded Communication Environments

[![SIH 2026](https://img.shields.io/badge/SIH%202026-PS%20ID%2026248-blue.svg)](https://www.sih.gov.in)
[![Ministry of Defence](https://img.shields.io/badge/Ministry%20of%20Defence-DSSC-green.svg)](https://www.mod.gov.in)
[![Stack](https://img.shields.io/badge/Django%205-DRF%20%7C%20Channels%20%7C%20Celery-darkgreen.svg)](https://www.djangoproject.com)
[![Frontend](https://img.shields.io/badge/React%2018-TypeScript%20%7C%20Vite%20%7C%20Tailwind-teal.svg)](https://vitejs.dev)
[![Mobile](https://img.shields.io/badge/Expo-React%20Native-blueviolet.svg)](https://expo.dev)

> **Ministry of Defence, Defence Services Staff College (DSSC)**  
> **Smart India Hackathon 2026 | Problem Statement ID: 26248**

---

## 🎖️ Executive Summary
In multi-domain military operations (Land, Air, Cyber, and Electronic Warfare), communication systems are actively targeted through electromagnetic jamming, satellite downlink degradation, and deception spoofing.

**DEGRADE** is a tactical decision-making simulator where the central server holds the absolute **ground truth**, while each commander only perceives a degraded reality shaped by physical link quality, electromagnetic jamming zones, and global contestation intensity.

Commanders train under high stress and uncertainty, learn to cross-examine conflicting intelligence, and calibrate their confidence. Instructors command real-time exercise controls, inject disruptions live, and conduct comprehensive After-Action Reviews (AAR) contrasting **"What Was True" vs. "What You Saw"**.

---

## 🖼️ User Interface Showcase

| Desktop Sign In (Light Theme) | Desktop Sign In (Dark Theme) |
| :---: | :---: |
| ![Desktop Login Light](docs/screenshots/desktop-login-light.png) | ![Desktop Login Dark](docs/screenshots/desktop-login-dark.png) |

| Mobile Commander Station (Light) | Mobile Commander Station (Dark) |
| :---: | :---: |
| ![Mobile Login Light](docs/screenshots/mobile-login-light.png) | ![Mobile Login Dark](docs/screenshots/mobile-login-dark.png) |

| Instructor Dashboard | Scenario Intelligence Editor |
| :---: | :---: |
| ![Instructor Dashboard](docs/screenshots/desktop-instructor-dashboard.png) | ![Scenario Editor](docs/screenshots/desktop-scenario-editor.png) |

---

## 🏛️ Monorepo Architecture

```
DEFENCE_SIH/
├── backend/            # Django 5 + DRF + Channels + Daphne + Celery + Redis / SQLite
├── web/                # React 18 + TypeScript + Vite + Tailwind CSS + MapLibre GL
├── mobile/             # Expo + React Native + TypeScript + Live GPS Streaming
├── packages/shared/    # Typed API Client, Realtime Client, Zustand Reducers, Sand & Sage Tokens
├── docs/               # architecture.md, api.md, demo-script.md, screenshots/
├── scripts/            # dev.ps1, dev.sh, seed.sh, capture_screenshots.js
├── docker-compose.yml  # Multi-container orchestration (Postgres, Redis, Daphne, Celery)
├── .env.example
├── .gitignore
├── README.md
└── PUSHING_TO_GITHUB.md
```

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- Python 3.11+
- Node.js 20+ and npm 10+
- (Optional) Docker & Docker Compose

### 2. Windows 1-Click Launch (PowerShell)
From the `DEFENCE_SIH` directory:
```powershell
.\scripts\dev.ps1
```

### 3. Linux / macOS 1-Click Launch (Bash)
```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

### 4. Docker Multi-Container Launch
```bash
docker compose up --build
```

---

## 🔑 Default Seeded Demo Credentials
Run `python manage.py seed_demo` to initialize:

| Role | Username | Password | Rank & Assignment |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin` | `admin12345` | Brigadier, MoD Cyber Command |
| **INSTRUCTOR** | `instructor` | `instructor123` | Colonel, DSSC Tactical Faculty |
| **TRAINEE (LAND)** | `land1` | `trainee123` | Major, 14 Strike Corps |
| **TRAINEE (AIR)** | `air1` | `trainee123` | Squadron Leader, 45 Sqn Flying Daggers |
| **TRAINEE (CYBER)**| `cyber1` | `trainee123` | Captain, Defence Cyber Agency |

---

## 🧪 Automated Test Verification

### Backend Test Suite (Django APITestCase)
```bash
cd backend
python manage.py test
```
*Tests: Seed reproducibility, trainee confidentiality protections (never exposing origin, delay_sec, or is_corrupted), role guards, exercise lifecycle, and Brier score calibration.*

### Web Test Suite (Vitest)
```bash
npm --workspace=web run test
```

### Mobile Health Check (Expo Doctor)
```bash
cd mobile
npx expo-doctor
```

---

## 🎬 3-Minute Evaluator Demo Script
A complete minute-by-minute walkthrough is documented in [`docs/demo-script.md`](docs/demo-script.md).

---

## 📄 License
Ministry of Defence, Government of India — Smart India Hackathon 2026.
