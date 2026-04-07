# Functional Requirements Checklist
**Last verified:** 2026-04-07 (v0.9.1 full codebase QA audit)

Legend: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Stub/mock

---

## FR-100 — Authentication

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-101 | User Registration | High | ✅ | Supabase signUp, role picker, clinic selector, email confirm flow, all validation |
| FR-102 | User Login | High | ✅ | signInWithPassword, session persists via AsyncStorage, lockout after 5 fails |
| FR-103 | Password Recovery | Medium | ✅ | resetPasswordForEmail, deep link handler, update-password screen wired |
| FR-104 | Session Management (30 min timeout) | Medium | ✅ | `useInactivityTimeout` hook mounted in `app/_layout.tsx`; resets on touch; handles app background |

---

## FR-200 — Device Connectivity

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-201 | BLE Device Discovery | High | 🔄 | `lib/thermal/bleCamera.ts` — real scanning via react-native-ble-plx, filters `ESP32-Thermal*`; pairing.tsx wired. Needs real hardware + `npx expo run:android` rebuild. |
| FR-202 | Device Pairing | High | 🔄 | `connectBle()` implemented; reads WiFi IP from BLE char `0000ffe1-...`. Needs hardware. |
| FR-203 | Wi-Fi Camera Stream | High | 🔄 | `lib/thermal/wifiCamera.ts` — WebSocket to ESP32; binary TM frame protocol; live-feed wired. Needs hardware. |
| FR-204 | Connection Status Monitoring | High | 🔄 | StatusIndicator UI + deviceStore status callbacks wired. Real connectivity pending hardware. |

---

## FR-300 — Thermal Data

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-301 | Thermal Data Reception | High | 🔄 | UVC path: `lib/thermal/uvcCamera.ts` + `lib/thermal/wifiCamera.ts` — both wired in live-feed. UVCModule.kt is a stub (needs AAR). WiFi needs ESP32 firmware. CSV import now also available as substitute. |
| FR-302 | Real-Time Thermal Map Rendering | High | ✅ | `ThermalMap.tsx` renders with iron colormap; responds to imported CSV matrix |
| FR-303 | Temperature Annotation Display | Medium | ✅ | `ThermalAnnotation.tsx` shows min/max/mean |
| FR-304 | Thermal Image Capture | High | ✅ | Bilateral two-step capture flow: `captureLeft()` → `captureRight()` → `capture("bilateral")`. CSV import also routes through the same capture pipeline. |
| FR-305 | Bilateral Foot Positioning Guidance | Medium | ✅ | `FootGuidanceOverlay.tsx` dashed overlay; hidden after first capture |

---

## FR-400 — Patient Data

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-401 | Blood Glucose Input (30–600 mg/dL) | High | ✅ | VitalsForm with range validation; inserts to `patient_vitals` ✅ |
| FR-402 | Blood Pressure Input (systolic > diastolic) | High | ✅ | Validation enforces systolic > diastolic; writes to `patient_vitals` ✅ |
| FR-403 | Session-Based Data Handling | High | ✅ | `clearSession()` called on exit; session lifecycle wired; vitals inserted on clinical-data submit |

---

## FR-500 — Cloud & AI

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-501 | Data Package Preparation | High | ✅ | `lib/thermal/preprocessing.ts`: `normalizeMatrix`, `segmentFootRegion`, `buildApiPayload`. Also `parseCsvMatrix`, `matrixToStorageB64`, `parseStoredMatrix` added (v0.9.1). |
| FR-502 | Secure Cloud Upload (HTTPS) | High | ✅ | clinical-data.tsx inserts session + vitals + captures via HTTPS Supabase client ✅ |
| FR-503 | Processing Status / Server Waking | High | ✅ | `store/dpnStore.ts` — polls server health every 5s up to 60s; shows "server waking" state in assessment.tsx |
| FR-504 | DPN API Integration | High | ✅ | `lib/dpnApi.ts` — typed client; `scanPatient()` sends bilateral matrices + PNG b64; 60s timeout; error mapping. Assessment.tsx calls `startScan()` on mount. |
| FR-505 | Offline Graceful Degradation | Medium | ✅ | mode-select → offline live-feed → offline save → SQLite via expo-sqlite. Clinic sync uploads to Supabase. Patient accept/reject. |
| FR-506 | Thermal Preprocessing | High | ✅ | `parseY16Frame`, `normalizeMatrix`, `segmentFootRegion`, `getMatrixStats`, `buildApiPayload` — all implemented and tested via CSV import |
| FR-507 | File Import Substitute | Medium | ✅ | CSV temperature import + image import on clinic/offline live-feed and patient dashboard. Both routes feed the same thermalStore → AI pipeline as live capture. |
| FR-508 | Preliminary Risk Scoring | High | ✅ | `lib/classification/riskScoring.ts`: LOW < 1.5°C, MEDIUM ≥ 1.5°C, HIGH ≥ 2.2°C. `risk_level` field in `ClassificationResult`. |

---

## FR-600 — Result Presentation

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-601 | DPN Classification Display | High | ✅ | `ClassificationCard` + `dpn-result.tsx` show POSITIVE/NEGATIVE with color + icon |
| FR-602 | Temperature Asymmetry Report | High | ✅ | `dpn-result.tsx` shows asymmetry value + 2.2°C threshold flag |
| FR-603 | Annotated Thermal Map Overlay | High | ❌ | Not implemented — API returns summary text (`diagnosis_factors`), not per-angiosome spatial coordinates. Deferred (GAP-08). |
| FR-604 | Save / Discard Option | High | ✅ | Save writes to `classification_results` + updates session status to `completed`. Discard clears store. |
| FR-605 | Clinical Disclaimer | High | ✅ | `Disclaimer.tsx` used on clinical-data, assessment, and patient dashboard |

---

## Summary

| Category | ✅ Done | 🔄 Partial | ❌ Not started |
|---|---|---|---|
| FR-100 Auth (4) | 4 | 0 | 0 |
| FR-200 Device (4) | 0 | 4 | 0 |
| FR-300 Thermal (5) | 4 | 1 | 0 |
| FR-400 Patient Data (3) | 3 | 0 | 0 |
| FR-500 Cloud/AI (8) | 8 | 0 | 0 |
| FR-600 Results (5) | 4 | 0 | 1 |
| **Total (29)** | **23** | **5** | **1** |

**Status: 79% fully done, 17% partial (all hardware-dependent), 4% not started (FR-603 deferred — API limitation)**
