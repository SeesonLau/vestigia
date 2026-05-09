# Prompt for Claude (web) — Excalidraw figures for Methodology Ch. 2

> **How to use this file:** open <https://claude.ai/new>, attach this file (or
> paste the contents below into the chat), and Claude will generate every
> figure listed using the Excalidraw MCP tool. Each figure becomes its own
> Excalidraw view.
>
> **Font:** every figure uses **Nunito**, which is one of Excalidraw's
> bundled fonts — pick it from the font dropdown (no upload, no plugin,
> no SVG re-typesetting needed). If your Excalidraw build doesn't list
> Nunito (very old version), update Excalidraw or fall back to the
> nearest sans-serif available; the thesis will still parse.

---

## Project context

LumenAI / Vestigia is a React Native + Expo + Supabase mobile app + a Next.js
admin web console for Diabetic Peripheral Neuropathy (DPN) thermal screening.
It uses a FLIR Lepton 3.5 sensor on a PureThermal Mini Pro USB host to capture
bilateral foot thermal images, runs a remote HuggingFace YOLO + sklearn fusion
classifier for DPN risk, and sits behind row-level-security-gated Postgres
storage. This prompt supplies every figure my thesis Methodology Chapter 2
needs (Sections 2.1, 2.4, 2.6, 2.7 — Sections 2.2, 2.3, 2.5 are out of scope).

## Output you must produce

For **every figure** below, create **one Excalidraw view** using the
`mcp__claude_ai_Excalidraw__create_view` tool (or the closest equivalent your
session exposes). The view name = the figure ID, e.g. `Fig-2.1.1_System-Overview`.

If the Excalidraw MCP is unavailable, fall back to emitting one ` ```excalidraw …``` `
JSON block per figure that I can paste into the Excalidraw web app via
"Open" → paste JSON.

For Section 2.4 emit **10 inline Markdown subsections** (one per major
screen, numbered 2.4.1 through 2.4.10) — no Excalidraw views, no big
single table. Use the per-subsection template specified inside Section
2.4 itself.

After all figures are produced, list every view name in a final summary so I
can navigate quickly.

---

## Drawing rules (apply to every figure)

1. **Font** — **Nunito** (bundled with Excalidraw), size 14 for box
   labels, size 16 for figure titles, size 12 italic for the caption
   "Fig 2.X.Y. <Title>" placed directly below the diagram.
2. **Node-label rule (strict)** — every label inside a shape is ONE
   keyword, **1–3 words, single line**. **NO** line breaks inside any
   node's text. **NO** version numbers (write `YOLO`, not `YOLOv11`).
   **NO** parenthetical sub-text (write `Lepton`, not `Lepton (160×120)`).
   **NO** captions, tag-lines, or sub-labels stacked beneath a label.
   GOOD: `Lepton 3.5`, `STM32`, `VoSPI`, `CLAHE`, `Sign In`. BAD:
   `FLIR Lepton 3.5\n160x120\n9 fps`, `Bilinear Upscale (160→320)`,
   `auth.signUp() (PostgREST)`. Long descriptive text lives in the
   thesis prose body, never inside a shape. Arrow / edge labels follow
   the same brevity (≤ 3 words).
3. **Shape semantics** (strict):
   - Rounded rectangle = Start / End (terminal state)
   - Rectangle = process step
   - Diamond = decision (yes / no edges)
   - Parallelogram = input / output (form field, file)
   - Hexagon = external system call (Supabase RPC, Edge Function, AI API,
     native module method)
   - Cylinder = data store (Postgres table, Storage bucket, AsyncStorage)
4. **Line connectors (clarity rules)**:
   - Solid line + filled arrowhead = primary path / required data flow.
   - Dashed line + open arrowhead = fallback, optional, or future path.
   - Use Excalidraw's **arrow tool with shape binding** so each end
     anchors to a specific shape (not floating in space). Bound arrows
     reflow when shapes are moved, which keeps the diagram clean.
   - Use **elbow / orthogonal routing** — every line is a sequence of
     horizontal and vertical segments meeting at right-angle corners.
     **Never use diagonals.**
   - Anchor each arrow to the **edge midpoint** of its source and
     destination, not random corners — keeps the layout symmetric.
   - **Avoid arrow crossings.** Re-route or move shapes to eliminate
     them; if a crossing is unavoidable, use a small "jump bridge"
     (semicircle on one of the lines).
   - **Edge labels** sit in white space, not over a shape or another
     line. Keep edge labels ≤ 3 words, same Nunito font, size 12.
   - **One arrow per relationship** — do not stack multiple parallel
     arrows between the same pair of shapes. If two relationships
     genuinely exist, use one arrow with a label that lists both.
   - For decision diamonds, label the outgoing edges `yes` / `no` (or
     the actual values for multi-way decisions) so the reader doesn't
     have to guess which branch is which.
5. **Colour palette** (LumenAI brand, AA contrast):
   - Teal `#0E7A89` — primary processes / data flow
   - Amber `#B45309` — decision branches / warnings
   - Red `#B91C1C` — error / failure terminals
   - Zinc grey `#52525B` — neutral / external boundaries
   - Background white
6. **Layout** — top-to-bottom or left-to-right, never zig-zag. Group
   related steps in a labelled rectangle (e.g. "Native side", "Cloud").
7. **Each diagram fits on a single page** — target ~6×4 inches at 300 dpi.
8. **Caption** — `Fig 2.X.Y. <Title>` directly below.

## Abbreviation glossary (renders ONCE in the thesis prose, NOT inside every diagram)

This table goes into the chapter body — typically as a short "List of
Abbreviations" page at the start of Methodology Chapter 2. Do **not**
embed it inside every figure; the strict node-label rule already
requires every shape to use these abbreviations as bare keywords, and
a 22-row legend would dominate any single figure. If a particular
diagram uses an unusual abbreviation that isn't obvious from context,
spell it out in that figure's prose **Description** instead.

