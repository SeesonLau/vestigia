# Requirements — Vestigia
**Source:** Thesis Chapter 3 — Software Requirements Specification
**Last updated:** 2026-03-20

---

## UI Screens

| ID | Screen | Description |
|---|---|---|
| UI-01 | Authentication | Login/register with email+password, forgot password, create account |
| UI-02 | Device Pairing | BLE discovery, signal strength, pairing confirmation |
| UI-03 | Live Thermal Feed | Real-time 80×62 thermal map, color scale, temperature annotations, capture button |
| UI-04 | AI Assessment | DPN result (POSITIVE/NEGATIVE), risk status, abnormal highlights, save/discard |
| UI-05 | Clinical Data | Blood glucose (mg/dL), blood pressure (mmHg), asymmetry summary, submit |
| UI-06 | Session History | Past sessions list with date, status, review option |
| UI-07 | Settings | App config, device management, account settings |
| UI-08 | Admin Dashboard | System data, user management, AI config, data export (Admin only) |
| UI-09 | Patient Dashboard | Personal screening history and results (Patient only) |

**UI style:** High-contrast slate dark mode, deep charcoal background — maximizes thermal gradient visibility.

---

## FR-100 — Authentication

| ID | Title | Priority | Description | Acceptance Criteria |
|---|---|---|---|---|
| FR-101 | User Registration | High | Create account with email + password (8+ chars, mixed case, numeric) | Account created with confirmation. Errors shown within 2s |
| FR-102 | User Login | High | Auth via email+password, issues session token | Access within 3s. Session persists across restarts until logout |
| FR-103 | Password Recovery | Medium | Reset via email verification | Reset email within 60s. New password functional immediately |
| FR-104 | Session Management | Medium | Auto-timeout after 30 min inactivity | Session expires, user prompted to re-auth. No access after timeout |

---

## FR-200 — Device Connectivity

| ID | Title | Priority | Description | Acceptance Criteria |
|---|---|---|---|---|
| FR-201 | BLE Device Discovery | High | Scan and list DPN Scanner devices with name + signal strength | Devices listed within 10s. Format: `DPN-Scanner-XX` |
| FR-202 | Device Pairing | High | Establish BLE connection, confirm status, auto-reconnect | Pairing within 5s. Status shown. Auto-reconnect on drop |
| FR-203 | Wi-Fi Data Channel | High | After BLE pair, auto-connect to ESP32-S3 AP at `192.168.4.1:3333` | Wi-Fi within 5s of BLE. Stream starts within 2s. Retry on fail |
| FR-204 | Connection Monitoring | High | Monitor BLE + Wi-Fi continuously, alert on disconnection | Status updates within 1s. Alert immediately. Stream pauses gracefully |

---

## FR-300 — Thermal Data

| ID | Title | Priority | Description | Acceptance Criteria |
|---|---|---|---|---|
| FR-301 | Thermal Data Reception | High | Receive 80×62 frames at 10–15 fps via Wi-Fi with integrity check | ≥10 fps, <1% frame loss. Corrupted frames discarded. No UI lag |
| FR-302 | Real-Time Rendering | High | Color-coded thermal map with configurable colormap and temp scale | ≥10 fps render. Latency <100 ms. Scale visible |
| FR-303 | Temperature Annotations | Medium | Display min, max, avg temp on live map | Real-time update. Accuracy ±0.1°C |
| FR-304 | Thermal Capture | High | Freeze current frame on tap for review and upload | Capture within 200 ms. Stored in temp memory |
| FR-305 | Bilateral Foot Guidance | Medium | Visual overlay to verify foot placement in 45° FOV | Overlay visible. Warning if feet not fully visible |

---

## FR-400 — Patient Data

| ID | Title | Priority | Description | Acceptance Criteria |
|---|---|---|---|---|
| FR-401 | Blood Glucose Input | High | Numeric input in mg/dL with validation | Accepts 30–600 mg/dL. Rejects invalid. Labeled with units |
| FR-402 | Blood Pressure Input | High | Systolic + diastolic in mmHg with validation | Systolic 60–250, diastolic 40–150. Validates systolic > diastolic |
| FR-403 | Session-Based Handling | High | Vitals used only for current session, not persisted unless saved | Vitals cleared on session end/discard. No PII without operator action |

---

## FR-500 — Cloud & AI

| ID | Title | Priority | Description | Acceptance Criteria |
|---|---|---|---|---|
| FR-501 | Data Package Preparation | High | JSON payload: 80×62 matrix + vitals + timestamp + device metadata | Complete payload validated before upload |
| FR-502 | Secure Cloud Upload | High | HTTPS POST with TLS 1.2+, progress indicator, retry x3 | Upload within 10s on broadband. Progress shown. Auto-retry on failure |
| FR-503 | Processing Status Polling | High | Poll cloud API every 2–3s, show loading animation | Timeout after 60s with error. Animation displayed |
| FR-504 | Result Retrieval | High | HTTPS GET on completion — classification + confidence + asymmetries | Retrieved within 2s of processing. Includes POSITIVE/NEGATIVE + metrics |
| FR-505 | Offline Degradation | Medium | Capture + store locally when offline, queue upload for later | Local storage persists across restarts. Auto-upload on reconnect |

---

## FR-600 — Result Presentation

| ID | Title | Priority | Description | Acceptance Criteria |
|---|---|---|---|---|
| FR-601 | DPN Classification Display | High | POSITIVE/NEGATIVE with color coding and iconography | POSITIVE = warning color. NEGATIVE = green. Large unambiguous text |
| FR-602 | Temperature Asymmetry Report | High | Bilateral diff per angiosome (MPA, LPA, MCA, LCA). Threshold: >2.2°C | >2.2°C highlighted. TCI per foot. Follows Hernandez-Contreras et al. (2019) |
| FR-603 | Annotated Thermal Map | High | Thermal map with overlaid abnormal region annotations | Abnormal regions outlined. Color legend shown. Overlay non-obstructive |
| FR-604 | Save/Discard Option | Medium | Operator chooses to save or discard session result | Buttons clearly shown. Save confirmed. Discarded data removed from local + cloud |
| FR-605 | Clinical Disclaimer | High | Disclaimer on all result screens: screening tool, not clinical diagnosis | Disclaimer visible on every result screen. States clinical correlation required |

---

## Hardware Reference
> **Not finalized yet.** Hardware specs will be added here once confirmed. Do not implement hardware-dependent features until this section is populated.

---

## Current Focus
**Offline-first dual database architecture:**
- **Local DB** — for offline capture and temporary storage
- **Supabase** — cloud sync when online

All work right now targets the software layer and data layer only. Hardware integration (BLE, Wi-Fi, thermal sensor) is deferred.
