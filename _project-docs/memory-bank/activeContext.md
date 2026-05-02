# Active Context — Lumen AI (formerly Vestigia)
**Last updated:** 2026-05-03

---

## What Was Done This Session (2026-05-03) — v0.11.0

A long stretch of work that takes the project from "schema lives, no clients" to "patient + clinic signup work end-to-end."

### PSGC reference data
- Pulled regions/provinces/cities/barangays from `psgc.gitlab.io/api` and seeded via two helper scripts in [scripts/](../../scripts/). Live counts: 17 / 81 / 1634 / 42046.
- Migration `20260502120500_psgc_alter_and_top.sql` drops `NOT NULL` on `ph_cities.province_code` (NCR cities have no PSGC province).
- Migration `20260503120000_psgc_anon_read.sql` opens `ph_*` SELECT to anon (the signup pickers populate before login).

### Mobile auth flow rewrite
- `app.json` `scheme` is now `lumenai`.
- `types/index.ts` `AuthUser` matches the new schema (first / middle / last + patient-only fields).
- `store/authStore.ts`:
  - `registerPatient(...)` writes per-field metadata; the `handle_new_user` trigger auto-generates `patient_code`.
  - Login rejects `role=admin` on mobile.
  - Email verify + reset redirect to `https://lumenai-vert.vercel.app/auth/{verified,reset-password}`.
  - JWT-bootstrap composes `full_name` client-side.
- `app/(auth)/account-activated.tsx` consumes the deep-link hash via `expo-linking` and calls `setSession`.
- `app/(auth)/reset-password.tsx` (new) does the same for recovery and forwards to `update-password`.

### UI standardization
- `components/ui/Input.tsx` rewritten as the global floating-label component (matches the PatientDetailsScreen pattern). Adds three masks: `format='date'` (YYYY-MM-DD), `format='phone'` (0000 000 0000), `format='doh-lto'` (NN-NNN-NN-LL-N). Plus an `optional` flag and `accentColor` override for role-based theming.
- `components/ui/Picker.tsx` (new) — searchable bottom-sheet modal with FlatList virtualization. Same look as Input. Used for facility type, region, province, city, barangay.
- `components/ui/InitialsAvatar.tsx` (new) — Teams-style 2-letter circular avatar with a deterministic 12-color palette seeded by `patient_code` / `clinic_id`. Helpers `personInitials(first, last)` and `facilityInitials(name)`. Wired into both profile screens.

### Patient signup polish
- Two-card form (Account / Profile).
- Sex limited to Male / Female.
- Middle name shows `(optional)`.
- DOB and contact use the new auto-formats.

### Role selector + theme separation
- Tab strip at top of register switches between Patient and Clinic forms.
- Patient flow keeps the theme `accent` (teal). Clinic flow uses theme `info` (blue). The selected accent flows through to inputs, sex toggle, submit button, header logo tint, and link colors.

### Clinic signup live
- New 4-card form: Account / Facility / Location & Contact / Primary Contact Person.
- DOH LTO uses `format='doh-lto'`. Phone uses `format='phone'`.
- PSGC pickers chain region → province (skipped for NCR; NCR cities filtered by code prefix `13%`) → city → barangay. ZIP auto-fills from `ph_cities.default_zip`.
- `authStore.registerClinic` invokes the new `clinic-signup` Edge Function (service-role signup with `email_confirm: true`, atomic profile + clinic insert with rollback on failure), then auto-signs-in with the same credentials.

### Edge Function
- [supabase/functions/clinic-signup/index.ts](../../supabase/functions/clinic-signup/index.ts) deployed (`verify_jwt=false`).

### Files
- CREATED: `components/ui/Picker.tsx`, `components/ui/InitialsAvatar.tsx`
- CREATED: `app/(auth)/reset-password.tsx`
- CREATED: `supabase/functions/clinic-signup/index.ts`
- CREATED: `supabase/migrations/20260502120500*` (5 PSGC files), `20260503120000_psgc_anon_read.sql`
- CREATED: `scripts/fetch-psgc.mjs`, `scripts/seed-psgc.mjs`
- CREATED: this update + new session log
- UPDATED: `app.json`, `types/index.ts`, `store/authStore.ts`
- UPDATED: `app/(auth)/register.tsx` (role tabs, patient form polish, full clinic form)
- UPDATED: `app/(auth)/account-activated.tsx`
- UPDATED: `components/ui/Input.tsx`
- UPDATED: `app/(patient)/profile.tsx`, `app/(clinic)/profile.tsx`