| Abbrev | Meaning |
|---|---|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| AsyncStorage | React Native key-value local store |
| BLE | Bluetooth Low Energy |
| CLAHE | Contrast-Limited Adaptive Histogram Equalisation |
| CSV | Comma-Separated Values |
| DB | Database |
| DOH | Department of Health (PH) |
| DPN | Diabetic Peripheral Neuropathy |
| EMA | Exponential Moving Average |
| HF | HuggingFace |
| JWT | JSON Web Token |
| LTO | License To Operate |
| OTG | On-The-Go (USB) |
| PNG | Portable Network Graphics |
| PSGC | Philippine Standard Geographic Code |
| RLS | Row-Level Security |
| ROI | Region of Interest |
| RPC | Remote Procedure Call |
| STM32 | ST Microelectronics 32-bit MCU |
| TIFF | Tagged Image File Format |
| UVC | USB Video Class |
| VoSPI | Video over SPI (Lepton output) |
| YOLO | You Only Look Once (object detector) |

---

# Section 2.1 — System Architecture (7 figures)

All node labels in this section follow the strict label rule (1–3 words,
single line, no captions, no version numbers, no parenthetical sub-text).
Where a parameter or value is needed for accuracy, put it in the figure's
**Description** field — that text goes into the thesis chapter body, not
into the diagram.

## Fig 2.1.1 — System Overview

**Type:** block diagram (top-to-bottom).
**Purpose:** show the six tiers of the LumenAI system and the direction
of data flow between them. The chapter prose explains that data
originates as Y16 thermal frames at the sensor, flows up through the
phone, and fans out to Supabase + the HuggingFace classifier.

Boxes (rectangles unless noted):
- Group `Hardware` containing rectangles `Lepton` and `PureThermal`.
- Group `Firmware` containing rectangles `Camera FW` and `UVC Module`.
- Group `Mobile App` containing rectangles `Expo Router`, `Stores`, `Lib`.
- Group `Web Admin` containing rectangles `Routes`, `Admin RPC`.
- Group `Cloud` containing rectangles `Postgres`, `Auth`, `Storage`, `Edge Fns`, `RPCs`.
- External hexagon `HF Spaces`.

Arrows (solid):
- `Hardware` → `Firmware`, edge label `USB`.
- `Firmware` → `Mobile App`, edge label `JNI`.
- `Mobile App` ⇄ `Cloud`, edge label `HTTPS`.
- `Web Admin` ⇄ `Cloud`, edge label `HTTPS`.
- `Mobile App` → `HF Spaces`, edge label `HTTPS`.

## Fig 2.1.2 — Hardware Tier

**Type:** block diagram (left-to-right).
**Purpose:** physical signal chain from sensor to host. Reference
specs (state in the chapter prose, NOT in the diagram): Lepton 3.5 is
a 160×120 long-wave-IR radiometric core; it streams raw pixel data over
the Video-over-SPI (VoSPI) protocol and is configured over an I²C
control channel (CCI). The PureThermal Mini Pro carries an STM32F412
microcontroller running the open-source PureThermal firmware that
ingests VoSPI and re-publishes the frames as a USB Video Class (UVC)
device, which the Android phone consumes through USB-OTG.

Boxes (rectangles, single-keyword labels):
- `Lepton`
- `STM32`
- `UVC`
- `USB-OTG`
- `Phone`
- `ESP32` (dashed border, future hardware path)

`VoSPI` and `I²C` are NOT boxes — they appear only as edge labels on
the Lepton ↔ STM32 lines. `UVC` is its own box because it's the
externally-visible USB endpoint that the phone enumerates.

Arrows:
- `Lepton` → `STM32` solid, edge label `VoSPI`.
- `Lepton` ⇄ `STM32` dashed, edge label `I²C`.
- `STM32` → `UVC` solid.
- `UVC` → `USB-OTG` solid.
- `USB-OTG` → `Phone` solid, edge label `USB`.
- `ESP32` → `Phone` dashed, edge label `BLE`.

## Fig 2.1.3 — Firmware / Native UVC Pipeline

**Type:** block diagram (left-to-right pipeline, then fork).
**Purpose:** the per-frame processing pipeline implemented in
`UVCModule.kt` on the Android side. The chapter prose explains that
the camera-side firmware (Lepton + PureThermal STM32) emits raw Y16
frames; this figure picks up where the camera-side stops, inside the
Android app.

Boxes (single-keyword rectangles, in pipeline order):
- `Y16` (parallelogram, input)
- `Median`
- `EMA`
- `CLAHE`
- `Upscale`
- `Unsharp`
- `Emissivity`
- `Palette`

Then a fork into output parallelograms:
- `Live Preview`
- `3-Slot PNG`
- `TIFF`
- `CSV`
- `Masked CSV`

Arrows: solid pipeline `Y16` → `Median` → `EMA` → `CLAHE` → `Upscale`
→ `Unsharp` → `Emissivity` → `Palette`, then five solid arrows from
`Palette` fanning out to each output parallelogram (`Live Preview`,
`3-Slot PNG`, `TIFF`, `CSV`, `Masked CSV`). Wrap the pipeline in a
labelled rectangle `Native Side`.

## Fig 2.1.4 — Mobile App Tier

**Type:** block diagram (clustered).
**Purpose:** sub-systems inside the React Native app. Use sub-group
labels of 1–3 words each.

Group container `RN App` containing:

- Sub-group `Expo Router` with rectangles `Auth`, `Clinic`, `Patient`, `Offline`.
- Sub-group `Stores` with rectangles `Auth Store`, `Session Store`, `DPN Store`, `ROI Store`.
- Sub-group `Thermal Lib` with rectangles `UVC Camera`, `Capture`, `Bundle Store`.
- Sub-group `DPN Lib` (single rectangle `DPN API`).
- Sub-group `Profile Lib` with rectangles `Avatar Upload`, `Crop Modal`.
- Sub-group `Admin Lib` with rectangles `Clinic Approval`, `Tickets`.

External boxes (outside the group):
- `UVC Module` (hexagon — the native module)
- `Supabase` (cylinder)
- `HF Spaces` (hexagon)

Arrows:
- `UVC Camera` → `UVC Module` solid, edge label `JNI`.
- `Stores` → `Supabase` solid, edge label `HTTPS`.
- `DPN API` → `HF Spaces` solid, edge label `HTTPS`.

