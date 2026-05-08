# UI Screens Checklist
**Last verified:** 2026-05-08 (full-codebase QA audit @ `main eac6ed3`)

Legend: ✅ Done | 🔄 Partial | ❌ Stub/mock only | N/A not applicable to this screen

---

## Auth

| ID | Screen | File | Built | Real Data | Loading | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-01a | Login | `(auth)/login.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | signInWithPassword, lockout after 5 fails, error mapping, version from `S.app.version` |
| UI-01b | Register (patient) | `(auth)/register.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Role picker, clinic selector, email-confirm flow |
| UI-01c | Register (clinic) | `(auth)/register.tsx` (ClinicForm) | ✅ | ✅ | ✅ | ✅ | N/A | Edge function call; routes to `clinic-pending-approval?clinic_code=...` instead of auto-sign-in |
| UI-01d | Clinic Pending Approval | `(auth)/clinic-pending-approval.tsx` | ✅ | ✅ | N/A | N/A | N/A | New post-signup confirmation showing `clinic_code` + back-to-sign-in |
| UI-01e | Forgot Password (split) | `(auth)/forgot-password.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Patient → `resetPasswordForEmail`; clinic → "contact your admin" copy (locked-out clinics can't authenticate to RPC) |
| UI-01f | Update Password | `(auth)/update-password.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Session guard; deep link handler in `_layout.tsx` |
| UI-01g | Account Activated | `(auth)/account-activated.tsx` | ✅ | ✅ | N/A | N/A | N/A | Email confirm landing → login |

## Clinic

| ID | Screen | File | Built | Real Data | Loading | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-02 | Mode Select | `app/mode-select.tsx` | ✅ | ✅ | N/A | N/A | N/A | Online → login; Offline → offline live-feed |
| UI-03 | Clinic Home | `(clinic)/index.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Profile hero + Today/This Month/All filter + counts strip + SessionCard list. Pulls clinic name + sessions via `useFocusEffect` |
| UI-04 | Live Thermal Capture | `(clinic)/live-feed.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Bilateral capture; Raw vs Enhanced single toggle; crosshair overlays bounded to ROI; emissivity-corrected pipeline; live UVC over PureThermal |
| UI-05 | Patient Details (post-capture) | `components/thermal/PatientDetailsScreen.tsx` (rendered by `(clinic)/patient-details.tsx`) | ✅ | ✅ | ✅ | ✅ | N/A | Full patient form; uploads slot1/slot2/slot3 PNGs + masked CSV via `feed_mode` column |
| UI-06 | Clinical Data | `(clinic)/clinical-data.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Vitals + angiosomes; inserts session, captures, vitals; null-safe slot 2 |
| UI-07 | AI Assessment | `(clinic)/assessment.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Real `dpnApi.scanPatient()`; server-waking retry; breathing progress |
| UI-08 | Assess Bundle | `(clinic)/assess-bundle.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Reads thermal_captures + signed URLs; falls back to `raw_image_path` when slot 2 null in `processed` feed mode |
| UI-09 | DPN Result | `(clinic)/dpn-result.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Compact verdict + slim foot/asymmetry cards + colour-pilled angiosome map |
| UI-10 | Bundle Detail (online) | `components/thermal/OnlineBundleDetailScreen.tsx` (rendered by `(clinic)/bundle-detail.tsx`, `(patient)/bundle-detail.tsx`) | ✅ | ✅ | ✅ | ✅ | N/A | `feed_mode` switches slot labels; circular avatar in header; UUID early-return guard |
| UI-11 | Session History | `(clinic)/history.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | SessionCard list; PostgREST join normalised |
| UI-12 | Manage Patients | `(clinic)/manage-patients.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Clinic-access relationships; revoke RPC |
| UI-13 | Patient Select | `(clinic)/patient-select.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | `find_patient_by_code` RPC |
| UI-14 | Register Patient | `(clinic)/register-patient.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Insert + access-request RPC |
| UI-15 | Device Pairing / Camera | `(clinic)/pairing.tsx` | 🔄 | 🔄 | ✅ | ✅ | ✅ | UVC path live; BLE / WiFi paths gated on real hardware |
| UI-16 | Sync (clinic side) | `(clinic)/sync.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | GAP-20: secondary `data_requests` insert is fire-and-forget |
| UI-17 | Import Capture | `(clinic)/import.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | CSV + image import; feeds same pipeline |
| UI-18 | CSV Viewer | `(clinic)/csv-viewer.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Storage → matrix render |
| UI-19 | Profile (clinic) | `(clinic)/profile.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Tap-to-change avatar UI; PERF-12 (setTimeout cleanup) |
| UI-20 | Settings (clinic) | `(clinic)/settings.tsx` | ✅ | ✅ | N/A | N/A | N/A | Adds Feedback / Tickets and Request Password Reset rows alongside the existing trimmed list |
| UI-20a | Request Password Reset (clinic) | `(clinic)/request-password-reset.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Calls `submit_password_reset_request` RPC; in-Settings flow for logged-in clinics. A11Y-10 — back-arrow `accessibilityLabel` missing |
| UI-20b | Feedback / Tickets (clinic) | `(clinic)/feedback.tsx` → `components/feedback/FeedbackScreen.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Category Picker + Subject + Body + status filter + tap-to-expand admin response. A11Y-11 — back-arrow `accessibilityLabel` missing. CODE-24 — dead `cancelled` local in focus-effect cleanup |

