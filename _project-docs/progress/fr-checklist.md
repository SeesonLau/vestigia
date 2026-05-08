# Functional Requirements Checklist
**Last verified:** 2026-05-08 (full-codebase QA audit @ `main eac6ed3`)

Legend: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Stub/mock

---

## FR-100 — Authentication

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-101 | User Registration | High | ✅ | Supabase signUp; patient + clinic flows; clinic flow now lands on `clinic-pending-approval` (auto-sign-in removed) |
| FR-102 | User Login | High | ✅ | signInWithPassword; AsyncStorage session; lockout after 5 fails. Clinic-approval gate added — `pending` and `rejected` clinics are signed out with a clear message |
| FR-103 | Password Recovery — Patient | Medium | ✅ | resetPasswordForEmail + deep-link handler in `app/_layout.tsx:20-25` |
| FR-104 | Session Management (30 min timeout) | Medium | ✅ | `useInactivityTimeout` mounted at `app/_layout.tsx:14`; resets on touch |
| FR-105 | Clinic Approval Gate | High | ✅ | New: `clinics.approval_status` + RLS-fenced trigger; `lib/admin/clinicApproval.ts:fetchClinicApproval()`; admin web Approves / Rejects via `admin_approve_clinic` / `admin_reject_clinic` SECURITY DEFINER RPCs |
| FR-106 | Password Recovery — Clinic | Medium | ✅ | Admin-mediated. Logged-in clinics file via `(clinic)/request-password-reset.tsx` + `submit_password_reset_request` RPC. Locked-out clinics contact the admin out-of-band; admin verifies by phone and sets a temp password via the `admin-set-clinic-password` Edge Function |

---

## FR-200 — Device Connectivity

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-201 | BLE Device Discovery | High | 🔄 | `lib/thermal/bleCamera.ts` real scanning via react-native-ble-plx; needs hardware |
| FR-202 | Device Pairing | High | 🔄 | `connectBle()` reads WiFi IP from BLE characteristic |
| FR-203 | Wi-Fi Camera Stream | High | 🔄 | `lib/thermal/wifiCamera.ts` WebSocket to ESP32 |
| FR-204 | Connection Status Monitoring | High | 🔄 | StatusIndicator + deviceStore callbacks |
| FR-205 | UVC Camera (PureThermal + Lepton 3.5) | High | ✅ | `android/app/.../UVCModule.kt` — full pipeline: Y16 decode + 3×3 median + adaptive EMA + CLAHE + 320×240 bilinear upscale + unsharp + JPEG q95. Volatile flag toggles Raw/Enhanced |

---

## FR-300 — Thermal Data

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-301 | Thermal Data Reception | High | ✅ | UVC live with full enhancement pipeline; WiFi path stubbed for ESP32 hardware |
| FR-302 | Real-Time Thermal Map Rendering | High | ✅ | Live preview at native or upscaled scale; Medical default palette |
| FR-303 | Temperature Annotation Display | Medium | ✅ | On-screen Hot / Cold / All-3 crosshair overlays bounded to ROI |
| FR-304 | Thermal Image Capture | High | ✅ | Bilateral two-step; 3-slot bundle artifacts (slot1 unprocessed, slot2 processed, slot3 isolated); `feed_mode` column |
| FR-305 | Bilateral Foot Positioning Guidance | Medium | ✅ | `FootFrameOverlay` draggable rectangle; ROI doubles as crosshair scan bound |
| FR-306 | Radiometric Correction | Medium | ✅ | Emissivity (skin ε ≈ 0.98) + reflected-temperature correction applied per-pixel; persisted per-device via `lib/thermal/measurementParams.ts`; paged settings sheet |
| FR-307 | Foot Isolation | High | ✅ | Median + (optional) upscale + Otsu / ROI-aware thresholding + closing + largest-component + hole-fill (`fillHoles()` flood from border on inverse mask) + opening. Moat-based bg sampler hardened against subjects extending past the ROI box |