## Fig 2.1.5 — Cloud Backend Tier

**Type:** block diagram (clustered).
**Purpose:** what lives inside the Supabase project.

Group container `Supabase` containing:

- Sub-group `Postgres` with cylinders `profiles`, `clinics`, `patients`,
  `sessions`, `captures`, `results`, `tickets`, `resets`, `access`.
- Sub-group `Auth` with rectangle `auth.users`.
- Sub-group `Storage` with cylinders `avatars`, `images`, `csv`.
- Sub-group `Edge Fns` with hexagons `Clinic Signup`, `Auth Redirect`, `Set Password`.
- Sub-group `RPCs` with hexagons `Reset Request`, `Submit Ticket`,
  `Approve Clinic`, `Reject Clinic`, `Resolve Ticket`, `Request Access`,
  `Respond Access`, `Revoke Access`, `Submit Session`, `Find Patient`.

External boxes (outside the group):
- `Mobile App` (rectangle, top).
- `Web Admin` (rectangle, top).

Arrows:
- `Mobile App` → `RPCs` solid, edge label `RPC`.
- `Web Admin` → `RPCs` solid, edge label `RPC`.
- `Web Admin` → `Set Password` solid, edge label `Invoke`.

## Fig 2.1.6 — Web Admin Tier

**Type:** block diagram (top-to-bottom).
**Purpose:** structure of the Next.js admin console.

Group container `Web Admin` containing rectangles:
- `Root`
- `Layout`
- `Login`
- `Dashboard`
- `Clinics`
- `Resets`
- `Tickets`
- `Auth Hook`
- `Admin RPC`

External hexagon `Supabase`.

Arrows:
- `Root` → `Dashboard` solid (redirect).
- `Layout` → `Auth Hook` solid (gate).
- `Auth Hook` → `Supabase` solid, edge label `HTTPS`.
- `Admin RPC` → `Supabase` solid, edge label `HTTPS`.

## Fig 2.1.7 — External AI Tier

**Type:** block diagram (left-to-right with feedback loop).
**Purpose:** how the DPN classifier is hosted and accessed. The chapter
prose names the model versions (YOLOv11, sklearn fusion) and the cold-
start polling parameters (every 5 s, max 60 s); none of those numbers
appear inside the diagram.

Boxes:
- `Mobile App` (rectangle, left)
- Group `HF Spaces` (hexagon, centre) containing `YOLO` and `Fusion`.
- `Health Poll` (diamond)

Arrows:
- `Mobile App` → `Health Poll` solid, edge label `Health`.
- `Health Poll` → itself dashed, edge label `Wait` (cold-start retry loop).
- `Health Poll` → `HF Spaces` solid, edge label `Predict`.
- `HF Spaces` → `Mobile App` solid, edge label `Result`.
- Inside the group: `YOLO` → `Fusion` solid.

---

# Section 2.4 — Software Prototype Design (no diagrams; one subsection per major screen)

This section has **no figures** — it is text only. Instead of one
subsection per screen file, the thesis groups screens by **major
destination**: each subsection covers one primary user surface and lists
the helper / detail screens that live under it. The result is **10
subsections** (2.4.1 → 2.4.10) covering all ~63 screens in the codebase.

For each entry below, render a thesis subsection with this exact
template (Times New Roman, single page, ≤ 8 short lines):

```
### 2.4.N — <Major Screen Title>
**Includes:** <comma-list of constituent screen names>
**Files:** `path1`, `path2`, ... (markdown-formatted code spans)
**Purpose:** <1–2 sentences>
**Features:**
- <bullet 1>
- <bullet 2>
- ...  (4–6 bullets — describe the area, not each screen individually)
**Data:** <Supabase | AsyncStorage | Native UVC | HF Spaces | Static | comma-list>
```

Do not invent new screens. The 10 entries below are the source of truth.
Use the subsection number printed in front of each entry.

---

**2.4.1 — Onboarding & Authentication**
- Includes: Root Redirect, Mode Select, Login, Register (Patient form, Clinic form), Forgot Password, Reset-Password deep-link sink, Update Password, Account Activated, Clinic Pending Approval.
- Files: `app/index.tsx`, `app/mode-select.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(auth)/forgot-password.tsx`, `app/(auth)/reset-password.tsx`, `app/(auth)/update-password.tsx`, `app/(auth)/account-activated.tsx`, `app/(auth)/clinic-pending-approval.tsx`.
- Purpose: from cold-start the user lands on Mode Select to pick Online or Offline; the Online path then runs through the full account-onboarding and password-recovery surfaces — including the email-deep-link sinks that close the loop on email confirmation and password resets.
- Features: Mode Select shows two cards "Go Online" → `(auth)/login` and "Work Offline" → `(offline)/live-feed` with a clinical disclaimer footer; the root redirect reads `useAuthStore.initialised` and routes by role; Auth screens use a floating-label `Input` with PSGC region/province/city/barangay cascade and DOH-LTO mask for clinic sign-up; Login enforces a 5-fail / 30-s lockout and a clinic-approval gate that signs out `pending` / `rejected` clinics with the rejection reason; patient password reset uses `auth.resetPasswordForEmail` while locked-out clinics see "contact your admin" copy; email-confirm and recovery deep-links route through `lumenai://auth/...` and call `auth.setSession`; freshly registered clinics land on Clinic Pending Approval showing their `clinic_code`.
- Data: Supabase Auth · `profiles` · `clinics` · `clinic-signup` Edge Function · Static (mode-select copy).

**2.4.2 — Role Home & Session History**
- Includes: Clinic Home, Patient Home, Clinic History, Patient History.
- Files: `app/(clinic)/index.tsx`, `app/(patient)/index.tsx`, `app/(clinic)/history.tsx`, `app/(patient)/history.tsx`.
- Purpose: the role-aware dashboard a user lands on after sign-in, plus the standalone full-list history that's reachable from it.
- Features: profile hero (avatar + greeting + name + clinic_code or patient_code + email + contact); Today / This Month / All filter chips; counts strip (total / positive / negative) derived from the filtered list; SessionCard list bound to `useFocusEffect` so admin-side resolutions show on return; tap a card → bundle viewer (2.4.5); patient home shows a "Submit to Clinic" badge on unsubmitted sessions.
- Data: Supabase (`screening_sessions` + `classification_results`).