## Patient

| ID | Screen | File | Built | Real Data | Loading | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-21 | Patient Home | `(patient)/index.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Profile hero + Today/Month/All filter + counts strip + SessionCard list + Submit badge |
| UI-22 | Live Thermal Capture (patient) | `(patient)/live-feed.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Wraps the same `ThermalLiveFeedScreen` |
| UI-23 | Patient Details (post-capture) | `(patient)/patient-details.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Same as clinic — forks on `mode` |
| UI-24 | History (patient) | `(patient)/history.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Self-screening sessions |
| UI-25 | Bundle Detail (patient) | `(patient)/bundle-detail.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Same `OnlineBundleDetailScreen` shared with clinic |
| UI-26 | Submit to Clinic | `(patient)/submit-to-clinic.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | `submit_session_to_clinic` RPC |
| UI-27 | Sync (patient side) | `(patient)/sync.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Accept/Reject/Revoke RPCs |
| UI-28 | Import Capture (patient) | `(patient)/import.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Same as clinic |
| UI-29 | CSV Viewer (patient) | `(patient)/csv-viewer.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | |
| UI-30 | Profile (patient) | `(patient)/profile.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Tap-to-change avatar; GAP-19 deactivate alert; PERF-13 setTimeout cleanup |
| UI-31 | Settings (patient) | `(patient)/settings.tsx` | ✅ | ✅ | N/A | N/A | N/A | Adds Feedback / Tickets row |
| UI-31a | Feedback / Tickets (patient) | `(patient)/feedback.tsx` → `components/feedback/FeedbackScreen.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Same shared screen as the clinic side; submitter role inferred server-side. Inherits A11Y-11 + CODE-24 |

## Offline

| ID | Screen | File | Built | Real Data | Loading | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-33 | Live Thermal (offline) | `(offline)/live-feed.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Same shared `ThermalLiveFeedScreen` |
| UI-34 | Patient Details (offline) | `(offline)/patient-details.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Real form (commit-4); uses `bundleStorage.saveBundle`; date validation fixed 2026-05-07 |
| UI-35 | Saved Bundles | `(offline)/history.tsx` | ✅ | ✅ | ✅ | N/A | ✅ | Reads `getAllBundles()` |
| UI-36 | Bundle Detail (offline) | `(offline)/bundle-detail.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | `BundleDetailScreen` against `getBundleByCode()` |
| UI-37 | CSV Viewer (offline) | `(offline)/csv-viewer.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | |

## Other (mobile)

| ID | Screen | File | Built | Real Data | Loading | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-38 | Privacy Policy (clinic + patient) | `(clinic)/privacy-policy.tsx`, `(patient)/privacy-policy.tsx` | ✅ | N/A | N/A | N/A | N/A | Static |
| UI-39 | Terms of Service | `(clinic)/terms-of-service.tsx`, `(patient)/terms-of-service.tsx` | ✅ | N/A | N/A | N/A | N/A | Static |
| UI-40 | Contact Support | `(clinic)/contact-support.tsx`, `(patient)/contact-support.tsx` | ✅ | N/A | N/A | N/A | N/A | Static |
| UI-41 | Processed Live View (legacy) | `(clinic)/processed-live.tsx`, `(patient)/processed-live.tsx` | 🔄 | ✅ | ✅ | ✅ | N/A | The Settings entry was removed in commit-4 cleanup, but the screen file is still wired (no caller). Candidate for deletion |

## Web Admin (Next.js — `web/`)

| ID | Screen | File | Built | Real Data | Loading | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|---|
| WEB-01 | Root redirect | `web/app/page.tsx` | ✅ | N/A | N/A | N/A | N/A | Server-component `redirect("/admin")`. CRA boilerplate dropped |
| WEB-02 | Admin Shell | `web/app/admin/layout.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Sidebar (LumenLogo + nav + user + Sign Out); `useAdminSession` gate; `/admin/login` bypass; `<ThermalBackground/>` motif |
| WEB-03 | Admin Login | `web/app/admin/login/page.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | `signInWithPassword` + role check; non-admins are signed out with a clear message |
| WEB-04 | Dashboard | `web/app/admin/page.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Four count tiles; quick links to filtered queues |
| WEB-05 | Clinics queue | `web/app/admin/clinics/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Filter chips; Approve / Reject (with reason) actions. UX-20 — `confirm()` on Approve |
| WEB-06 | Password Resets queue | `web/app/admin/password-resets/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Two-step query (joined clinic by `owner_profile_id`); Set Password modal calls the Edge Function. UX-21 — `alert()` on success |
| WEB-07 | Tickets inbox | `web/app/admin/tickets/page.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | List + detail two-pane; Mark in progress / Resolve with response |
| WEB-08 | Auth bridge — Verified | `web/app/auth/verified/page.tsx` | ✅ | N/A | N/A | N/A | N/A | Forwards to `lumenai://auth/account-activated` (mobile email confirm) |
| WEB-09 | Auth bridge — Reset Password | `web/app/auth/reset-password/page.tsx` | ✅ | N/A | N/A | N/A | N/A | Forwards to `lumenai://auth/reset-password` (patient email reset) |

---

## Summary

| Category | Count |
|---|---|
| Fully complete (all ✅) | 51 |
| Partial — hardware/by-design gaps | 5 |
| Stub / mock only | 0 |
| Not started | 0 |
| **Total screens** | **56** |

**Remaining gaps:**
- `(clinic)/pairing.tsx` — BLE / WiFi paths gated on real hardware
- `(clinic)/processed-live.tsx`, `(patient)/processed-live.tsx` — orphan routes (no current callers); deletable
- `(clinic)/profile.tsx`, `(patient)/profile.tsx` — see PERF-12/13 (cleanup) and GAP-19 (deactivate alerts), all already closed
- New a11y items A11Y-10 / A11Y-11 on `(clinic)/request-password-reset.tsx` and `components/feedback/FeedbackScreen.tsx` — back-arrow `accessibilityLabel` missing

Note: Mobile admin screens (UI-18..21 in pre-commit-4 versions of this checklist) were removed when the admin surface was moved to the dedicated web app. The web app now ships under `web/` with WEB-01..WEB-09.