---

## FR-400 — Patient Data

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-401 | Blood Glucose Input (30–600 mg/dL) | High | ✅ | Range-validated; inserts to `patient_vitals` |
| FR-402 | Blood Pressure Input (systolic > diastolic) | High | ✅ | Validated |
| FR-403 | Session-Based Data Handling | High | ✅ | `clearSession()` on exit; thermalStore lifecycle wired |
| FR-404 | Profile Photo Upload | Medium | ✅ | `lib/profile/avatarUpload.ts` reads via `expo-file-system` `File.arrayBuffer()` (bypasses RN `fetch().blob()` zero-byte bug); writes to `profiles/<auth.uid()>/avatar.jpg` to satisfy RLS |
| FR-405 | Profile Photo Cropping | Medium | ✅ | `components/profile/CropAvatarModal.tsx` — pan + pinch via reanimated/gesture-handler + circular SVG mask; `expo-image-manipulator` does the actual pixel crop + 512 px resize. Footer respects `useSafeAreaInsets().bottom` |

---

## FR-500 — Cloud & AI

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-501 | Data Package Preparation | High | ✅ | `lib/thermal/preprocessing.ts`: matrix utils + CSV parse |
| FR-502 | Secure Cloud Upload (HTTPS) | High | ✅ | All inserts via Supabase HTTPS client |
| FR-503 | Processing Status / Server Waking | High | ✅ | `store/dpnStore.ts` polls health every 5 s up to 60 s |
| FR-504 | DPN API Integration | High | ✅ | `lib/dpnApi.ts` typed client → HuggingFace Spaces YOLOv11 + sklearn fusion. Per-foot threshold 45%, asymmetry 2.2 °C |
| FR-505 | Offline Graceful Degradation | Medium | ✅ | `mode-select → (offline)/live-feed → (offline)/patient-details → bundleStorage`. Real form |
| FR-506 | Thermal Preprocessing | High | ✅ | Native Kotlin pipeline at capture time |
| FR-507 | File Import Substitute | Medium | ✅ | CSV + image import on clinic / patient / offline |
| FR-508 | Preliminary Risk Scoring | High | ✅ | Asymmetry threshold 2.2 °C inter-foot + 1.0 °C pixel-level (matches Lavery/Hernandez-Contreras literature) |
| FR-509 | Capture Mode Selection | Medium | ✅ | Single Raw / Enhanced toggle replaces the previous Scale + Feed two-toggle setup; default Raw |
| FR-510 | Domain Shift Awareness | Medium | 🔄 | DPN API was trained on FLIR E60; we capture with Lepton 3.5. Known cause of "everything = positive" verdicts. Mitigation candidates documented in repo notes; not yet implemented |

---

## FR-600 — Result Presentation

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-601 | DPN Classification Display | High | ✅ | Compact verdict card; per-foot Diabetic/Control probabilities; combined verdict |
| FR-602 | Temperature Asymmetry Report | High | ✅ | `dpn-result.tsx` shows mean / max / threshold; per-angiosome bars |
| FR-603 | Annotated Thermal Map Overlay | High | ❌ | Deferred — API returns `diagnosis_factors` text only, no per-angiosome spatial coords (GAP-08) |
| FR-604 | Save / Discard Option | High | ✅ | Save writes to `classification_results`, updates session status to `completed` |
| FR-605 | Clinical Disclaimer | High | ✅ | Used on home + assessment + bundle viewer |
| FR-606 | Plantar Angiosome Diagram | High | ✅ | `components/thermal/FootAngiosomeDiagram.tsx` — left/right foot; 4 quadrants colour-pilled per region temperature; legend |

---