**2.4.3 — Thermal Capture**
- Includes: Pairing (camera connect), Live Feed (bilateral capture), Patient Details (post-capture form), Clinical Data (vitals).
- Files: `app/(clinic)/pairing.tsx`, `app/(clinic)/live-feed.tsx`, `app/(patient)/live-feed.tsx`, `app/(clinic)/patient-details.tsx`, `app/(patient)/patient-details.tsx`, `app/(clinic)/clinical-data.tsx`.
- Purpose: the end-to-end capture surface — connect the camera, frame the feet, capture the bilateral bundle, and record the patient + vitals metadata.
- Features: USB-host UVC connect with permission flow on Pairing; live preview with palette + on-screen Hot / Cold / All-3 crosshairs bounded to the framing rectangle; Raw / Enhanced toggle that selects between native 160×120 and 320×240 (CLAHE + unsharp + emissivity-corrected); draggable ROI rectangle; capture-left then capture-right two-step yielding the symmetric 3-slot bundle (full, cropped or null, isolated); post-capture form persists patient demographics, slot uploads, and `feed_mode` to `thermal_captures`; Clinical Data captures BP / HR / glucose / HbA1c / angiosome notes with range validation.
- Data: Native UVC · Supabase (`thermal_captures`, `patient_vitals`, `screening_sessions`, `thermal-images` / `thermal-csv` storage).

**2.4.4 — AI Assessment & Result**
- Includes: Assessment (server-waking poll + DPN call), DPN Result, Assess Bundle (re-analyse a saved bundle), Import (CSV / image into the same pipeline).
- Files: `app/(clinic)/assessment.tsx`, `app/(clinic)/dpn-result.tsx`, `app/(clinic)/assess-bundle.tsx`, `app/(clinic)/import.tsx`, `app/(patient)/import.tsx`.
- Purpose: post-capture AI inference and result presentation — runs the HF Spaces DPN classifier, persists the response, and renders the verdict UI.
- Features: server-waking retry polls `GET /health` every 5 s up to 60 s with a breathing progress indicator; `dpnApi.scanPatient()` POSTs the masked CSVs to the FastAPI endpoint; DPN Result shows a compact verdict card, per-foot Diabetic / Control bars, YOLO / sklearn breakdown, per-angiosome temperature pills, and an asymmetry block (mean / max Δ°C, threshold pill); Assess Bundle hydrates an existing `classification_results` row when revisited, otherwise re-runs the full sign → classify → persist pipeline; Import accepts an external CSV / image and feeds the same DPN pipeline so legacy data can be analysed.
- Data: HF Spaces FastAPI (`catnipp9/transistors-thermal-dpn-ai`) · Supabase (`classification_results`).

**2.4.5 — Bundle Viewer**
- Includes: Bundle Detail (clinic + patient online), CSV Viewer (clinic + patient), Processed Live View (legacy orphan).
- Files: `app/(clinic)/bundle-detail.tsx`, `app/(patient)/bundle-detail.tsx`, `app/(clinic)/csv-viewer.tsx`, `app/(patient)/csv-viewer.tsx`, `app/(clinic)/processed-live.tsx`, `app/(patient)/processed-live.tsx` (the last two are orphan / slated for deletion).
- Purpose: the post-save "look at a session" surface — renders the 3-image row, stats, AI result, and the temperature grid from the masked CSV.
- Features: shared `OnlineBundleDetailScreen` with `feed_mode`-driven labels (RAW / RAW · CROPPED / ISOLATED  vs  ENHANCED / ENHANCED · CROPPED / ISOLATED); slot 2 hides whenever `processedUri` is null; circular header avatar; UUID early-return guard; CSV Viewer renders the masked CSV as an HTML table; signed Storage URLs batched per session.
- Data: Supabase + signed Storage URLs (`thermal-images`, `thermal-csv`).

**2.4.6 — Patient Roster (Clinic only)**
- Includes: Patient Select, Register Patient, Manage Patients.
- Files: `app/(clinic)/patient-select.tsx`, `app/(clinic)/register-patient.tsx`, `app/(clinic)/manage-patients.tsx`.
- Purpose: clinic-side patient management — pick a patient before a capture, register a new one, or revoke access to existing patients.
- Features: search by `patient_code` via the `find_patient_by_code` RPC; pick-from-roster list backed by `clinic_access_relationships`; Register Patient creates a `patients` + `profiles` pair scoped to the clinic with auto-generated patient code; Manage Patients calls `revoke_clinic_access` per row; standard empty / loading / error states.
- Data: Supabase (`patients`, `profiles`, `clinic_access_relationships`) · RPCs.

**2.4.7 — Profile, Settings & Support**
- Includes: Profile (Clinic), Profile (Patient), Settings, Privacy Policy, Terms of Service, Contact Support, Feedback / Tickets, Request Password Reset (clinic in-Settings).
- Files: `app/(clinic)/profile.tsx`, `app/(patient)/profile.tsx`, `app/(clinic)/settings.tsx`, `app/(patient)/settings.tsx`, `app/(clinic)/privacy-policy.tsx`, `app/(patient)/privacy-policy.tsx`, `app/(clinic)/terms-of-service.tsx`, `app/(patient)/terms-of-service.tsx`, `app/(clinic)/contact-support.tsx`, `app/(patient)/contact-support.tsx`, `app/(clinic)/feedback.tsx`, `app/(patient)/feedback.tsx`, `components/feedback/FeedbackScreen.tsx` (shared), `app/(clinic)/request-password-reset.tsx`.
- Purpose: per-user account surface — Profile holds avatar + contact + deactivate; Settings is the hub that links to legal text, support, the Feedback / Tickets flow, and (for clinic operators) the in-Settings password-reset request.
- Features: tap-to-change avatar opens the photo picker → `CropAvatarModal` (pan + pinch + circular mask) → `expo-image-manipulator` resize → upload to `avatars` Storage at `profiles/<auth.uid()>/avatar.jpg` (RLS-gated) → `profiles.avatar_url` update; success-message timer cleared on unmount via `useRef` cleanup; deactivate-account flow destructures `{ error }` and surfaces `Alert.alert("Could not deactivate", error.message)` rather than silently signing out; Settings lists Feedback / Tickets, Request Password Reset (clinic only), Privacy, Terms, Contact, Sign Out; Feedback uses the shared `FeedbackScreen` (Category picker + Subject + Body) → `submit_support_ticket` RPC, with a "My Tickets" list showing status pills (Open / In Progress / Resolved) and tap-to-expand admin response, refreshed via `useFocusEffect`; Request Password Reset (logged-in clinic) calls the `submit_password_reset_request` RPC; Privacy / Terms / Contact are scrollable static pages.
- Data: Supabase (`profiles`, `avatars` storage, RPCs `submit_support_ticket`, `submit_password_reset_request`; `support_tickets` SELECT) · Static (legal text).

