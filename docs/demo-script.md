# DEGRADE — 3-Minute Hackathon Demonstration Script
**Smart India Hackathon 2026** • **Problem Statement ID: 26248**  
**Ministry of Defence / Defence Services Staff College (DSSC)**

---

## ⏱️ Timeline Overview

| Time | Segment | Focus & Action |
| :--- | :--- | :--- |
| **0:00 – 0:45** | **Orientation & Multi-Device Setup** | The Ground Truth concept, Instructor room launch, Trainees join |
| **0:45 – 1:45** | **The Fog of War & Live Degradation** | Jamming, link severance, SignalBars dropping, Ghost markers |
| **1:45 – 2:30** | **Deception & Command Under Uncertainty** | Spoofed injects, contradictory reports, Trainee verification orders |
| **2:30 – 3:00** | **After-Action Review (AAR) & Calibration** | "What Was True vs What You Saw", Replay scrubber, Brier score |

---

## 🎬 Step-by-Step Script

### Minute 1: The Tactical Setup (0:00 – 0:45)
1. **Presenter Statement**:
   > *"Good morning Evaluators. In modern war across Land, Air, Cyber, and EW, officers rarely face total silence—they face corrupted, delayed, and conflicting telemetry. DEGRADE trains commanders to make high-stakes decisions under uncertainty."*
2. **Action 1 (Instructor Screen)**:
   - Sign in as `instructor` / `instructor123` at `http://localhost:5173`.
   - On the Tactical Command Center, click **New Exercise Session**.
   - Select **Operation Dhundh – Border Sector** (Prayagraj Doab). Click **Launch Session**.
   - Note the 6-character room code (e.g. `DHN404`).
3. **Action 2 (Trainee Stations)**:
   - On a second browser window / tab, open `http://localhost:5173/login`.
   - 1-click login as `Trainee (Land)` (`land1` / `trainee123`).
   - Enter Room Code `DHN404`, select role **LAND**. Click **Enter Simulation Station**.
   - (Optional mobile physical device): Open Expo Go on Android phone, join as `AIR` commander.

---

### Minute 2: Simulating the Contested Battlefield (0:45 – 1:45)
1. **Action (Instructor)**:
   - Click **Start Exercise**. The clock begins (`T+00:01s`).
2. **Observe (Trainee Screen)**:
   - At `T+05s`, an aerial radar contact arrives on the map and feed.
   - At `T+15s`, an armored column advance report is delivered. Notice the marker outline reflects confidence (`CONFIRMED`).
3. **Action (Instructor - Triggering Chaos)**:
   - Under Comms Links Matrix, click **HQ → LAND** to toggle the link **DOWN**.
   - Drag the **Global Intensity** slider up to **85%**.
4. **Observe (Trainee Screen)**:
   - Watch the Trainee status strip instantly transition: SignalBars drop from 4 bars to 0 bars, flashing the red **COMMS LOST** banner!
   - As seconds pass without fresh updates, existing map markers gradually become translucent **ghost markers**, indicating stale intelligence.
5. **Action (Trainee Response)**:
   - Trainee notices radio blackout. In the Tactical Command panel, clicks **Fallback Comms** or **Hold Ground**, sets confidence slider to **60%**, and clicks **Execute Order**.

---

### Minute 3: Deception Infiltration & Post-Exercise AAR (1:45 – 3:00)
1. **Action (Instructor - Deception Injection)**:
   - In the Live Inject Panel, select **Spoofed / Deception Report**.
   - Enter Title: `[ALERT] UNCONFIRMED ARMOR RELAY IN SECTOR BRAVO`.
   - Target Role: `LAND`. Click **Transmit Inject**.
2. **Observe (Trainee Screen)**:
   - The Trainee feed receives the report, but visually highlights it alongside the earlier report with an amber banner indicating conflicting transmissions.
   - The trainee realizes the discrepancy, selects **Cross-Verify Intel**, sets confidence to **85%**, and submits.
3. **Action (Concluding the Exercise)**:
   - Instructor clicks **End & Review**.
4. **Review (After-Action Review Page)**:
   - Show the Evaluators the **Chronological Audit**: Ground Truth on the left vs What Trainees Perceived on the right (exposing the hidden delay seconds, packet drops, and spoof labels).
   - Show the **Replay Scrubber**: Scrub back to `+35s` to review how coordinate distortion moved the radar contact.
   - Highlight the **Brier Calibration Scorecard**:
     > *"DEGRADE doesn't just grade right or wrong—it measures officer calibration error using Brier scoring, proving whether a commander was overconfident on bad intel or appropriately cautious."*
   - Click **Export Printable AAR** to show the clean print preview.