## FR-700 — Home Screens

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-701 | Profile Hero (clinic + patient) | Medium | ✅ | Avatar + greeting + name + clinic / patient code + email + contact. Read-only (editing in Settings) |
| FR-702 | Today / This Month / All session filter | Medium | ✅ | Bound to Supabase query via `useFocusEffect` |
| FR-703 | At-a-glance counts (total / positive / negative) | Medium | ✅ | Derived from filtered list |
| FR-704 | Primary CTA (capture) + secondary tiles | Medium | ✅ | Patients / History / Settings |

---

## FR-800 — Support & Feedback

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-801 | Submit Support Ticket (clinic + patient) | Medium | ✅ | Settings → Feedback / Tickets → shared `FeedbackScreen` (Category / Subject / Body) → `submit_support_ticket` RPC |
| FR-802 | Echo Status + Admin Response Back to Submitter | Medium | ✅ | `listMyTickets()` on focus; tap-to-expand body + admin response; status pill (Open / In Progress / Resolved) |
| FR-803 | Admin Inbox (web) | Medium | ✅ | `web/app/admin/tickets/page.tsx` — list + detail two-pane; Mark in progress / Resolve with response (`admin_resolve_ticket` RPC) |

---

## FR-900 — Admin Web Console

| ID | Title | Priority | Status | Notes |
|---|---|---|---|---|
| FR-901 | Admin Sign-in | High | ✅ | `web/app/admin/login/page.tsx` — Supabase signInWithPassword + role gate (non-admin sign-ins are signed back out) |
| FR-902 | Dashboard Counts | Medium | ✅ | `web/app/admin/page.tsx` — pending clinics / password-reset requests / open + in-progress tickets, each linking to its filtered queue |
| FR-903 | Clinics Approval Queue | High | ✅ | `web/app/admin/clinics/page.tsx` — Approve / Reject (with reason); calls `admin_approve_clinic` / `admin_reject_clinic` |
| FR-904 | Password-Reset Queue | High | ✅ | `web/app/admin/password-resets/page.tsx` — Set Password modal invokes the `admin-set-clinic-password` Edge Function (service-role; verifies caller JWT + admin role; writes `clinic_password_reset_requests.status='approved'` after `auth.admin.updateUserById`) |
| FR-905 | Ticket Inbox | Medium | ✅ | `web/app/admin/tickets/page.tsx` |
| FR-906 | Brand Identity (logo + thermal motif) | Low | ✅ | LumenAI mark in sidebar / login / favicon (`web/app/icon.svg`); `web/components/ThermalBackground.tsx` paints a cool teal blob, a warm amber/rose blob, isotherm contour rings, plantar-foot silhouettes, and a dot-grid texture across all admin pages |

---

## Summary

| Category | ✅ Done | 🔄 Partial | ❌ Not started |
|---|---|---|---|
| FR-100 Auth (6) | 6 | 0 | 0 |
| FR-200 Device (5) | 1 | 4 | 0 |
| FR-300 Thermal (7) | 7 | 0 | 0 |
| FR-400 Patient Data (5) | 5 | 0 | 0 |
| FR-500 Cloud / AI (10) | 9 | 1 | 0 |
| FR-600 Results (6) | 5 | 0 | 1 |
| FR-700 Home (4) | 4 | 0 | 0 |
| FR-800 Support (3) | 3 | 0 | 0 |
| FR-900 Admin Web (6) | 6 | 0 | 0 |
| **Total (52)** | **46** | **5** | **1** |

**Status: 88 % fully done, 10 % partial (hardware-dependent or domain-shift mitigation), 2 % deferred (FR-603 — API limitation).**

Notable additions since the previous audit:
- FR-101 / FR-102 reframed — clinic registration no longer auto-signs in; login enforces `approval_status === 'approved'`
- FR-105 (clinic approval gate) added and ✅
- FR-106 (admin-mediated clinic password reset) added and ✅
- FR-800 series (support tickets) added end-to-end and all ✅
- FR-900 series (admin web console: sign-in, dashboard, three queues, brand identity) added and all ✅