**2.4.8 — Sharing & Sync**
- Includes: Sync (clinic inbox), Sync (patient inbox), Submit to Clinic.
- Files: `app/(clinic)/sync.tsx`, `app/(patient)/sync.tsx`, `app/(patient)/submit-to-clinic.tsx`.
- Purpose: cross-role data-sharing surface — clinics request access to a patient's history, patients accept / reject / revoke, and patients submit a self-screening to a clinic by code.
- Features: clinic Sync shows incoming `data_requests` with accept / reject (the secondary `data_requests` insert destructures `error` and `console.warn`s on failure); patient Sync shows pending `clinic_access_relationships` with Accept / Reject buttons (`respond_to_clinic_access` RPC) and an accepted-clinics section with Revoke (`revoke_clinic_access`); Submit to Clinic accepts a clinic code, validates format, and inserts a `clinic_access_relationships` row via `submit_session_to_clinic` so the chosen clinic can read the session.
- Data: Supabase RPCs (`request_clinic_access`, `respond_to_clinic_access`, `revoke_clinic_access`, `submit_session_to_clinic`).

**2.4.9 — Offline Guest Flow**
- Includes: Live Feed (offline), Patient Details (offline), Bundle Detail (offline), CSV Viewer (offline), History (offline), Save (legacy orphan).
- Files: `app/(offline)/live-feed.tsx`, `app/(offline)/patient-details.tsx`, `app/(offline)/bundle-detail.tsx`, `app/(offline)/csv-viewer.tsx`, `app/(offline)/history.tsx`, `app/(offline)/save.tsx` (orphan, slated for deletion).
- Purpose: a no-sign-in capture flow that mirrors the online surface but persists everything to the local AsyncStorage `ThermalBundle` store on the device.
- Features: same shared `ThermalLiveFeedScreen` as the online roles; post-capture form persists via `bundleStorage.saveBundle` writing AsyncStorage + best-effort device PNG / CSV; null slot 2 propagates when no ROI was drawn; History reads `getAllBundles()`; Bundle Detail uses the shared `BundleDetailScreen` with the same RAW / ENHANCED label switch via `bundle.feed_mode`; CSV Viewer renders the locally-stored masked CSV.
- Data: AsyncStorage · Native UVC.

**2.4.10 — Web Admin Console (Next.js)**
- Includes: Web root redirect, Admin Login, Admin Dashboard, Clinics Queue, Password Resets Queue, Tickets Inbox, Email Verified bridge, Reset Password bridge.
- Files: `web/app/page.tsx`, `web/app/admin/login/page.tsx`, `web/app/admin/page.tsx`, `web/app/admin/clinics/page.tsx`, `web/app/admin/password-resets/page.tsx`, `web/app/admin/tickets/page.tsx`, `web/app/auth/verified/page.tsx`, `web/app/auth/reset-password/page.tsx`.
- Purpose: the admin-only Next.js console that sits beside the same Supabase project — handles clinic vetting, mediated password resets, and support tickets — plus the two web pages that bridge mobile email deep-links.
- Features: `web/app/page.tsx` server-component `redirect("/admin")`; Admin Login does `signInWithPassword` + a post-login role check that signs out non-admins; Dashboard shows four count tiles (Pending Clinics / Password Resets / Open Tickets / In-Progress Tickets) linking to filtered queues; Clinics Queue has Approve and Reject-with-reason modals calling `admin_approve_clinic` / `admin_reject_clinic`; Password Resets has a Set-Password modal that invokes the `admin-set-clinic-password` Edge Function (caller JWT validated, admin role checked before the privileged update); Tickets Inbox is a two-pane list + detail with Mark in Progress and Resolve-with-response (`admin_resolve_ticket` RPC); the LumenAI logo + thermal background motif (cool teal blob, warm amber/rose blob, isotherm rings, plantar-foot silhouettes) is shared across all admin pages; the two `web/app/auth/*` routes forward email-link tokens to `lumenai://auth/...` deep-links.
- Data: Supabase Auth + `profiles` (admin-role gate) · RPCs · `admin-set-clinic-password` Edge Function · Static (auth bridges).

---
# Section 2.6 — Process Charts (20 figures)

All node labels in this section follow the strict label rule (1–3 words,
single line, no captions, no version numbers, no parenthetical sub-text).
Where a parameter, threshold, or RPC argument is needed for accuracy,
put it in the figure's prose **Description** field — that text goes into
the thesis chapter body, not into the diagram. Each flowchart starts
with a rounded rectangle `Start` and ends with `End`, `Error`, or `Cancel`.

## Fig 2.6.1 — Patient Sign-Up

Boxes (top-to-bottom):
1. `Start` (rounded)
2. `Form` (parallelogram — input)
3. `Validate` (diamond)
4. `Errors` (rectangle, on `no` from 3) → loop back to 2
5. `Sign Up` (hexagon — `auth.signUp`)
6. `Profile` (cylinder — `profiles` row)
7. `Email Sent` (rectangle)
8. `Click Link` (diamond)
9. `Activate` (rectangle)
10. `Set Session` (hexagon)
11. `Home` (rectangle)
12. `End` (rounded)

Failure branch from step 5: `Sign Up Error` rectangle → `Error` (rounded, red).

