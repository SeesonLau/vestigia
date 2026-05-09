# Chat 2 of 4 — Software Prototype Design (Section 2.4, prose only)

> **How to use this file:** open <https://claude.ai/new>, attach
> this file, and Claude will produce **10 inline Markdown
> subsections** — the Software Prototype Design pages of the thesis
> Methodology chapter. There are **no figures** in this chat (no
> Excalidraw views, no diagrams, no architecture or process charts).
> The other thesis sections (2.1, 2.6, 2.7) live in their own chat
> files; do not work on them here.
>
> Read the whole file once before starting. The expected output is
> plain Markdown text using the exact template below — no extra
> preamble, no closing remarks.

---

## Project context

LumenAI / Vestigia is a React Native + Expo + Supabase mobile
application together with a Next.js admin web console for Diabetic
Peripheral Neuropathy thermal screening. The mobile app and the web
admin together expose roughly 63 distinct screen files; this section
groups them by **major user destination** so the thesis chapter stays
readable.

## Output you must produce in THIS chat

Render Section 2.4 as **10 inline Markdown subsections**, one per
major screen, numbered 2.4.1 through 2.4.10. Use the exact template
shown inside the section spec — same heading style, same field
labels, same order. After the tenth subsection, stop. Do not add a
checklist; do not emit a closing summary; do not produce any
diagrams.

The chapter prose will live in the user's Word/LaTeX document; this
chat is the source for the section's body text.

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