### Pending / next session
1. **Capture-flow rewrite for the new schema.** History, sync, clinical-data, save screens still reference old column names (`patient_code` on patients, `clinic.name`, etc.) and will fail at runtime.
2. **`finalize-session` Edge Function** — atomic capture upload (sessions + thermal_captures + classification_results + data_requests).
3. **`promote-session` Edge Function** — link offline-guest captures to a patient/clinic later.
4. **Sweep for old `clinic.name` / `patients.user_id` references** — one-shot replace pass after the capture flow is on the new schema.
5. **Push the queue.** ~17 commits unpushed since the last `git push`.
6. **Avatar** wiring on the clinic history operator chip.

---

## What Was Done Previous Session (2026-05-02) — v0.10.0

### Supabase Schema Rollout

After multiple rounds of schema design with the user (dual identity on sessions, generated names, anonymous patients eliminated, PSGC + ZIP-driven addresses, deterministic patient/clinic codes), applied the new schema as 5 migrations on the empty `public` schema:

1. **schema_bootstrap** — 8 enums, 4 PSGC reference tables (empty for now), 10 core tables, indexes
2. **triggers_and_code_generators** — `set_updated_at`, `gen_patient_code` (XXX-YYYYMMDD-HHMM-NN), `gen_clinic_code` (XX-YYYYMMDD-HHMM-NN), `handle_new_user`
3. **rls_policies** — RLS enabled on all 14 tables, 38 policies, 3 SECURITY DEFINER helper functions (`auth_role`, `auth_clinic_id`, `is_admin`) to break recursion
4. **storage_buckets** — `avatars`, `thermal-images`, `thermal-csv` (all private) + storage.objects policies that mirror table-level access via `storage.foldername()` lookups
5. **seed_admin_account** — single seeded admin (transistor@lumenai.com / @dmin123!), email auto-confirmed, identity row in place

### Migrations live in the repo
All 5 SQL files committed under `supabase/migrations/` so the schema is reproducible from git.

### Surprises during apply
- A `trg_on_auth_user_created` trigger from a prior schema setup survived the v0.9.10 reset and fired alongside my new `on_auth_user_created`, double-inserting into profiles. Fix baked into the seed migration as `DROP TRIGGER IF EXISTS`.
- `auth.identities.email` is a generated column in current Supabase — must not be inserted explicitly.

### Vercel deployment (also this session)
- Web subfolder scaffolded with Next.js 16 + Tailwind v4 + TypeScript
- `/auth/verified` and `/auth/reset-password` deep-link landing pages live at `https://lumenai-vert.vercel.app`
- README documents Supabase Auth URL allowlist setup and the mobile `lumenai://` scheme
- Two FLIR SDK tarballs were also stripped from git history during the push (filter-branch + force-push-with-lease) since they exceeded GitHub's 100MB file limit

### Files modified / created
- CREATED: `supabase/migrations/20260502120000_schema_bootstrap.sql`
- CREATED: `supabase/migrations/20260502120100_triggers_and_code_generators.sql`
- CREATED: `supabase/migrations/20260502120200_rls_policies.sql`
- CREATED: `supabase/migrations/20260502120300_storage_buckets.sql`
- CREATED: `supabase/migrations/20260502120400_seed_admin_account.sql`
- CREATED: `web/` subfolder (Next.js scaffold, /auth/verified, /auth/reset-password, README)
- UPDATED: `CHANGELOG.md` (v0.10.0 entry)
- UPDATED: `_project-docs/memory-bank/supabase-changes.md` (v0.10.0 log)
- UPDATED: this file
- CREATED: `_project-docs/sessions/2026-05-02-v0.10.0.md`

### Pending / Next session
1. **PSGC + ZIP seed data** — load region/province/city/barangay reference data and per-city default ZIP codes (with per-barangay overrides for Manila, QC, Cebu).
2. **Edge Functions** — `clinic-signup` (skips email verification, creates profile + clinic atomically), `finalize-session` (atomic session + captures + classification + data_request), `promote-session` (link offline-guest captures to a patient + clinic).
3. **Mobile auth flow rewrite** — register `lumenai://` scheme in app.json, handle deep links from the verification + reset pages, role-gate mobile login (reject admin), build the new patient + clinic signup forms (the latter behind the `clinic-signup` Edge Function).
4. **Avatar component** — Teams-style 2-letter initials fallback when `avatar_url` is null.
5. **Supabase Auth dashboard config** — set Site URL = `https://lumenai-vert.vercel.app`, allowlist the four redirect URLs.