## Fig 2.6.2 — Clinic Sign-Up

Boxes:
1. `Start`
2. `Form` (parallelogram)
3. `LTO Valid` (diamond)
4. `Errors` (on `no`) → loop back to 2
5. `Edge Fn` (hexagon — `clinic-signup`)
6. `Clinic Row` (cylinder — `clinics`, status `pending`)
7. `Show Code` (rectangle)
8. `Pending` (rectangle — pending-approval screen)

Wrap steps 9–12 in a labelled rectangle `Admin Web`:
9. `Approve RPC` (hexagon — `admin_approve_clinic`)
10. `Approved?` (diamond)
11. `End` (rounded, on `yes`)
12. `Rejected` (rounded, on `no`)

## Fig 2.6.3 — Sign-In

Boxes:
1. `Start`
2. `Credentials` (parallelogram)
3. `Lockout?` (diamond)
4. `Wait` (rectangle, on `yes`) → `End`
5. `Sign In` (hexagon — `signInWithPassword`)
6. `Auth OK?` (diamond)
7. `Increment` (rectangle, on `no`) → loop back to 2
8. `Get Profile` (hexagon)
9. `Admin?` (diamond)
10. `Sign Out` (hexagon, on `yes`)
11. `Block Admin` (rectangle) → `Error`
12. `Clinic?` (diamond, on `no` from 9)
13. `Approval` (hexagon, on `yes` — `fetchClinicApproval`)
14. `Approved?` (diamond)
15. `Sign Out` (hexagon, on `no`)
16. `Block Clinic` (rectangle) → `Blocked` (rounded)
17. `Route Home` (rectangle, on `yes` from 14 OR on `no` from 12 — patient path)
18. `End` (rounded)

## Fig 2.6.4 — Patient Password Reset

Boxes:
1. `Start`
2. `Email` (parallelogram)
3. `Reset Email` (hexagon — `auth.resetPasswordForEmail`)
4. `Email Sent` (rectangle)
5. `Click Link` (diamond)
6. `Web Bridge` (rectangle)
7. `Deep-link` (rectangle)
8. `Set Session` (hexagon)
9. `Update Form` (rectangle)
10. `New Password` (parallelogram)
11. `Update User` (hexagon — `auth.updateUser`)
12. `Login` (rectangle)
13. `End`

## Fig 2.6.5 — Clinic Password Reset

Two side-by-side groups:

Group `Clinic Mobile`:
1. `Start`
2. `Settings` (rectangle)
3. `Notes` (parallelogram)
4. `Reset RPC` (hexagon — `submit_password_reset_request`)
5. `Reset Row` (cylinder — `clinic_password_reset_requests`, status `pending`)
6. `Wait` (rectangle) → `End`

Group `Admin Web`:
7. `Reset Queue` (rectangle)
8. `Phone Verify` (rectangle)
9. `New Password` (parallelogram)
10. `Edge Fn` (hexagon — `admin-set-clinic-password`)
11. `JWT OK` (diamond)
12. `403` (rounded, on `no`)
13. `Update User` (hexagon — `auth.admin.updateUserById`)
14. `Approved` (cylinder — request row updated)
15. `Tell Clinic` (rectangle) → `End`

## Fig 2.6.6 — Inactivity Timeout

Boxes:
1. `Start`
2. `Hook` (rectangle — `useInactivityTimeout`)
3. `Touch?` (diamond)
4. `Reset Timer` (rectangle, on `yes`) → loop back to 3
5. `Sign Out` (hexagon, on `no` after 30 min)
6. `Login` (rectangle)
7. `End`

## Fig 2.6.7 — Bilateral Capture

Boxes:
1. `Start`
2. `Connected?` (diamond)
3. `Connect` (rectangle, on `no`) → see Fig 2.6.9 → loop back to 2
4. `Live Preview` (rectangle, on `yes`)
5. `Draw ROI` (parallelogram)
6. `Capture Left` (rectangle)
7. `Buffer Left` (rectangle)
8. `Capture Right` (rectangle)
9. `Buffer Right` (rectangle)
10. `Process` (hexagon — `processCapture`)
11. `Bundle` (cylinder — store)
12. `Details` (rectangle — navigate)
13. `End`

Cancel branch (dashed, any step): `Discard` → `Cancel` (rounded).

## Fig 2.6.8 — Foot Isolation

Boxes:
1. `Start`
2. `Matrix` (parallelogram)
3. `Crop?` (diamond)
4. `Moat` (rectangle, on `yes`)
5. `Threshold` (rectangle)
6. `Largest BFS` (rectangle)
7. `Fill Holes` (rectangle)
8. `Re-clip` (rectangle)
9. `Mask` (parallelogram, output)
10. `Otsu` (rectangle, on `no` from 3)
11. `Largest BFS` (rectangle)
12. `Mask` (parallelogram, output — same shape as 9)
13. `End`

## Fig 2.6.9 — UVC Connect

Boxes:
1. `Start`
2. `Enumerate` (rectangle)
3. `Found?` (diamond)
4. `No Device` (rectangle, on `no`) → `Error`
5. `Permission?` (diamond, on `yes`)
6. `Request` (rectangle, on `no`)
7. `Granted?` (diamond)
8. `Denied` (rectangle, on `no`) → `Error`
9. `Connect` (hexagon, on `yes`)
10. `Stream` (rectangle)
11. `Frames` (rectangle)
12. `End` (rounded — connected)

## Fig 2.6.10 — DPN Classification

Boxes:
1. `Start`
2. `Health` (hexagon — `GET /health`)
3. `Ready?` (diamond)
4. `Wait` (rectangle, on `no`) → loop back to 2
5. `Predict` (hexagon — `POST /predict`, on `yes`)
6. `Foot Valid?` (diamond)
7. `Unknown` (rectangle, on `no`) → `End`
8. `Result` (parallelogram, on `yes`)
9. `Save Result` (cylinder — `classification_results`)
10. `Render` (rectangle — DPN result screen)
11. `End`

Timeout branch: dashed `Timeout` → `Error`.

## Fig 2.6.11 — Save Online

