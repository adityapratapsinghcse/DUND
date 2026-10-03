# DEGRADE — REST & WebSocket API Specification
**Problem Statement ID: 26248** (SIH 2026) • DSSC Tactical Simulation Platform

---

## 1. Authentication & Session Management
All requests require JWT Bearer authentication: `Authorization: Bearer <access_token>`.

| Method | Endpoint | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login/` | Obtain JWT tokens | `{"username", "password"}` | `{access, refresh, user}` |
| `POST` | `/api/auth/register/` | Trainee self-registration | `{"username", "password", "rank", "unit"}` | `{id, username, role: "TRAINEE"}` |
| `POST` | `/api/auth/refresh/` | Rotate access token | `{"refresh"}` | `{access}` |
| `GET` | `/api/auth/me/` | Current profile | — | User details |
| `PATCH` | `/api/auth/me/` | Update profile | `{"email", "rank", "unit"}` | Updated user |

---

## 2. Exercise Lifecycle & Tactical Control

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/exercises/` | INSTRUCTOR, ADMIN | Create new exercise room with auto-generated 6-char code |
| `GET` | `/api/exercises/` | ANY AUTH | List active and historical exercise rooms |
| `POST` | `/api/exercises/join/` | TRAINEE | Join room via `{"join_code", "role"}` |
| `POST` | `/api/exercises/{id}/start/` | INSTRUCTOR, ADMIN | Transition state to `RUNNING`, begin simulation tick |
| `POST` | `/api/exercises/{id}/pause/` | INSTRUCTOR, ADMIN | Pause timer and scheduled injections |
| `POST` | `/api/exercises/{id}/resume/` | INSTRUCTOR, ADMIN | Resume exercise clock |
| `POST` | `/api/exercises/{id}/end/` | INSTRUCTOR, ADMIN | Conclude exercise and freeze state for AAR |
| `POST` | `/api/exercises/{id}/intensity/` | INSTRUCTOR, ADMIN | Adjust baseline degradation intensity `[0.0, 1.0]` |
| `GET` | `/api/exercises/{id}/monitor/` | INSTRUCTOR, ADMIN | Full ground-truth telemetry snapshot |
| `POST` | `/api/exercises/{id}/inject/` | INSTRUCTOR, ADMIN | Live inject truth event, fake report, or jamming zone |
| `GET` | `/api/exercises/{id}/links/` | INSTRUCTOR, ADMIN | View comm link quality & connectivity |
| `POST` | `/api/exercises/{id}/links/` | INSTRUCTOR, ADMIN | Toggle comm link UP / DOWN or update quality |

---

## 3. Trainee Station Endpoints

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/exercises/{id}/feed/?since=<id>` | TRAINEE | Redacted degraded intelligence reports & live signal bars |
| `POST` | `/api/exercises/{id}/position/` | TRAINEE | Stream physical GPS location `{lat, lon}` |
| `GET` | `/api/exercises/{id}/decisions/` | ANY AUTH | Fetch tactical command decisions |
| `POST` | `/api/exercises/{id}/decisions/` | TRAINEE | Log tactical command order `{action_type, self_confidence, ...}` |
| `GET` | `/api/exercises/{id}/scorecard/` | ANY AUTH | Individual performance & Brier calibration scorecard |

> [!IMPORTANT]
> **Trainee Redaction Boundary**: Network payloads delivered to trainees NEVER contain `origin`, `is_corrupted`, `delay_sec`, or `expected_actions`.

---

## 4. WebSocket Real-Time Specification
URL: `ws://HOST/ws/exercises/{id}/?token=<access_jwt>`

### Client-to-Server Messages
```json
// Heartbeat ping (every 20s)
{"type": "ping"}

// Position stream (every 5s from mobile/web GPS)
{"type": "position", "lat": 25.4358, "lon": 81.8463}
```

### Server-to-Trainee Messages
```json
// Pushed upon report arrival
{
  "type": "report",
  "report": {
    "id": 14,
    "confidence": "PROBABLE",
    "payload": {
      "title": "Mechanized Patrol Sighted",
      "detail": "6 armored units bearing south",
      "lat": 25.441,
      "lon": 81.865
    },
    "delivered_at": "2026-10-04T00:15:30Z"
  }
}

// Link status update
{
  "type": "link_status",
  "bars": 2,
  "quality": 0.45,
  "status": "RUNNING"
}
```

### Server-to-Instructor Messages
- `truth_event`: Unredacted ground truth event.
- `report_delivered`: Metadata including `origin`, `is_corrupted`, `delay_sec`.
- `decision`: Real-time notification of trainee command order.
- `participant_joined`: Trainee role enrollment.
