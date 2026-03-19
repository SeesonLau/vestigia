# Functional Requirements Checklist
**Last verified:** 2026-03-20 (full codebase scan)

Legend: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Stub/mock

---

## FR-100 — Authentication

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-101 | User Registration | High | ✅ | Supabase signUp, role picker, clinic selector, validation in place |
| FR-102 | User Login | High | ✅ | Supabase signInWithPassword, session persists via AsyncStorage |
| FR-103 | Password Recovery | Medium | ✅ | Supabase resetPasswordForEmail, UI complete |
| FR-104 | Session Management (30min timeout) | Medium | ❌ | No inactivity timeout implemented. Supabase handles token refresh but no 30min idle timer |

---

## FR-200 — Device Connectivity

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-201 | BLE Device Discovery | High | ⚠️ | UI shows mock scan list with timeout animation. No real BLE scan |
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
| FR-304 | Thermal Image Capture | High | 🔄 | thermalStore.capture() works. Freeze on screen works. But no real frame from hardware |
| FR-305 | Bilateral Foot Positioning Guidance | Medium | ✅ | FootGuidanceOverlay.tsx dashed overlay implemented |

---

## FR-400 — Patient Data

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-401 | Blood Glucose Input (30–600 mg/dL) | High | 🔄 | VitalsForm UI done with field. Validation range defined in ClinicalThresholds. Submit not wired |
| FR-402 | Blood Pressure Input (systolic > diastolic) | High | 🔄 | UI done. Validation logic defined. Submit not wired |
| FR-403 | Session-Based Data Handling | High | ❌ | Vitals not cleared on session end. No session lifecycle management beyond mock |

---

## FR-500 — Cloud & AI

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-501 | Data Package Preparation (JSON payload) | High | ❌ | No payload builder implemented |
| FR-502 | Secure Cloud Upload (HTTPS + TLS) | High | ❌ | Clinical-data submit is a dummy setTimeout |
| FR-503 | Processing Status Polling | High | ❌ | Assessment screen has a mock loading animation, not real polling |
| FR-504 | Result Retrieval | High | ❌ | Assessment result is hardcoded mock data |
| FR-505 | Offline Graceful Degradation | Medium | ❌ | WatermelonDB not installed. No offline queue |

---

## FR-600 — Result Presentation

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-601 | DPN Classification Display | High | ✅ | ClassificationCard shows POSITIVE/NEGATIVE with color + icon. Large text |
| FR-602 | Temperature Asymmetry Report (2.2°C threshold) | High | ✅ | AngiosomeTable shows bilateral diff, flags >2.2°C in warning color |
| FR-603 | Annotated Thermal Map Overlay | High | 🔄 | ThermalMap renders. Abnormal region overlay not yet implemented |
| FR-604 | Save/Discard Option | Medium | 🔄 | Buttons present in assessment.tsx. Save/discard logic is stub |
| FR-605 | Clinical Disclaimer | High | ✅ | Disclaimer.tsx component present. Used on result screens |

---

## Summary
| Category | ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Stub |
|---|---|---|---|---|
| FR-100 Auth | 3 | 0 | 1 | 0 |
| FR-200 Device | 0 | 0 | 1 | 3 |
| FR-300 Thermal | 3 | 1 | 1 | 0 |
| FR-400 Patient Data | 0 | 2 | 1 | 0 |
| FR-500 Cloud/AI | 0 | 0 | 5 | 0 |
| FR-600 Results | 3 | 2 | 0 | 0 |
| **Total** | **9** | **5** | **9** | **3** |