Boxes:
1. `Start`
2. `Slots OK?` (diamond)
3. `Errors` (rectangle, on `no`) → `Error`
4. `Upload Raw` (cylinder)
5. `Slot 2?` (diamond)
6. `Upload Cropped` (cylinder, on `yes`)
7. `Upload Iso` (cylinder)
8. `Upload CSV` (cylinder)
9. `Insert Capture` (cylinder — `thermal_captures`)
10. `Update Session` (cylinder — `screening_sessions`)
11. `End`

## Fig 2.6.12 — Save Offline

Boxes:
1. `Start`
2. `Both Feet?` (diamond)
3. `Errors` (rectangle, on `no`) → `Error`
4. `Save Bundle` (hexagon — `bundleStorage.saveBundle`)
5. `AsyncStorage` (cylinder)
6. `Device Files` (cylinder)
7. `Code` (rectangle)
8. `End`

## Fig 2.6.13 — Submit to Clinic

Boxes:
1. `Start`
2. `Code` (parallelogram)
3. `Format OK?` (diamond)
4. `Errors` (rectangle, on `no`) → loop back to 2
5. `Submit RPC` (hexagon — `submit_session_to_clinic`)
6. `Active?` (diamond)
7. `Not Found` (rectangle, on `no`) → `Error`
8. `Access Row` (cylinder — `clinic_access_relationships`)
9. `Mark Submitted` (cylinder — `screening_sessions`)
10. `Toast` (rectangle)
11. `End`

## Fig 2.6.14 — Clinic Access

Boxes (use lanes for `Clinic`, `Patient`, `System`):
1. `Start` (Clinic lane)
2. `Request` (rectangle)
3. `Request RPC` (hexagon — `request_clinic_access`)
4. `Pending` (cylinder)
5. `Inbox` (rectangle, Patient lane)
6. `Decision` (diamond)
7. `Respond Accept` (hexagon, on `yes` — `respond_to_clinic_access`)
8. `Accepted` (cylinder)
9. `Respond Reject` (hexagon, on `no`)
10. `Rejected` (cylinder) → `End`
11. `Revoke?` (diamond, after `Accepted`)
12. `Revoke RPC` (hexagon, on `yes` — `revoke_clinic_access`)
13. `Revoked` (cylinder)
14. `End`

## Fig 2.6.15 — Submit Ticket

Boxes:
1. `Start`
2. `Form` (parallelogram)
3. `Lengths OK?` (diamond)
4. `Errors` (rectangle, on `no`) → loop back to 2
5. `Submit RPC` (hexagon — `submit_support_ticket`)
6. `Ticket Row` (cylinder — `support_tickets`, status `open`)
7. `Toast` (rectangle)
8. `My Tickets` (rectangle)
9. `Refetch` (rectangle — on focus)
10. `List RPC` (hexagon — `listMyTickets`)
11. `Render` (rectangle)
12. `End`

## Fig 2.6.16 — Approve / Reject Clinic

Boxes:
1. `Start`
2. `Queue` (rectangle)
3. `Filter` (rectangle)
4. `Pick Row` (parallelogram)
5. `Action` (diamond)
6. `Approve Modal` (rectangle, on `Approve`)
7. `Approve RPC` (hexagon — `admin_approve_clinic`)
8. `Reject Modal` (rectangle, on `Reject`)
9. `Reject RPC` (hexagon — `admin_reject_clinic`)
10. `Updated` (cylinder)
11. `Reload` (rectangle)
12. `End`

## Fig 2.6.17 — Set Clinic Password

Boxes:
1. `Start`
2. `Queue` (rectangle)
3. `Pick Row` (parallelogram)
4. `Phone Verify` (rectangle)
5. `New Password` (parallelogram)
6. `Edge Fn` (hexagon — `admin-set-clinic-password`)
7. `JWT OK?` (diamond)
8. `401` (rounded, on `no`)
9. `Admin?` (diamond, on `yes`)
10. `403` (rounded, on `no`)
11. `Match?` (diamond, on `yes`)
12. `400` (rounded, on `no`)
13. `Update User` (hexagon — `auth.admin.updateUserById`, on `yes`)
14. `Approved` (cylinder — request row)
15. `Banner` (rectangle)
16. `End`

## Fig 2.6.18 — Resolve Ticket

Boxes:
1. `Start`
2. `Inbox` (rectangle)
3. `Pick Ticket` (parallelogram)
4. `In Progress?` (diamond)
5. `Mark Progress` (hexagon, on `yes` — `admin_resolve_ticket`)
6. `Response` (parallelogram, on `no` from 4)
7. `Length OK?` (diamond)
8. `Errors` (rectangle, on `no`) → loop back to 6
9. `Resolve RPC` (hexagon, on `yes` — `admin_resolve_ticket`)
10. `Updated` (cylinder)
11. `Reload` (rectangle)
12. `End`

## Fig 2.6.19 — Avatar Upload

Boxes:
1. `Start`
2. `Tap Avatar` (rectangle)
3. `Source` (diamond)
4. `Camera` (hexagon, on `Camera`)
5. `Library` (hexagon, on `Library`)
6. `Crop Modal` (rectangle)
7. `Confirm` (parallelogram)
8. `Manipulate` (hexagon — `expo-image-manipulator`)
9. `Upload` (hexagon — Storage)
10. `Update URL` (hexagon — `profiles`)
11. `Render` (rectangle)
12. `End`

Cancel branch from step 6: dashed → `Cancel` (rounded).

## Fig 2.6.20 — Account Deactivation

Boxes:
1. `Start`
2. `Confirm Modal` (rectangle)
3. `Confirmed?` (diamond)
4. `Cancel` (rounded, on `no`)
5. `Update Profile` (hexagon, on `yes`)
6. `Update OK?` (diamond)
7. `Show Error` (rectangle, on `no`) → `Error`
8. `Sign Out` (hexagon, on `yes`)
9. `Login` (rectangle)
10. `End`

---

# Section 2.7 — Database (1 figure)

Only one figure in this section: a single Entity Relationship Diagram
(ERD) of the LumenAI Postgres schema. No process charts, no other
diagrams.

## Fig 2.7.1 — Entity Relationship Diagram

