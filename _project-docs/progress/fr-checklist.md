# Functional Requirements Checklist
**Last verified:** 2026-03-30 (v0.5.2 full codebase QA audit)

Legend: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Stub/mock

---

## FR-100 — Authentication

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-101 | User Registration | High | ✅ | Supabase signUp, role picker, clinic selector, email confirm flow, validation |
| FR-102 | User Login | High | ✅ | Supabase signInWithPassword, session persists via AsyncStorage, lockout after 5 fails |
| FR-103 | Password Recovery | Medium | ✅ | Supabase resetPasswordForEmail, deep link handler, update-password screen wired |
| FR-104 | Session Management (30min timeout) | Medium | ✅ | `useInactivityTimeout` hook mounted in `_layout.tsx`; resets on touch, handles app background |

---

## FR-200 — Device Connectivity

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-201 | BLE Device Discovery | High | ⚠️ | UI shows mock scan list with timeout animation. No real BLE scan (`react-native-ble-plx` not wired) |
| FR-202 | Device Pairing | High | ⚠️ | Mock pairing with hardcoded setTimeout. No real BLE connect |
| FR-203 | Wi-Fi Data Channel (192.168.4.1:3333) | High | ❌ | deviceStore tracks wifiStatus but no WebSocket/TCP connection implemented |
| FR-204 | Connection Status Monitoring | High | ⚠️ | StatusIndicator UI exists. States managed in deviceStore but not from real hardware |

---

## FR-300 — Thermal Data

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-301 | Thermal Data Reception (80×62 @ 10fps) | High | ❌ | No real data reception. setInterval generates mock matrix |
| FR-302 | Real-Time Thermal Map Rendering | High | ✅ | ThermalMap.tsx renders 80×62 SVG with iron colormap at target fps |
| FR-303 | Temperature Annotation Display | Medium | ✅ | ThermalAnnotation.tsx shows min/max/mean in real-time |
| FR-304 | Thermal Image Capture | High | 🔄 | thermalStore.capture() works. Freeze on screen works. Saved to `thermal_captures` table. No real frame from hardware |
| FR-305 | Bilateral Foot Positioning Guidance | Medium | ✅ | FootGuidanceOverlay.tsx dashed overlay implemented |

---

## FR-400 — Patient Data

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-401 | Blood Glucose Input (30–600 mg/dL) | High | ✅ | VitalsForm with range validation; inserts to `patient_vitals` table |
| FR-402 | Blood Pressure Input (systolic > diastolic) | High | ✅ | UI done. Validation enforces systolic > diastolic; writes to `patient_vitals` |
| FR-403 | Session-Based Data Handling | High | 🔄 | `clearSession()` called on assessment exit. Session lifecycle wired. Vitals cleared on new session start |

---

## FR-500 — Cloud & AI

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-501 | Data Package Preparation (JSON payload) | High | 🔄 | Sessions, vitals, thermal captures all inserted to Supabase. No AI payload builder yet (FR-506 pending) |
| FR-502 | Secure Cloud Upload (HTTPS + TLS) | High | ✅ | clinical-data.tsx inserts session + vitals + captures via HTTPS Supabase client |
| FR-503 | Processing Status Polling | High | ❌ | Assessment screen has a mock progress animation — not real cloud polling |
| FR-504 | Result Retrieval | High | ❌ | Assessment result is hardcoded `MOCK_RESULT` — no real AI response |
| FR-505 | Offline Graceful Degradation | Medium | ❌ | WatermelonDB schema and models exist but sync logic not started. No offline queue |
| FR-506 | Image Preprocessing (contrast normalization + foot region segmentation) | High | ❌ | New `lib/thermal/preprocessing.ts`. `normalizeMatrix()`, `segmentFootRegion()`, `buildApiPayload()`. Prerequisite for FR-507. App-side, no hardware needed |
| FR-507 | AI Model API Integration | High | ❌ | **AI model lives in a separate repo.** This app calls its HTTP API via `lib/api/aiClient.ts`. Blocked until AI API endpoint confirmed |
| FR-508 | Preliminary Risk Scoring (Low/Medium/High) | High | ❌ | `lib/classification/riskScoring.ts`. Rules: LOW = all asymmetries < 1°C; MEDIUM = any ≥ 1°C but < 2.2°C; HIGH = any ≥ 2.2°C. `risk_level` field added to `ClassificationResult` type ✅ |

---

## FR-600 — Result Presentation

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-601 | DPN Classification Display | High | ✅ | ClassificationCard shows POSITIVE/NEGATIVE with color + icon |
| FR-602 | Temperature Asymmetry Report (2.2°C threshold) | High | ✅ | AngiosomeTable shows bilateral diff, flags >2.2°C in warning color |
| FR-603 | Annotated Thermal Map Overlay | High | 🔄 | ThermalMap renders. Abnormal region overlay not yet implemented (GAP-08, depends on FR-507) |
| FR-604 | Save/Discard Option | High | ✅ | Save writes to `classification_results` + updates session status to `completed`. Discard clears store |
| FR-605 | Clinical Disclaimer | High | ✅ | Disclaimer.tsx used on clinical-data, assessment, and patient dashboard |

---

## Summary

| Category | ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Stub |
|---|---|---|---|---|
| FR-100 Auth | 4 | 0 | 0 | 0 |
| FR-200 Device | 0 | 0 | 1 | 3 |
| FR-300 Thermal | 3 | 1 | 1 | 0 |
| FR-400 Patient Data | 2 | 1 | 0 | 0 |
| FR-500 Cloud/AI | 1 | 1 | 6 | 0 |
| FR-600 Results | 4 | 1 | 0 | 0 |
| **Total** | **14** | **4** | **8** | **3** |