---

## What Was Done Previous Session (2026-05-02) — v0.9.10

### Codebase Audit + Supabase Schema Reset

User asked to review the project's data flow, screen routes, user roles, and unused UI before redesigning the data model.

Audit findings:
- 46 screens across 5 route groups: `(auth)`, `(clinic)`, `(patient)`, `(admin)`, `(offline)`
- Three roles can capture (clinic, patient, offline guest) — patient/offline live-feed and `save` screens stay
- Triplicated `patient-details` / `bundle-detail` / `csv-viewer` wrappers (across 3 route groups) kept as-is for now
- Import tabs (`(clinic)/import`, `(patient)/import`) — stubs, deferred
- `(clinic)/assessment` initially flagged for removal; verification showed it is the active DPN scan progress screen ([app/(clinic)/clinical-data.tsx:157](../../app/(clinic)/clinical-data.tsx#L157) → assessment → dpn-result). **Kept.**
- `components/assessment/index.tsx` — confirmed orphan (exports `ClassificationCard`, `AngiosomeTable`, `TCIDisplay`, none referenced). **Deleted.**
- `components/session/index.tsx` — initial path-grep was too narrow; deeper check showed it is actively imported by `(clinic)/history`, `(patient)/index`, `(patient)/history` for `SessionCard`. **Kept.**

Supabase schema reset:
- All 7 public tables were empty → dropped with CASCADE via Supabase MCP
- Storage bucket `thermal-images` and associated RLS policies were not touched
- Schema redesign deferred — needs its own planning round

### Plan File
- `C:\Users\PotatoIV\.claude\plans\okay-now-lets-start-sorted-feigenbaum.md` — full audit report + cleanup plan

### Files Modified / Deleted
- DELETED: `components/assessment/index.tsx` (and now-empty `components/assessment/` directory)
- UPDATED: `CHANGELOG.md` (added v0.9.10 entry)
- UPDATED: `_project-docs/memory-bank/supabase-changes.md` (logged schema reset)
- UPDATED: this file
- CREATED: `_project-docs/sessions/2026-05-02-v0.9.10.md`

### Pending / Next Session
1. **Schema redesign** — design new Supabase schema from scratch (driven by current bundle pipeline, bilateral capture, role-based access). Separate planning round.
2. **Sync strategy decision** — bundle (AsyncStorage + device files) vs SQLite `local_captures` as canonical offline store; whether to add NetInfo + a real upload queue.
3. **Triplicated viewer consolidation** — possible follow-up cleanup.
4. **Import tab fate** — build or delete.
5. **`CsvViewerModal`** — verify usage and likely delete.
6. **WatermelonDB stubs** — `lib/database/` references `@nozbe/watermelondb` which isn't installed; either install + use, or delete.

---

## What Was Done Previous Session (2026-05-02) — v0.9.9

### Isolation Pipeline Rewrite — Both `UVCModule.kt` and `lib/thermal/footIsolation.ts`

User shared screenshots showing two failure modes:
1. A warm hand still had a coloured fringe of background pixels around the fingers
2. A cold dumbbell was fully inverted (background isolated, not the dumbbell), and the thin handle was missing

Root causes diagnosed:
- Hardcoded `>= threshold` polarity assumption caused cold subjects to be discarded
- BFS ran BEFORE morphological closing, so thin structures (handle) were severed before closing could bridge them
- Equal dilate/erode (net 0px) preserved near-threshold boundary pixels as fringe

**Pipeline rewrite** (4 stages, same logic in both Kotlin and TypeScript):
1. **Variance guardrail** — `otsuThresholdWithVariance()` returns `(threshold, bestVar)`; `bestVar < 10.0` → return empty mask (unimodal frame, no subject)
2. **Closing first** — dilate 5, erode 5 on raw hot mask to bridge thin connections BEFORE BFS
3. **Border-intersection polarity check** — BFS on both hot and cold classes; class with more border-touching pixels = background; subject = other class (handles warm AND cold subjects)
4. **Opening trim** — erode 2 → dilate 2 on subject mask; removes near-threshold fringe pixels at boundary

**Helpers added/refactored:**
- `morphDilate`, `morphErode`, `morphClose`, `largestComponentWithBorderCount`
- `otsuThreshold` → `otsuThresholdWithVariance` (now returns `Pair<Float,Double>` / `[number, number]`)

Files modified: `UVCModule.kt`, `lib/thermal/footIsolation.ts`

---

## What Was Done This Session (2026-05-01) — v0.9.8

### Kotlin Isolation Pipeline
- `UVCModule.kt` — added `otsuThreshold()` (256-bin, maximises between-class variance); rewrote `isolateFootMask()` with Otsu + BFS largest-component + morphological closing (dilate 5px / erode 2px); `buildIsolatedPng()` uses ARGB_8888 Bitmap with transparent background for non-foot pixels; `buildMaskedCsv()` writes "0.00" for background, "%.2f" for foot pixels
- Removed auto-save from `processCapture()` — `savePngToDevice` and `saveCsvToDevice` are now `@ReactMethod`s called from JS at bundle-save time when bundle code is known
- `ThermalResult` data class: `imageSaved`/`csvSaved` removed; `isolatedPngB64` + `maskedCsvContent` added

### JS-Side Updates
- `lib/thermal/uvcCamera.ts` — `NativeProcessResult` updated; `savePngToDevice` and `saveCsvToDevice` exports added; removed `imageSaved`/`csvSaved`
- `lib/thermal/captureProcessor.ts` — complete rewrite; JS isolation removed; uses native `isolatedPngB64` and `maskedCsvContent`; accepts `rawImageUri` param
- `store/sessionStore.ts` — `leftRawB64`/`rightRawB64` added; `leftImageB64`/`rightImageB64` → `leftProcessedB64`/`rightProcessedB64`; `captureLeft/Right` signatures updated
- `lib/thermal/bundleStorage.ts` — `FootData` redesigned (raw/processed/isolated/csv); `FootInput` interface added; `saveBundle()` generates `${code}_L_raw.png` etc.; calls `savePngToDevice`/`saveCsvToDevice` after AsyncStorage write
- `app/(clinic)/assessment.tsx`, `app/(clinic)/clinical-data.tsx` — `leftImageB64`/`rightImageB64` → `leftProcessedB64`/`rightProcessedB64`
- All three live-feed wrappers — extract rawB64/processedB64/isolatedB64 and pass to store

### Bundle Detail — Three Images
- `BundleDetailScreen.tsx` — UNPROCESSED | POST-PROCESSED | ISOLATED displayed side-by-side per foot; `onViewCsv` prop added; CSV modal removed
- `app/(clinic)/bundle-detail.tsx`, `app/(patient)/bundle-detail.tsx`, `app/(offline)/bundle-detail.tsx` — all updated to pass `onViewCsv` with router push to csv-viewer

### CSV Viewer Screen
- `components/thermal/CsvViewerScreen.tsx` — new dedicated screen; WebView HTML table; CELL_PX=44 (readable values); 256 ironbow CSS color classes matching Kotlin palette; `device-width` viewport; background cells dimmed; hint bar at bottom
- Thin wrapper routes: `app/(clinic)/csv-viewer.tsx`, `app/(patient)/csv-viewer.tsx`, `app/(offline)/csv-viewer.tsx`
- Layout files updated: clinic/patient `_layout.tsx` → `csv-viewer` hidden Tab.Screen; offline `_layout.tsx` → `csv-viewer` Stack.Screen

### Bug Fixes
- `components/thermal/ReadinessIndicator.tsx` — `LOW_SIGNAL_MIN` 6.0 → 2.5°C² (fixes "No Subject" false positive)
- `lib/thermal/footIsolation.ts` — Otsu threshold + morphological closing (JS-side mirror of Kotlin logic)

---

## What Was Done This Session (2026-04-29) — v0.9.6 (research only, no version bump)

### FLIR Atlas SDK — Hardware Compatibility Analysis
- User added 3 materials to `_project-docs/flir/`: `atlas-java-sdk-android-2.19.0.tar.gz`, `Android-samples-sources-all.tar.gz`, `FLIR_Mobile_SDK_Fact_Sheet.pdf`
- Fetched and read FLIR Atlas SDK Javadoc, open-source deps page, and training video list
- **Conclusion: Atlas SDK does NOT support PureThermal + Lepton 3.5.** It is designed for FLIR ONE, FLIR ONE Edge, ACE, Scout Pro, and WiFi network cameras only. No raw UVC / third-party board support.
- **Recommendation confirmed:** Stay with libuvccamera + Y16 JNI approach — it is the correct path for PureThermal.
- Identified 3 things to verify on physical device:
  1. Whether camera is outputting TLINEAR mode (temperature = raw / 100.0 − 273.15) or uncalibrated RAW14
  2. Whether Y16 JNI bridge routes frames correctly end-to-end
  3. Whether Lepton 3.5 is sending 160×121 frames (with telemetry row) instead of 160×120

---

## What Was Done This Session (2026-04-25) — v0.9.7

### Y16 JNI Bridge — Full Implementation (AAR rebuild)
- `UVCCamera.java` — added `FRAME_FORMAT_Y16 = 2` constant
- `libuvc.h` — added `UVC_FRAME_FORMAT_GRAY16` to the uvc_frame_format enum (between GRAY8 and BY8)
- `stream.c` — registered Y16 GUID `{'Y','1','6',' ', 0x00,...}` as `UVC_FRAME_FORMAT_GRAY16`; added GRAY16 as a child of UNCOMPRESSED in the ancestor table
- `UVCPreview.cpp` — changed both `setPreviewSize` and `prepare_preview` ternaries from 2-way (`!requestMode`) to 3-way (`mode==2` → GRAY16, `mode==1` → MJPEG, else → YUYV); changed `do_preview` from `if (frameMode)` to `if (frameMode == 1)` / `else if (frameMode == 2)` (Y16: raw frames go directly to `addCaptureFrame`, no conversion) / `else` (YUYV); fixed `frameBytes` to `w*h*(requestMode==1 ? 4 : 2)`
- Rebuilt AAR (`./gradlew :libuvccamera:assembleRelease` → BUILD SUCCESSFUL)
- Copied new AAR → `android/app/libs/libuvccamera-release.aar`
- `UVCModule.kt` — updated mode fallback list to `[FRAME_FORMAT_Y16, FRAME_FORMAT_YUYV, DEFAULT_PREVIEW_MODE]`
- APK rebuild started

### Vitals Removal (v0.9.6)
(carried forward from previous context)
- Removed `PatientVitals` interface from `types/index.ts`
- Removed `VitalsForm` component from `components/session/index.tsx`
- Removed vitals from `app/(clinic)/clinical-data.tsx`, `app/(clinic)/sync.tsx`, `app/(offline)/save.tsx`, `app/(patient)/save.tsx`, `app/(offline)/history.tsx`, `lib/db/offlineCaptures.ts`

### Nav Bar Fix (v0.9.6)
- `components/layout/ScreenWrapper.tsx` — `edges` prop defaults to `['top', 'left', 'right']`, preventing double-application of bottom inset in tab screens

---

## What Was Done Previous Session (2026-04-25) — v0.9.6

### UVC Event Name Fix
- `UVCModule.kt` — fixed all event name mismatches: `"UVCFrame"` → `"onFrame"`, `"UVCDisconnected"` → `"onCameraDisconnected"`, added `sendEvent("onCameraConnected", null)` after connect resolves
- Added `sendEvent("onCameraFormats", supported)` — emits supported sizes JSON string immediately after `camera.open()`
- Added `getSupportedFormats()` `@ReactMethod` — lets JS query supported formats from a connected camera
- `lib/thermal/uvcCamera.ts` — added `onCameraFormats` listener + `getSupportedFormats()` async function

### Thermal Image Storage to Supabase (v0.9.5)
- `types/index.ts` — added `image_url?: string` to `ThermalCapture` interface
- `app/(clinic)/clinical-data.tsx` — replaced single thermal_captures insert with bilateral loop (left + right foot), each with real per-foot `getMatrixStats()`, angiosome means, and Supabase Storage PNG upload to `thermal-images/{session_id}/{foot}.png`; upload failure is non-fatal (`image_url = null`)
- Supabase: added `image_url TEXT` column to `thermal_captures`; created `thermal-images` private Storage bucket; added upload + read RLS policies for authenticated users

### Hardware Reference Document
- `_project-docs/hardware-references.md` — new file: all 6 hardware reference links, hardware stack diagram, UVC format descriptor table (YUYV/Y16/GREY/RGB565/BGR3), Y16 byte format, libuvccamera constants, known Y16 integration problem, PureThermal + Lepton specs, USB device filter confirmation

### CameraStatusPanel UI
- `app/(clinic)/live-feed.tsx` — replaced static status bar with `CameraStatusPanel` component: animated pulsing dot, live FPS counter, frame data validation (Y16 sanity check: <50% pixels in 10–60°C range → `frameWarning` banner), retry button (increments `retryKey` to re-trigger camera setup useEffect), format debug row showing supported formats from camera, `onCameraFormats` subscription

### Crash Fix — Navigation to Live Feed
- **Root cause 1:** `UVCModule.kt` attempted `setPreviewSize(160, 120, 6)` — mode 6 is not a valid AAR Java constant; caused unhandled JNI exception killing the process; since camera was always connected on navigate, crash was 100% reproducible
- **Fix:** Changed `listOf(6, 0, UVCCamera.DEFAULT_PREVIEW_MODE)` → `listOf(UVCCamera.FRAME_FORMAT_YUYV, UVCCamera.DEFAULT_PREVIEW_MODE)`
- **Root cause 2:** `Animated.loop` in `CameraStatusPanel` had no cleanup; orphaned animation loop in Hermes (release JS engine) after unmount → secondary crash
- **Fix:** Added `let loop; loop = Animated.loop(...); loop.start(); return () => { loop?.stop(); pulseAnim.stopAnimation(); };`

---

## What Was Done Previous Session (2026-04-08) — v0.9.4

### HW-01 — Real UVC Camera Module (libuvccamera-release.aar)
Completed the full build + link of the saki4510t/UVCCamera library into Vestigia:

**UVCCamera project fixes (C:\Users\PotatoIV\Desktop\UVCCamera\):**
- `build.gradle` — AGP `3.1.4` → `7.4.2`; dead `jcenter()` → `mavenCentral()`/`google()`; SDK versions 27 → 33
- `gradle/wrapper/gradle-wrapper.properties` — Gradle `8.5` → `7.6.3`
- `gradle.properties` — removed `-XX:MaxPermSize=512m` (incompatible with Java 17+)
- `libuvccamera/src/main/jni/Application.mk` — removed deprecated ABIs (`armeabi`, `mips`); kept `arm64-v8a`, `armeabi-v7a`, `x86_64`; `android-14` → `android-21`
- `libuvccamera/src/main/java/.../USBMonitor.java` — Added `PendingIntent.FLAG_IMMUTABLE` for Android 12+ (API 31+); fixes runtime crash on modern devices

**Vestigia integration:**
- `android/app/libs/libuvccamera-release.aar` — copied fixed AAR (built at 01:06 timestamp, after FLAG_IMMUTABLE fix)
- `android/app/build.gradle` — added `fileTree(libs)`, `support-v4:27.1.1`, `support-annotations:27.1.1`, `com.serenegiant:common:2.12.4`
- `android/gradle.properties` — added `android.enableJetifier=true`
- `android/build.gradle` — added `maven { url 'https://raw.github.com/saki4510t/libcommon/master/repository/' }`
- `android/app/src/main/java/.../UVCModule.kt` — full implementation: `USBMonitor`, `UVCCamera`, `IFrameCallback`; emits Base64 Y16 frames as `UVCFrame` events; handles connect/disconnect/permission lifecycle

### App Name: "Lumenai" → "Lumen AI"
- `app.json` — `"name": "Lumenai"` → `"name": "Lumen AI"`
- `constants/strings.ts` — `app.name`, `app.versionFooter`, `auth.loginFooter` all updated to "Lumen AI"
- `android/app/src/main/res/values/strings.xml` — `app_name` updated to "Lumen AI"

### Release APK
- `npx expo run:android --variant release` started; build in progress

---

## What Was Done Previous Session (2026-04-07) — v0.9.3

### Admin Settings Cleanup
- `app/(admin)/settings.tsx` — removed `Notifications` row (and its divider) from Account section
- `app/(admin)/settings.tsx` — removed version footer; now matches clinic/patient style

### Patient Registration Form
- `app/(clinic)/register-patient.tsx` — full registration form; inserts to `patients`; auto-selects patient → live-feed; handles `23505` duplicate code error
- `app/(clinic)/patient-select.tsx` — `person-add-outline` header icon + "Register First Patient" empty state button
- `app/(clinic)/_layout.tsx` — `register-patient` registered as hidden `Tabs.Screen`

---

## What Was Done Earlier (2026-04-07) — v0.9.2

### Back Navigation — 5 Screens Fixed
- `app/(auth)/update-password.tsx` — floating back arrow above form
- `app/(clinic)/patient-select.tsx` — `chevron-back` in Header
- `app/(clinic)/clinical-data.tsx` — same
- `app/(clinic)/pairing.tsx` — same
- `app/(clinic)/dpn-result.tsx` — back button on main result view

### Clinic Settings — Redesign
- Removed Notifications, Haptic Feedback, AI Model rows; removed version footer
- Profile / Privacy Policy / ToS / Contact Support navigate to real screens
- Deactivate Account moved inside Profile screen

### Clinic + Patient Profile Screens (new)
- Avatar upload (Supabase Storage `avatars` bucket), editable display name, read-only account info, Deactivate Account

### Legal/Support Screens (new)
- Privacy Policy (8 sections), Terms of Service (10 sections), Contact Support (FAQ accordion) for both clinic + patient route groups

### History Avatar
- Clinic History Cloud tab shows operator avatar in Header

---

## Current State

### App Name
- ✅ "Lumen AI" — updated in app.json, strings.ts, strings.xml

### UVC Camera (FLIR Lepton 3.5 via PureThermal)
- ✅ `libuvccamera-release.aar` built from saki4510t/UVCCamera (fixed: AGP, Gradle, ABIs, FLAG_IMMUTABLE)
- ✅ `UVCModule.kt` fully implemented — emits Base64 frames to JS; event names match JS listeners
- ✅ `CameraStatusPanel` — live connection status, FPS counter, Y16 sanity check, retry button, format debug row
- ✅ Crash fix — removed invalid mode 6 from setPreviewSize; Animated.loop cleanup added
- ✅ Y16 JNI bridge complete — `UVC_FRAME_FORMAT_GRAY16` added to libuvc; Y16 GUID registered; `UVCPreview.cpp` routes mode=2 frames raw to capture callback; `UVCModule.kt` tries Y16 first
- ✅ Kotlin isolation pipeline — Otsu + BFS largest-component + morphological closing (dilate 5 / erode 2); `buildIsolatedPng` + `buildMaskedCsv`; `savePngToDevice` / `saveCsvToDevice` React methods
- ✅ Isolation pipeline rewritten (v0.9.9) — variance guardrail; closing before BFS; border polarity check (handles cold subjects); opening trim (removes fringe pixels); mirrors in both Kotlin and TypeScript
- ⚠️ Physical device end-to-end test still pending — rebuild required (`npx expo run:android`)

### Bundle Capture Pipeline
- ✅ Three images per foot: raw (JPEG, bundle-only), processed PNG, isolated PNG (transparent BG)
- ✅ Bundle file naming: `${code}_L_raw.png`, `_L_processed.png`, `_L_isolated.png`, `_L_csv.csv`
- ✅ BundleDetailScreen — 3-image display per foot with UNPROCESSED | POST-PROCESSED | ISOLATED
- ✅ CsvViewerScreen — WebView HTML ironbow grid; CELL_PX=44; readable values; pinch-to-zoom

### Settings / Profile
- ✅ Clinic, patient, admin settings all cleaned up
- ✅ Profile screens with avatar upload (Supabase Storage)
- ✅ Legal screens for both roles

### Patient Registration
- ✅ Clinic staff can register new patients from patient-select screen
- ✅ New patient auto-selected after registration → live-feed

### Auth
- ✅ All auth flows working
- ✅ 30-minute inactivity timeout on all roles

---

## Pending Manual Steps
1. `npx expo run:android` — rebuild required for all Kotlin changes in v0.9.7 + v0.9.8 + v0.9.9
2. End-to-end test: bilateral FLIR capture → bundle save → CSV viewer → BundleDetailScreen 3-image display
3. Test isolation with cold subject (e.g. ice pack or cold object) to verify polarity detection works
4. End-to-end test: bilateral FLIR capture → DPN API → save to Supabase
5. `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`
6. Delete dead code: `components/thermal/CsvViewerModal.tsx` (replaced by CsvViewerScreen, no longer imported)

---

## Next Steps (priority order)
1. `npx expo run:android` + install APK → test warm hand AND cold object isolation
2. Tune variance guardrail (`bestVar < 10.0`) if needed — may be too strict or too loose
3. Verify Y16 temperature data is correct (TLINEAR vs RAW14 — divide by 100 - 273.15 or raw scaled)
4. End-to-end DPN API flow with real thermal data
5. Clean up dead `CsvViewerModal.tsx`