**Type:** ERD (entity boxes + cardinality lines).
**Purpose:** show every Postgres table in the LumenAI schema and the
foreign-key relationships between them. Column listings stay in the
chapter prose (a separate text table in the Methodology body) — this
figure renders **table-name boxes only** with FK arrows, to comply with
the strict node-label rule.

**Layout:** four labelled groups, left-to-right.

Group `Reference` (PSGC lookup, left side, dashed border to mark "seed
data, not user-managed"):
- `ph_regions`
- `ph_provinces`
- `ph_cities`
- `ph_barangays`

Group `Identity` (centre-left):
- `auth.users` (dashed border — managed by Supabase Auth, not directly written)
- `profiles`
- `clinics`

Group `Sessions` (centre-right):
- `patients`
- `screening_sessions`
- `thermal_captures`
- `patient_vitals`
- `classification_results`

Group `Workflow` (right side):
- `clinic_access_relationships`
- `clinic_password_reset_requests`
- `support_tickets`
- `data_requests`
- `system_config`

**Cardinality arrows** (use crow's-foot notation; the `1` end is a single
bar, the `N` end is a crow's-foot fork):

PSGC chain:
- `ph_regions` 1 — N `ph_provinces`
- `ph_provinces` 1 — N `ph_cities`
- `ph_cities` 1 — N `ph_barangays`

Identity:
- `auth.users` 1 — 1 `profiles` (FK `profiles.id`)
- `profiles` N — 1 `clinics` (FK `profiles.clinic_id`, optional — clinic operators only)
- `clinics` 1 — 1 `profiles` (FK `clinics.owner_profile_id`)
- `clinics` N — 1 `ph_regions` (FK `region_code`)
- `clinics` N — 1 `ph_provinces` (FK `province_code`, optional)
- `clinics` N — 1 `ph_cities` (FK `city_code`)
- `clinics` N — 1 `ph_barangays` (FK `barangay_code`)

Sessions:
- `patients` N — 1 `clinics` (FK `clinic_id`)
- `patients` N — 1 `profiles` (FK `profile_id`)
- `screening_sessions` N — 1 `patients` (FK `patient_id`)
- `screening_sessions` N — 1 `clinics` (FK `clinic_id`)
- `screening_sessions` N — 1 `profiles` (FK `operator_id`)
- `screening_sessions` N — 1 `profiles` (FK `subject_profile_id`)
- `thermal_captures` N — 1 `screening_sessions` (FK `session_id`)
- `patient_vitals` N — 1 `screening_sessions` (FK `session_id`)
- `classification_results` N — 1 `screening_sessions` (FK `session_id`)

Workflow:
- `clinic_access_relationships` N — 1 `clinics` (FK `clinic_id`)
- `clinic_access_relationships` N — 1 `profiles` (FK `patient_profile_id`)
- `clinic_password_reset_requests` N — 1 `profiles` (FK `clinic_profile_id`, ON DELETE CASCADE)
- `clinic_password_reset_requests` N — 1 `profiles` (FK `reviewed_by`, optional)
- `support_tickets` N — 1 `profiles` (FK `submitter_profile_id`, ON DELETE CASCADE)
- `support_tickets` N — 1 `profiles` (FK `resolved_by`, optional)
- `data_requests` N — 1 `profiles` (FK `from_profile_id`)
- `data_requests` N — 1 `profiles` (FK `to_profile_id`)

**Style notes** (apply within Excalidraw):
- Each table is a plain rectangle with the table name as its sole label
  (single line, no column listings inside the box).
- Group containers labelled `Reference`, `Identity`, `Sessions`, `Workflow`.
- FK arrows: solid, right-angle corners, crow's-foot at the N end and a
  single bar at the 1 end. Dashed only for the two reference / external
  nodes (`auth.users`, the four `ph_*` tables — they're seeded once and
  not modified at runtime).
- Use the teal palette (`#0E7A89`) for the `1` end and zinc grey
  (`#52525B`) for the relationship lines themselves.
- Self-references and many-to-many are not present in this schema —
  every relationship is N:1.

---
## Final summary you must emit

After producing every view, list every figure name in a single Markdown
checklist so I can copy-paste it into my thesis figure index:

```
- [ ] Fig 2.1.1_System-Overview
- [ ] Fig 2.1.2_Hardware-Tier
- [ ] Fig 2.1.3_Firmware-UVC-Pipeline
- [ ] Fig 2.1.4_Mobile-App-Tier
- [ ] Fig 2.1.5_Cloud-Backend-Tier
- [ ] Fig 2.1.6_Web-Admin-Tier
- [ ] Fig 2.1.7_External-AI-Tier
- [ ] Sec 2.4.1 – 2.4.10 — Software Prototype Design (10 major-screen subsections, inline; no diagrams)
- [ ] Fig 2.6.1_Patient-SignUp
- [ ] Fig 2.6.2_Clinic-SignUp
- [ ] Fig 2.6.3_SignIn
- [ ] Fig 2.6.4_Patient-PwReset
- [ ] Fig 2.6.5_Clinic-PwReset
- [ ] Fig 2.6.6_Inactivity-Timeout
- [ ] Fig 2.6.7_Bilateral-Capture
- [ ] Fig 2.6.8_Foot-Isolation
- [ ] Fig 2.6.9_UVC-Connect
- [ ] Fig 2.6.10_DPN-Classify
- [ ] Fig 2.6.11_Save-Online
- [ ] Fig 2.6.12_Save-Offline
- [ ] Fig 2.6.13_Submit-To-Clinic
- [ ] Fig 2.6.14_Clinic-Access
- [ ] Fig 2.6.15_Submit-Ticket
- [ ] Fig 2.6.16_Admin-Approve
- [ ] Fig 2.6.17_Admin-Set-Password
- [ ] Fig 2.6.18_Admin-Resolve-Ticket
- [ ] Fig 2.6.19_Avatar-Upload
- [ ] Fig 2.6.20_Account-Deactivate
- [ ] Fig 2.7.1_ERD
```

If anything in this prompt is ambiguous, prefer the simplest interpretation
that fits the drawing rules — do not invent new shapes, do not add new
external systems, and do not split a figure I asked you to draw as one.
