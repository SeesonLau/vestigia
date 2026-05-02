# Changelog — Lumen AI (formerly Vestigia)

All notable changes to this project will be documented here.
Format: `Major.Minor.Patch`

## [0.11.0] — 2026-05-03

### Added — PSGC reference data
- 5 migrations + 2 helper scripts seed the Philippine Standard Geographic Code: 17 regions, 81 provinces, 1634 cities, 42046 barangays.
- [scripts/fetch-psgc.mjs](scripts/fetch-psgc.mjs) regenerates the SQL migrations from `psgc.gitlab.io/api`. [scripts/seed-psgc.mjs](scripts/seed-psgc.mjs) is the one-shot bulk loader used to load the live project (the barangay migrations exceed Read tooling limits).
- New migration [supabase/migrations/20260503120000_psgc_anon_read.sql](supabase/migrations/20260503120000_psgc_anon_read.sql) opens `ph_*` SELECT to anon so the clinic signup pickers populate before login.

### Added — Patient mobile auth flow (new schema)
- `app.json` `scheme` → `lumenai`.
- `types/index.ts` `AuthUser` carries first / middle / last / full_name + patient-only fields (sex, date_of_birth, contact_number, patient_code).
- `store/authStore.ts`:
  - `register()` replaced by `registerPatient({ email, password, firstName, middleName?, lastName, sex, dateOfBirth, contactNumber })`. Writes new metadata into `raw_user_meta_data` so `handle_new_user` populates profiles + auto-generates patient_code.
  - Email verification redirectTo points at `https://lumenai-vert.vercel.app/auth/verified`.
  - Password reset redirectTo points at `https://lumenai-vert.vercel.app/auth/reset-password`.
  - `onAuthStateChange` JWT bootstrap composes `full_name` client-side (cold-start fast path).
  - Login rejects `role=admin` on mobile (signs out, returns "Admin login is not available on mobile").
- `app/(auth)/account-activated.tsx` consumes the deep-link hash via `expo-linking`, calls `supabase.auth.setSession`, and routes by role.
- `app/(auth)/reset-password.tsx` (new) does the same for recovery and forwards to the existing `update-password` form.

### Added — UI standardization
- `components/ui/Input.tsx` rewritten as a floating-label component (label rises 150ms when focused or filled; matches the PatientDetailsScreen pattern). New props:
  - `format='date'`     → YYYY-MM-DD auto-mask, value holds 8 raw digits
  - `format='phone'`    → 0000 000 0000 auto-mask, value holds 11 raw digits
  - `format='doh-lto'`  → NN-NNN-NN-LL-N with per-position validation + auto-uppercase
  - `optional` flag appends ` (optional)` in dimmed style
  - `accentColor` overrides focus color (used for role-based theming)
- `components/ui/Picker.tsx` (new) — searchable bottom-sheet modal with FlatList virtualization (handles the 42K barangay list smoothly). Same floating-label visual language as Input.
- `components/ui/InitialsAvatar.tsx` (new) — Teams-style up-to-2-letter avatar with deterministic 12-color palette seeded by patient_code / clinic_id. Helpers: `personInitials(first, last)`, `facilityInitials(name)`. Wired into patient + clinic profile screens.

### Added — Clinic signup flow
- New register screen: tab strip selects Patient or Clinic. Patient flow keeps the teal accent; clinic flow uses theme `info` (blue) so the visual experience is clearly different per role.
- Patient form split into Account / Profile cards; sex narrowed to Male/Female; middle name shows `(optional)`; DOB and contact use the new auto-formats.
- Clinic form (4 cards) — Account / Facility / Location & Contact / Primary Contact Person:
  - Facility type Picker (9 options)
  - DOH LTO Number with `format='doh-lto'`
  - PSGC Region → Province (skipped for NCR, NCR cities queried by code prefix `13%`) → City → Barangay Pickers
  - ZIP auto-fills from `ph_cities.default_zip` when a city is selected
  - Phone uses `format='phone'`
  - On submit, `authStore.registerClinic` calls the new `clinic-signup` Edge Function and auto-signs-in.

### Added — `clinic-signup` Edge Function
- [supabase/functions/clinic-signup/index.ts](supabase/functions/clinic-signup/index.ts), deployed (active, `verify_jwt=false`).
- Validates the payload server-side, then with the service role: `auth.admin.createUser({ email_confirm: true })` → INSERT clinics → UPDATE profiles.clinic_id. Rolls back the auth user if any step fails.

### Notes
- The clinic profile screen now reads `facility_name` (the new schema column) instead of the old `name`. Other screens that reference renamed columns (`history.tsx`, etc.) are still on the old shape and will be updated in a follow-up round.

---

## [0.10.0] — 2026-05-02

### Added — Supabase Schema Rollout

The new schema is live on the remote project (5 migrations) and committed under [supabase/migrations/](supabase/migrations/).

#### Tables
- 4 PSGC reference tables (`ph_regions`, `ph_provinces`, `ph_cities`, `ph_barangays`) — seeds deferred
- 10 core tables: `profiles`, `clinics`, `devices`, `patients`, `screening_sessions`, `thermal_captures`, `classification_results`, `data_requests`, `system_config`, `audit_log`
- 8 enums: `user_role`, `sex_type`, `foot_type`, `session_status`, `capture_mode_type`, `dpn_classification`, `request_status`, `facility_type`

#### Identity model
- `profiles` stores `first_name + middle_name? + last_name`; `full_name` is a `GENERATED ALWAYS AS STORED` column composed from those.
- `screening_sessions` carries dual identity: `subject_profile_id` (patient view) and `clinic_id` (clinic view). Either or both can be filled; the same row surfaces in both histories without duplication.
- `patients` is the clinic-side clinical record; `profile_id` is `NOT NULL` (anonymous walk-ins removed per latest decision).

#### Triggers
- `set_updated_at` applied to profiles, clinics, patients, screening_sessions
- `gen_patient_code` BEFORE INSERT on profiles → `XXX-YYYYMMDD-HHMM-NN` (advisory-locked counter)
- `gen_clinic_code` BEFORE INSERT on clinics → `XX-YYYYMMDD-HHMM-NN` (facility-type prefix)
- `handle_new_user` AFTER INSERT on `auth.users` → mirrors metadata into `profiles`. `SECURITY DEFINER`.

#### RLS
- Enabled on all 14 tables, 38 policies total
- Helper functions: `auth_role()`, `auth_clinic_id()`, `is_admin()` — `SECURITY DEFINER`, bypass RLS internally to avoid recursion
- Access summary: own + admin everywhere; clinic operators scoped to their clinic; patients see their own subject sessions

#### Storage
- 3 private buckets: `avatars`, `thermal-images`, `thermal-csv`
- Path layouts: `profiles/{id}/avatar.png`, `clinics/{id}/avatar.png`, `{session_id}/{foot}/{kind}.png`, `{session_id}/{foot}.csv`
- `storage.objects` policies mirror table-level access via `storage.foldername()` lookups

#### Admin seed
- Single admin: `transistor@lumenai.com` / `@dmin123!` — auto-confirmed, identity row inserted for password sign-in
- Mobile login is blocked at the app layer (role check after sign-in)
- Recovery email is documentation-only; password reset will be handled in the admin webapp
- Defensive: drops a leftover `trg_on_auth_user_created` trigger from a prior schema before seeding (would otherwise fire `handle_new_user` twice)

#### Deferred to next round
- PSGC + ZIP seed data
- Edge Functions: `clinic-signup`, `finalize-session`, `promote-session`
- Mobile auth flow rewrite (deep-link handler, role-gate, signup forms)

---

## [0.9.10] — 2026-05-02

### Removed — Codebase Audit Pass

- Deleted orphan file `components/assessment/index.tsx` (exported `ClassificationCard`, `AngiosomeTable`, `TCIDisplay` — none referenced anywhere in the codebase)
- Removed empty `components/assessment/` directory

### Database — Schema Reset

- Dropped all seven public tables (`profiles`, `clinics`, `patients`, `devices`, `screening_sessions`, `thermal_captures`, `classification_results`) via Supabase MCP. All tables were empty (0 rows). Schema redesign deferred to a separate planning round. See `_project-docs/memory-bank/supabase-changes.md`.

---

## [0.9.9] — 2026-05-02

### Fixed — Isolation Pipeline Rewrite (Polarity + Thin Structures + Fringe Pixels)

- `UVCModule.kt` + `lib/thermal/footIsolation.ts` — `isolateFootMask` fully rewritten with a 4-stage pipeline:
  1. **Variance guardrail** — `otsuThresholdWithVariance()` returns `(threshold, bestVar)`; if `bestVar < 10.0` (unimodal histogram, no distinct subject in frame) returns an empty mask instead of segmenting noise
  2. **Closing before BFS** — morphological closing (dilate 5, erode 5) applied to the raw hot mask first; bridges thin connections such as a dumbbell handle or narrow finger base before BFS evaluates connectivity — fixes missing thin-structure isolation
  3. **Border-intersection polarity check** — BFS runs independently on both the hot class and cold class; the class whose largest connected component has more border-touching pixels is the background; the other is the subject — fixes cold-subject inversion (previously always kept the warm class)
  4. **Opening trim** (erode 2 → dilate 2) — after BFS selects the subject, removes the ragged rim of near-threshold boundary pixels that produced a coloured fringe around the isolated image
- `UVCModule.kt` + `lib/thermal/footIsolation.ts` — `otsuThreshold()` renamed to `otsuThresholdWithVariance()` and extended to return between-class variance alongside the threshold value
- `UVCModule.kt` — helper methods extracted: `morphDilate`, `morphErode`, `morphClose`, `largestComponentWithBorderCount`
- `lib/thermal/footIsolation.ts` — same helpers as standalone functions: `morphDilate`, `morphErode`, `morphClose`, `largestComponentWithBorderCount`

---

## [0.9.8] — 2026-05-01

### Added — Kotlin Isolation Pipeline + Bundle Capture Overhaul

#### Kotlin Foot Isolation
- `UVCModule.kt` — `otsuThreshold()`: 256-bin histogram; maximises `w0*w1*(mu0-mu1)²` between-class variance; finds natural bimodal split between ambient background and foot temperatures
- `UVCModule.kt` — `isolateFootMask()` rewritten: Otsu threshold → BFS flood fill (4-connectivity) → keep largest component → morphological closing (dilate radius 5px then erode radius 2px); net ~3px expansion with finger gaps filled
- `UVCModule.kt` — `buildIsolatedPng()`: Android `Bitmap.Config.ARGB_8888`; background pixels `pixels[i]=0` (transparent); foot pixels get ironbow RGB + alpha=255; encoded as PNG 100% quality → Base64
- `UVCModule.kt` — `buildMaskedCsv()`: background cells `"0.00"`, foot cells `"%.2f".format(temp)`
- `UVCModule.kt` — `savePngToDevice(filename, base64Png)` and `saveCsvToDevice(filename, csvContent)` added as `@ReactMethod` (background thread); called from JS at bundle-save time when bundle code is known; `processCapture()` no longer auto-saves
- `ThermalResult` data class: `imageSaved`/`csvSaved` removed; `isolatedPngB64` and `maskedCsvContent` added
- `lib/thermal/uvcCamera.ts` — `NativeProcessResult` updated; `savePngToDevice` + `saveCsvToDevice` exported; comment clarifies "Does NOT auto-save to device"
- `lib/thermal/captureProcessor.ts` — complete rewrite; all JS isolation imports removed; `ProcessedCapture` now carries `rawImageUri`, `displayPngUri`, `isolatedPngUri`, `maskedCsvContent`; native result fields used directly
- `lib/thermal/footIsolation.ts` — JS-side isolation updated to match Kotlin: `otsuThreshold()` function added; closing (dilate 5 + erode 2) replaces pure dilation

#### Bundle Storage Redesign
- `lib/thermal/bundleStorage.ts` — `FootData` redesigned: `raw_filename`, `processed_filename`, `isolated_filename`, `csv_filename`, `raw_image_b64`, `processed_image_b64`, `isolated_image_b64`, `csv_content`, `stats`; `FootInput` interface added; `saveBundle()` generates bundle-code filenames (`${code}_L_raw.png` etc.); calls `savePngToDevice`/`saveCsvToDevice`; raw image stored bundle-only (not saved to device)
- `store/sessionStore.ts` — `leftRawB64`/`rightRawB64` added; `leftImageB64`/`rightImageB64` renamed to `leftProcessedB64`/`rightProcessedB64`; `captureLeft`/`captureRight` updated to accept `(matrix, rawB64, processedB64, isolatedB64, csvContent, stats)`
- All three live-feed wrappers (`app/(clinic)/live-feed.tsx`, `app/(offline)/live-feed.tsx`, `app/(patient)/live-feed.tsx`) — extract rawB64/processedB64/isolatedB64 from `processFrames` result; pass all three to store
- `components/thermal/PatientDetailsScreen.tsx` — reads `leftRawB64`/`rightRawB64`/`leftProcessedB64`/`rightProcessedB64` from store; passes full FootInput to `saveBundle()`
- `app/(clinic)/assessment.tsx`, `app/(clinic)/clinical-data.tsx` — `leftImageB64`/`rightImageB64` → `leftProcessedB64`/`rightProcessedB64`

#### BundleDetailScreen — Three Images per Foot
- `components/thermal/BundleDetailScreen.tsx` — each foot shows UNPROCESSED | POST-PROCESSED | ISOLATED side by side at 160:120 aspect ratio; raw uses jpeg URI prefix, processed/isolated use png; missing images show placeholder icon; `onViewCsv?: (side) => void` prop triggers CSV screen; `CsvViewerModal` removed
- `app/(clinic)/bundle-detail.tsx`, `app/(patient)/bundle-detail.tsx`, `app/(offline)/bundle-detail.tsx` — pass `onViewCsv` with `router.push` to csv-viewer screen

#### CSV Viewer Screen
- `components/thermal/CsvViewerScreen.tsx` — new dedicated screen; fetches bundle from AsyncStorage; `buildHtml(csvContent)`: computes per-foot min/max of non-zero pixels; generates 256 CSS ironbow color classes (luminance-based text contrast); builds HTML table 7040×5280px (160×44, 120×44 cells); `device-width` viewport with `user-scalable=yes`; background cells `.bg` class (dimmed); hint bar at bottom
- `app/(clinic)/csv-viewer.tsx`, `app/(patient)/csv-viewer.tsx`, `app/(offline)/csv-viewer.tsx` — thin wrappers reading `{code, side}` search params
- `app/(clinic)/_layout.tsx`, `app/(patient)/_layout.tsx` — `csv-viewer` registered as hidden Tabs.Screen
- `app/(offline)/_layout.tsx` — `csv-viewer` registered as Stack.Screen

### Fixed
- `components/thermal/ReadinessIndicator.tsx` — `LOW_SIGNAL_MIN` lowered from `6.0` to `2.5`°C²; fixes "No Subject" false positive when hand/foot occupies ~15% of frame at indoor ambient (typical variance ~3–4°C²)

---

## [0.9.7] — 2026-04-25

### Added — Y16 JNI Bridge (AAR Rebuild)

Changes to `C:\Users\PotatoIV\Desktop\UVCCamera\` (saki4510t/UVCCamera source):
- `UVCCamera.java` — added `FRAME_FORMAT_Y16 = 2` constant
- `libuvc.h` — added `UVC_FRAME_FORMAT_GRAY16` to `uvc_frame_format` enum (between GRAY8 and BY8)
- `stream.c` — registered Y16 GUID `{'Y','1','6',' ', 0x00,...}` as `UVC_FRAME_FORMAT_GRAY16`; added GRAY16 as child of UNCOMPRESSED in ancestor table
- `UVCPreview.cpp` — changed `setPreviewSize` and `prepare_preview` ternaries from 2-way to 3-way (mode=2→GRAY16, mode=1→MJPEG, else→YUYV); changed `do_preview` to branch: mode=2 routes raw Y16 frames directly to `addCaptureFrame` (no conversion); `frameBytes` corrected to `w*h*(mode==1 ? 4 : 2)`
- AAR rebuilt (`./gradlew :libuvccamera:assembleRelease` → BUILD SUCCESSFUL); copied to `android/app/libs/libuvccamera-release.aar`

Vestigia changes:
- `UVCModule.kt` — updated mode fallback list to `[FRAME_FORMAT_Y16, FRAME_FORMAT_YUYV, DEFAULT_PREVIEW_MODE]`; app now attempts Y16 first on every camera connect

---

## [0.9.6] — 2026-04-25

### Fixed
- `android/app/src/main/java/com/anonymous/vestigia/UVCModule.kt` — removed invalid `mode=6` from `setPreviewSize` loop; mode 6 is not a valid AAR Java constant and caused an unhandled JNI exception killing the process whenever the camera was connected on navigate-to-live-feed; now tries `FRAME_FORMAT_YUYV` then `DEFAULT_PREVIEW_MODE` only
- `app/(clinic)/live-feed.tsx` `CameraStatusPanel` — added cleanup return to `Animated.loop` `useEffect`; orphaned animation loop in Hermes (release JS engine) after component unmount was a secondary crash cause

### Added
- `UVCModule.kt` — corrected all event names to match JS listeners: `onFrame`, `onCameraConnected`, `onCameraDisconnected`; added `onCameraFormats` event (fires with supported sizes JSON after `camera.open()`); added `getSupportedFormats()` `@ReactMethod`
- `lib/thermal/uvcCamera.ts` — `onCameraFormats(callback)` listener function; `getSupportedFormats()` async query
- `app/(clinic)/live-feed.tsx` — `CameraStatusPanel` component: animated pulsing dot, live FPS counter, Y16 sanity check warning banner (fires when <50% pixels in 10–60°C human range), retry button (`retryKey` re-triggers camera setup useEffect), format debug row with supported sizes from camera
- `_project-docs/hardware-references.md` — hardware reference document: all 6 hardware links, hardware stack diagram, UVC format descriptor table (YUYV/Y16/GREY/RGB565/BGR3), Y16 byte format + Kelvin conversion, libuvccamera constants, known Y16 integration gap, PureThermal + Lepton specs, USB device filter confirmation

---

## [0.9.5] — 2026-04-25

### Added — Thermal Image Storage to Supabase
- `types/index.ts` — `image_url?: string` added to `ThermalCapture` interface
- `app/(clinic)/clinical-data.tsx` — bilateral thermal capture loop: inserts two separate `thermal_captures` rows (left + right) each with real per-foot `getMatrixStats()` stats and angiosome means; uploads PNG to `thermal-images/{session_id}/{foot}.png` in Supabase Storage before each insert; upload failure is non-fatal (`image_url = null`)
- Supabase: `ALTER TABLE thermal_captures ADD COLUMN image_url TEXT`; `thermal-images` private Storage bucket; authenticated upload + read RLS policies

---

## [0.9.4] — 2026-04-08

### Added — Real UVC Camera + App Rename

#### HW-01 — libuvccamera-release.aar (FLIR Lepton 3.5 via PureThermal Mini Pro)
- Built `libuvccamera-release.aar` from saki4510t/UVCCamera after fixing incompatibilities with modern toolchain:
  - `build.gradle` — AGP `3.1.4` → `7.4.2`; dead `jcenter()` → `mavenCentral()`/`google()`; SDK 27 → 33
  - `gradle-wrapper.properties` — Gradle `8.5` → `7.6.3`
  - `gradle.properties` — removed `-XX:MaxPermSize=512m` (incompatible with Java 17+)
  - `Application.mk` — removed deprecated ABIs (`armeabi`, `mips`); kept `arm64-v8a`, `armeabi-v7a`, `x86_64`; platform `android-14` → `android-21`
  - `USBMonitor.java` — Added `PendingIntent.FLAG_IMMUTABLE` for Android 12+ (API 31+); was causing runtime crash on modern devices
- `android/app/libs/libuvccamera-release.aar` — AAR placed in Vestigia libs directory
- `android/app/build.gradle` — Added `fileTree(libs)`, `support-v4:27.1.1`, `support-annotations:27.1.1`, `com.serenegiant:common:2.12.4` (excludes `support-v4` to prevent duplicates)
- `android/gradle.properties` — Added `android.enableJetifier=true` (migrates AAR's `android.support.*` bytecode to AndroidX)
- `android/build.gradle` — Added `maven { url 'https://raw.github.com/saki4510t/libcommon/master/repository/' }` for `serenegiant:common` runtime dep
- `android/app/src/main/java/com/anonymous/vestigia/UVCModule.kt` — Full implementation: `USBMonitor` device lifecycle, `UVCCamera` open + preview (160×120 YUYV), `IFrameCallback` encodes raw bytes as Base64 and emits `UVCFrame` event to JS; handles connect/disconnect/permission; auto-requests permission for already-plugged-in devices on `connect()`

#### App Rename
- `app.json` — `"name": "Lumenai"` → `"name": "Lumen AI"`
- `constants/strings.ts` — `app.name`, `app.versionFooter`, `auth.loginFooter` updated to "Lumen AI"
- `android/app/src/main/res/values/strings.xml` — `app_name` updated to "Lumen AI"

---

## [0.9.3] — 2026-04-07

### Added — Patient Registration + Admin Cleanup
- `app/(clinic)/register-patient.tsx` — new patient registration screen: Patient Code (required), Date of Birth (YYYY-MM-DD, validated), Sex (segmented: Male/Female/Other), Diabetes Type (segmented: Type 1/2/Gestational/Unknown), Diabetes Duration in years (numeric, 0–100 validated), Notes (optional multiline); inserts to `patients` table with `clinic_id` from auth user; handles `23505` duplicate code with friendly message; on success auto-selects new patient and navigates directly to `/(clinic)/live-feed`

### Changed
- `app/(admin)/settings.tsx` — removed Notifications row (and divider) from Account section; removed version footer (`{S.app.name} Admin · {S.app.version}`); now matches clinic/patient settings style
- `app/(clinic)/patient-select.tsx` — added `person-add-outline` icon in Header navigating to `/(clinic)/register-patient`; empty state (when no search active) shows "Register First Patient" button; added `Button` import
- `app/(clinic)/_layout.tsx` — registered `register-patient` as hidden `Tabs.Screen`

---

## [0.9.2] — 2026-04-07

### Added — Settings Redesign + Profile Screens
- `app/(clinic)/profile.tsx` — new profile screen: avatar (photo or initials fallback), "Change Photo" button, editable display name (saves to `profiles` table + updates Zustand store immediately), read-only account info (email, clinic name from `clinics` table, member since, account status), Deactivate Account in Danger Zone
- `app/(patient)/profile.tsx` — same structure as clinic profile; role badge says "Patient"; no clinic field; Deactivate message references clinic instead of admin
- `app/(clinic)/privacy-policy.tsx` — 8-section privacy policy: overview, data collected, how we use it, storage & security (RLS/TLS/AES-256), data sharing, retention, user rights (RA 10173), changes
- `app/(clinic)/terms-of-service.tsx` — 10-section ToS: acceptance, authorized use, clinical disclaimer (warning banner), account responsibilities, data handling obligations, IP, liability, termination, changes, governing law
- `app/(clinic)/contact-support.tsx` — 3 contact channel cards, app info table, expandable FAQ accordion (5 questions), response times table
- `app/(patient)/privacy-policy.tsx`, `app/(patient)/terms-of-service.tsx`, `app/(patient)/contact-support.tsx` — patient route group versions (same content)
- `supabase/migrations/20260407_avatar_support.sql` — migration: `ALTER TABLE profiles ADD COLUMN avatar_url TEXT`, create `avatars` Storage bucket (public), 4 Storage RLS policies (public SELECT, owner-only INSERT/UPDATE/DELETE)
- `expo-image-picker` — installed (SDK 54 compatible); plugin added to `app.json` with camera + photo library permission strings

### Changed
- `app/(clinic)/settings.tsx` — removed Notifications, Haptic Feedback, AI Model rows; removed version footer; removed Deactivate Account (moved to Profile); Profile row now pushes to `/(clinic)/profile`; Privacy Policy, Terms of Service, Contact Support now navigate to real screens; Danger Zone contains only Sign Out
- `app/(patient)/settings.tsx` — full rewrite: proper sectioned layout (Account, Application, About, Danger Zone) matching clinic style; removed Notifications, old flat list; Profile → `/(patient)/profile`; Privacy Policy, ToS, Contact Support navigate to patient screens
- `app/(clinic)/history.tsx` — Cloud tab header now shows operator avatar (`rightIcon`): profile photo if set, initials fallback if not; Local tab header unchanged
- `app/(clinic)/_layout.tsx` — registered `profile`, `privacy-policy`, `terms-of-service`, `contact-support` as hidden `Tabs.Screen` entries
- `app/(patient)/_layout.tsx` — registered `profile`, `privacy-policy`, `terms-of-service`, `contact-support` as hidden `Tabs.Screen` entries
- `types/index.ts` — `AuthUser` interface: added `avatar_url?: string`
- `app/(clinic)/patient-select.tsx` — back button (`chevron-back`) added to Header
- `app/(clinic)/clinical-data.tsx` — back button added to Header; Ionicons import added
- `app/(clinic)/pairing.tsx` — back button added to Header; `useRouter` import added
- `app/(clinic)/dpn-result.tsx` — back button added to main result view Header
- `app/(auth)/update-password.tsx` — floating back arrow above the form in non-done state; hidden once password is updated (done state already has "Back to Sign In")

### Pending
- `npx expo run:android` rebuild required to activate `expo-image-picker` native module (also required for `react-native-ble-plx`)

---

## [0.9.1] — 2026-04-06

### Added — Thermal Image + CSV File Import
- `expo-document-picker` + `expo-file-system` installed (SDK 54 compatible)
- `lib/thermal/preprocessing.ts` — Added `parseCsvMatrix(csv)`: parses comma/tab-separated rows of °C floats into a `ThermalMatrix`; skips non-numeric header rows; any dimensions
- `lib/thermal/preprocessing.ts` — Added `matrixToStorageB64(matrix)`: encodes a `number[][]` as base64 JSON for local SQLite storage (non-Y16 path)
- `lib/thermal/preprocessing.ts` — Added `parseStoredMatrix(b64)`: auto-detects JSON-encoded matrix vs raw Y16 frame and decodes accordingly
- `app/(clinic)/live-feed.tsx` — "or import from files" section below capture controls: image card (JPG/PNG, shows thumbnail preview) + CSV card (parses to matrix, drives ThermalMap); "Use Imported Data" CTA captures and routes to clinical-data
- `app/(offline)/live-feed.tsx` — Same import section; imported CSV matrix encoded via `matrixToStorageB64` for local SQLite; routes to offline save screen
- `app/(patient)/index.tsx` — Import controls inside "Latest Thermal Scans" card: Thermal Image + Left CSV + Right CSV picker cards; imported matrices replace mock thumbnails in real time; reference image shown as full-width strip

### Changed
- `app/(clinic)/sync.tsx` — `parseY16Frame` replaced with `parseStoredMatrix` to support both Y16 frames and CSV-imported matrices during sync upload

## [0.9.0] — 2026-04-06

### Added — DPN Classification API Integration (FR-507)
- `lib/dpnApi.ts` — Typed API client for `https://charlesgaid-dpn-classification-api.hf.space`; `checkServerHealth()` + `scanPatient()`; 60s `AbortController` timeout; maps HTTP 400/500/503/408 to user-facing error messages
- `store/dpnStore.ts` — Zustand slice with `status: 'idle' | 'loading' | 'success' | 'error' | 'server_waking'`, `result`, `error`; `startScan()` health-checks server (polls every 5s up to 60s if models not loaded), then calls API; `clearScan()` resets state
- `lib/thermal/thermalPng.ts` — Pure-JS PNG encoder; converts thermal `number[][]` matrix → base64 PNG using Iron colormap (matches `ThermalMap.tsx`); CRC32 + Adler32 + DEFLATE stored blocks; no native dependencies
- `app/(clinic)/dpn-result.tsx` — DPN result screen: large DPN Detected/No DPN Detected banner, per-foot prediction cards, temperature asymmetry with clinically significant warning, diagnosis factors list, clinical note disclaimer, Save to Cloud / Discard Result actions

### Changed
- `store/sessionStore.ts` / `useThermalStore` — Added `leftMatrix`, `rightMatrix`, `leftImageB64`, `rightImageB64`, `captureLeft()`, `captureRight()`, `clearBilateral()` (additive — no existing fields changed)
- `app/(clinic)/live-feed.tsx` — Two-step bilateral capture replacing single-frame flow; step indicator (Left Foot → Right Foot) with checkmarks; capture button colour/label changes per step; imported image files converted to base64 via `expo-file-system`; live/CSV path generates PNG via `thermalMatrixToPngB64`; `thermalStore.capture("bilateral")` still called for `clinical-data.tsx` backward compat
- `app/(clinic)/assessment.tsx` — Removed mock data and fake 3.5s progress bar; reads bilateral captures from thermalStore; calls `startScan()` on mount; breathing indeterminate progress animation; colour shifts to amber during `server_waking`; navigates to `dpn-result` on success; error state with Retry / Cancel
- `app/(clinic)/dpn-result.tsx` — Added save-to-cloud: inserts to `classification_results`, updates session to `completed`, routes back to live-feed with `lastSessionId`; full cleanup of session + bilateral stores on save or discard
- `app/(clinic)/_layout.tsx` — Registered `dpn-result` as hidden `Tabs.Screen`

### Known Gaps (deferred)
- Angiosome-level fields (`asymmetry_mpa_c` etc., `angiosomes_flagged`, `bilateral_tci`) saved as `null` — API returns summary asymmetry only, not per-angiosome breakdown
- `model_version` hardcoded as `"dpn-api-v1"` — API does not return a version string
- GAP-08 (angiosome thermal overlay) still deferred

---

## [0.8.0] — 2026-04-06

### Added — Dual Camera Support (FLIR + ESP32 Wi-Fi)
- `lib/thermal/bleCamera.ts` — Real BLE scanning via `react-native-ble-plx`; filters `ESP32-Thermal*` devices; connects and reads WiFi IP from BLE characteristic (`0000ffe1-...`); exports `requestBlePermissions`, `scanBle`, `connectBle`, `disconnectBle`, `destroyBleManager`
- `lib/thermal/wifiCamera.ts` — WebSocket stream client for Waveshare ESP32 MIO802M5S; binary frame protocol: `TM` magic + uint16 width/height + pixel data (uint16 LE, value = temp × 100); exports `connectWifi`, `disconnectWifi`, `onWifiFrame`, `pingWifi`
- `store/sessionStore.ts` / `useDeviceStore` — Added `cameraSource: CameraSource`, `wifiIp`, `wifiPort`, `setCameraSource`, `setWifiIp`, `setWifiPort`; `disconnect()` now resets camera source to `"uvc"`
- `types/index.ts` — Added `CameraSource = "uvc" | "wifi"` union type
- `constants/strings.ts` — Added all WiFi/FLIR/BLE pairing strings to `S.pairing`: sections, labels, states, error messages
- `android/app/src/main/AndroidManifest.xml` — Added Android BLE permissions: `BLUETOOTH_SCAN` (neverForLocation), `BLUETOOTH_CONNECT`, `BLUETOOTH`/`BLUETOOTH_ADMIN` (maxSdkVersion 30), `ACCESS_FINE_LOCATION`, `bluetooth_le` feature declaration

### Changed
- `app/(clinic)/pairing.tsx` — Full rewrite: Active Camera Source card (FLIR vs ESP32), FLIR info section, ESP32 WiFi section (IP + port inputs, Test / Connect / Disconnect), BLE Discovery section (real scan + device list + connect), USB Device Registration retained; all backed by real BLE + WiFi libs
- `app/(clinic)/live-feed.tsx` — Camera setup `useEffect` now branches on `cameraSource`: `"wifi"` uses `onWifiFrame` + `connectWifi`; `"uvc"` uses existing UVC bridge; FPS badge shows `"FLIR · N fps"` or `"ESP32 · N fps"`

### Removed
- `app/(clinic)/session/[id].tsx` — Removed unused drill-down screen (no UI entry point)
- `app/(patient)/session/[id].tsx` — Removed unused drill-down screen (no UI entry point)
- `app/(clinic)/_layout.tsx` — Removed `session` Tabs.Screen entry that was rendering a blank 5th tab beside Settings
- `app/(clinic)/history.tsx` — Removed session detail `onPress` from session cards
- `app/(patient)/index.tsx` — Removed session detail `onPress` from session cards
- Mock BLE code (`MOCK_BLE_DEVICES`, fake setTimeout pairing) from `pairing.tsx`

### Pending Manual Steps (not automated)
- `npx expo run:android` — required to rebuild with `react-native-ble-plx` native module
- ESP32 firmware must advertise as `ESP32-Thermal*`, expose BLE service `0000ffe0-...` with IP char `0000ffe1-...`, run WebSocket server on port 8080 with TM binary frame protocol

---

## [0.7.0] — 2026-04-06

### Added
- Full light/dark theme system (`ThemeProvider` + `useTheme()` hook) with Arctic Mint color palette
- `constants/ThemeContext.tsx` — `ThemeProvider`, `useTheme()`, `lightColors`, `darkColors`, `ThemeColors` interface
- `constants/strings.ts` — `S` object for all static UI text; `app.name = "Lumenai"`, `app.version = "v0.6.0"`

### Changed
- App display name: `"vestigia"` → `"Lumenai"` in `app.json`
- All 24 screens and all shared components migrated from static `Colors.*` imports to `useTheme()` hook
- `components/session/index.tsx` — `statusConfig` color values changed from static strings to functions `(colors) => string` for dynamic theming
- `components/assessment/index.tsx` — `TCIItem` and `AnnotItem` receive color props from parent component
- `components/thermal/index.tsx` — `AnnotItem` receives `textSecColor` as prop

### Removed
- Legacy `Colors` export from `constants/theme.ts` (all consumers migrated)

### Fixed
- **BUG-06** — `THUMB_H` ratio corrected from `(62 / 80)` to `(120 / 160)` in 4 files: `app/(patient)/index.tsx`, `app/(clinic)/assessment.tsx`, `app/(patient)/session/[id].tsx`, `app/(clinic)/session/[id].tsx` — was showing thermal thumbnails too short for FLIR Lepton 3.5 (160×120 resolution)

---

## [0.6.0] — 2026-04-05

### Added — UVC Camera Integration
- `android/app/src/main/java/.../UVCModule.kt` — Native Kotlin module for saki4510t/UVCCamera (JitPack); emits Y16 Base64 frames at 160×120 to JS
- `android/app/src/main/java/.../UVCPackage.kt` — ReactPackage registration
- `android/app/src/main/res/xml/usb_device_filter.xml` — VID=0x1e4e, PID=0x0100 (PureThermal Mini Pro)
- `android/app/build.gradle` — JitPack UVCCamera dependency
- `android/app/src/main/AndroidManifest.xml` — USB host feature declaration + device-attached intent filter
- `lib/thermal/uvcCamera.ts` — JS bridge: `connectCamera()`, `disconnectCamera()`, `onFrame()`, `onCameraConnected/Disconnected()`
- `app/(clinic)/live-feed.tsx` — Rewritten to consume real UVC frames; capturedRef stale-closure fix; rolling FPS counter; camera status states; disabled capture when no camera

### Added — Thermal Preprocessing (FR-506)
- `lib/thermal/preprocessing.ts` — `parseY16Frame()` (Base64 Y16 → 160×120 °C matrix), `normalizeMatrix()`, `segmentFootRegion()` (ambient+2°C threshold), `getMatrixStats()`, `buildApiPayload()`

### Added — Offline-First Feature
- `app/mode-select.tsx` — Unauthenticated entry point: Go Online (→ login) | Work Offline (→ offline capture)
- `app/(offline)/_layout.tsx` — Stack navigator for offline screens
- `app/(offline)/live-feed.tsx` — Offline thermal capture using UVC; captures B64 frame to params
- `app/(offline)/save.tsx` — Patient label (required) + optional vitals; saves to local SQLite via `saveCapture()`
- `lib/db/localDb.ts` — `getDb()`, `migrate()` (schema v1), `generateLocalId()` (`OFF-YYYYMMDD-XXXX`)
- `lib/db/offlineCaptures.ts` — `saveCapture`, `getCaptureById`, `getAllCaptures`, `getUnsyncedCaptures`, `markSynced` (WHERE synced=0 guard), `deleteCapture`
- `app/(clinic)/history.tsx` — Rewritten: Cloud|Local pill toggle; Local view with unsynced badges and Sync button; unsyncedCount badge on tab pill
- `app/(clinic)/sync.tsx` — Patient search by code (ilike), parse stored B64 matrix, upload session + captures + vitals to Supabase, insert `data_request`, call `markSynced()`
- `app/(patient)/sync.tsx` — List pending `data_requests`, show clinic/date/foot/temps; Accept → status=accepted; Reject → confirmation → status=rejected
- `app/(patient)/index.tsx` — Notification bell in header with pending request count badge; navigates to sync screen
- `types/index.ts` — Added `LocalCapture` and `DataRequest` interfaces

### Added — Risk Scoring (FR-508)
- `lib/classification/riskScoring.ts` — `computeRiskLevel(asymmetry)`: HIGH ≥ 2.2°C, MEDIUM ≥ 1.5°C, LOW otherwise; `computeRiskLevelFromResult(result)`; `getRiskLevelDescription(level)`

### Fixed
- **GAP-18** `app/(admin)/users.tsx` + `app/(admin)/clinics.tsx` — `handleToggleActive()` now calls `Alert.alert("Update Failed", ...)` when Supabase `.update()` returns an error; previously silent

### Removed
- `@nozbe/watermelondb` + `@nozbe/with-observables` removed from `package.json`
- `/android` removed from `.gitignore` (bare workflow with custom native modules)

---

## [0.5.3] — 2026-03-30

### Fixed — QA Sweep
- **UX-17** `app/(clinic)/pairing.tsx`, `patient-select.tsx`, `live-feed.tsx`, `assessment.tsx`, `clinical-data.tsx`, `history.tsx`, `settings.tsx`, `app/(admin)/index.tsx` — Removed all debug subtitle strings (`"UI-02"` through `"UI-08"`) from Header components; no longer visible in production
- **GAP-15** `app/(clinic)/history.tsx` — Fixed PostgREST join normalization; `getClassification()` helper now handles both array and object join results; positive/negative session counts now accurate
- **GAP-16** `app/(admin)/users.tsx` — `fetchUsers()` now destructures `error`; shows `fetchError` state to user on failure
- **GAP-17** `app/(admin)/clinics.tsx` — `fetchClinics()` same fix as GAP-16
- **UX-15** `app/(clinic)/index.tsx` — Added `statsLoading` state + `ActivityIndicator` while today's stats load
- **UX-16** `app/(clinic)/index.tsx` — Added `statsError` state + visible error text when clinic/sessions fetch fails
- **CODE-16** `lib/debug.ts` — `dbg()` now guards with `if (!__DEV__) return`; no debug logs in production builds
- **A11Y-05** `app/(clinic)/_layout.tsx` — Added `tabBarAccessibilityLabel` to all 5 `Tabs.Screen` entries
- **CODE-14** `app/(auth)/login.tsx` — Version string updated to `v0.5.2`
- **NAV-03** `app/(patient)/index.tsx` — Settings icon added to patient dashboard header; `/(patient)/settings` now reachable
- **PERF-09** `app/(clinic)/history.tsx` — `renderItem` extracted into `useCallback`
- **PERF-10** `app/(admin)/users.tsx` — `renderItem` extracted into `useCallback`
- **PERF-11** `app/(admin)/clinics.tsx` — `renderItem` extracted into `useCallback`

---

## [0.5.2] — 2026-03-24

### Fixed
- **assessment.tsx** — Added unmount cleanup `useEffect` that calls `clearSession()` + `discardCapture()` if user navigates away before saving; guards stale session state
- **patient-select.tsx** — Replaced two-state client-side `.filter()` + second `useEffect` with single Supabase `.ilike()` query on `patient_code`; scales to any number of patients

### Added
- **types/index.ts** — `risk_level?: "LOW" | "MEDIUM" | "HIGH"` added to `ClassificationResult`; ready for FR-508

### Documentation
- Full codebase QA audit run; 0 regressions found; 21 open issues confirmed (no change from v0.5.1)
- All progress docs (`qa-bugs.md`, `ui-checklist.md`, `fr-checklist.md`, `data-checklist.md`) updated to 2026-03-24

---

## [0.5.1] — 2026-03-21

### Changed
- `app/(clinic)/_layout.tsx` — Removed text labels from tab bar icons (icon-only navigation)
- `app/(clinic)/_layout.tsx` — `patient-select` hidden from tab bar; accessible only via Home quick actions

---

## [0.5.0] — 2026-03-21

### Added
- `lib/debug.ts` — timestamped debug logger `dbg(tag, msg, data?)` using `APP_START` baseline for relative timing; used across auth, screens, and stores to trace cold-start sequence

### Fixed — Supabase Backend Wiring
- **GAP-07** `app/(clinic)/assessment.tsx` — "Save to Cloud" now inserts to `classification_results` and updates `screening_sessions.status = "completed"`
- **GAP-09** `app/(clinic)/history.tsx` — Replaced `MOCK_CLINIC_SESSIONS` with live Supabase query filtered by `clinic_id`
- **GAP-10** `app/(admin)/users.tsx` — Replaced `MOCK_ALL_USERS` with real `profiles` table query; Activate/Deactivate now calls `supabase.from("profiles").update()`
- **GAP-11** `app/(admin)/clinics.tsx` — Replaced `MOCK_CLINICS` + `MOCK_DEVICES` with real `clinics` + `devices` tables; Activate/Deactivate wired to Supabase
- **UX-07** `app/(clinic)/session/[id].tsx` + `app/(patient)/session/[id].tsx` — Both session detail screens now load real session from Supabase joining `classification_results`, `patient_vitals`, `thermal_captures`
- **UX-08** `app/(admin)/users.tsx` + `app/(admin)/clinics.tsx` — Activate/Deactivate modal buttons now call Supabase `.update()` instead of only closing modal
- **CODE-11** `app/(clinic)/index.tsx` — Clinic name and today's session stats now loaded from Supabase (`clinics` + `screening_sessions` tables); removed hardcoded "Cebu City Health Center"
- **BUG-05** `app/(clinic)/live-feed.tsx` — Foot selector buttons wired with `onPress`; active style now mirrors `selectedFoot` state correctly
- `app/(admin)/index.tsx` — Overview stats (sessions, positive cases, clinics, users) wired to real Supabase counts (S-01)
- `app/(admin)/index.tsx` — Clinic cards on admin dashboard now navigate to `/(admin)/clinics` on tap (N-02)

### Fixed — Startup Performance
- **PERF-05** `app.json` — `"output": "static"` → `"output": "single"`; removes Expo Router Node.js SSR pre-render; fixes `window is not defined` crash on Metro start
- **PERF-06** `lib/supabase.ts` — Supabase client lazy-initialized via `Proxy`; defers `createClient()` and `AsyncStorage` initialization until first use; eliminates 5+ second startup block
- **PERF-07** `lib/supabase.ts` — Proxy `get` trap binds methods to client instance; fixes silent failures from lost `this` context on `supabase.from()` calls
- **PERF-08** `store/authStore.ts` — Removed blocking `getSession()` call; auth now resolved via `INITIAL_SESSION` event using JWT `user_metadata`; cold start reduced to <1 second with no DB round-trip
- **NAV-02** `app/index.tsx` — Replaced `useEffect + router.replace()` with `<Redirect>` component; fixes "Attempted to navigate before mounting Root Layout" crash on cold start

### Fixed — UX
- **UX-14** Icon standardization — All emoji characters and unclear Unicode symbols (`⌂ ◈ 📷 📋 ⚙ 📡 🧠 ⏱ 📊 📄 ⚠ ✓ › ← →`) replaced with `@expo/vector-icons` Ionicons across all 20 affected files; brand logo `◈` in auth screens replaced with `pulse-outline` Ionicons
- `app/(patient)/index.tsx` — Added `PGRST116` guard; no linked patient record now shows empty state instead of error screen
- `app/(clinic)/index.tsx` + `app/(patient)/index.tsx` — Logout button added to header via `rightIcon` prop using `Ionicons log-out-outline`
- `app/(clinic)/_layout.tsx` — `TabIcon` component rewritten to use `<Ionicons>` with typed `keyof typeof Ionicons.glyphMap` prop; removed `<Text>` emoji rendering

---

## [0.4.0] — 2026-03-21

### Added
- `hooks/useInactivityTimeout.ts` — 30-minute inactivity session timeout (FR-104, BUG-04); resets on touch, logs out if app backgrounded ≥30 min; wired in `app/_layout.tsx` via `View.onTouchStart`

### Fixed
- **UX-04** `app/(clinic)/settings.tsx` — All handlers wired: Sign Out (confirm dialog), Change Password → update-password, Paired Device/Scan → pairing, Clear Cache (destructive confirm), Delete Account (destructive confirm); all emoji icons replaced with Ionicons
- **UX-06** `app/(admin)/settings.tsx` — Sign Out with confirmation dialog, Change Password → update-password, all stub handlers → "Coming Soon" alerts; emoji icons replaced with Ionicons
- **CODE-02** — Audited all `console.` usage across 51 files; only non-sensitive `console.error` in WatermelonDB setup; no sensitive data logged

### Documentation
- `_project-docs/progress/qa-bugs.md` — Full codebase audit: 55 total issues tracked (37 fixed, 18 open); new findings: BUG-05, GAP-09–11, UX-07 expanded, UX-08, CODE-11
- `.claude/commands/end-session.md` — Added steps 8 (qa-bugs.md sync) and 9 (session log creation)
- `_project-docs/how-to-use.md` — Updated to reflect new /end-session behavior and sessions/ folder

---

## [0.3.0] — 2026-03-20

### Added
- `app/(auth)/account-activated.tsx` — Account activation success screen shown after email confirmation on mobile; routes to login on button press
- `supabase/functions/auth-redirect/index.ts` — Edge Function serving a Vestigia-themed HTML redirect page: auto-opens the app on mobile, shows "Open on Your Phone" on desktop
- `app/(patient)/settings.tsx` — Patient settings screen with Edit Profile, Change Password, Notifications, and Sign Out

### Fixed
- `_layout.tsx` deep link handler now routes email confirmation to `/(auth)/account-activated` instead of directly to dashboard
- `_layout.tsx` deep link handler handles both implicit (`#access_token`) and PKCE (`?code=`) confirmation flows
- `store/authStore.ts` — `emailRedirectTo` in `signUp` now points to Edge Function URL so confirmation email opens the app, not a Supabase web page

---

## [0.2.0] — 2026-03-20

### Added
- `app/(auth)/update-password.tsx` — Password reset screen (AUTH-02)
- `app/(auth)/forgot-password.tsx` — Ionicons for lock/mail/back icons
- `app/(auth)/register.tsx` — Ionicons for role selector and password toggle
- `app/(auth)/login.tsx` — Ionicons for password toggle eye icon
- Client-side rate limiting on login: 5 failed attempts → 30-second lockout (AUTH-06)
- `supabase/functions/auth-redirect/` directory structure initialized

### Fixed
- **AUTH-04** `register.tsx` — Password validation now shows all failing rules simultaneously instead of only the last one
- **AUTH-08** `login.tsx` — Login no longer blocks users with valid passwords under 8 characters; only checks field is non-empty
- **AUTH-09** `login.tsx`, `register.tsx` — Added `default` case to role routing switches; unknown roles fall back to login instead of silent freeze
- **AUTH-10** `register.tsx` — `selectedClinicId` resets when switching between Patient and Clinic roles
- **AUTH-11** `update-password.tsx` — Session guard on mount; shows error and disables form if no valid reset token present
- **AUTH-12** `_layout.tsx` — Deep link condition narrowed from overly broad `includes()` check to exact `vestigia://update-password` + `access_token` match
- **AUTH-13** `authStore.ts` — `onAuthStateChange` subscription stored in module-level variable and cleaned up on re-init (guards HMR double-subscribe)
- **AUTH-14** `authStore.ts` — `pendingClinicId` only stored when registering role is `clinic`; `logout()` uses `try-finally` so local state always clears
- **AUTH-15** `authStore.ts` — PostgREST `PGRST116` (no profile row) mapped to friendly "Account setup is incomplete" message
- **AUTH-01** `authStore.ts` — `resetPasswordForEmail` now includes `redirectTo: 'vestigia://update-password'`
- **AUTH-03** `_layout.tsx` — Deep link handler added for password reset (`type=recovery`) and email confirmation flows
- **AUTH-05** `authStore.ts` — Mock accounts fully removed; all auth through Supabase
- `components/layout/ScreenWrapper.tsx` — Replaced deprecated `SafeAreaView` from `react-native` with `SafeAreaView` from `react-native-safe-area-context`
- `store/authStore.ts` — Graceful error handling for 504/503/502, network errors, rate limits, and raw PostgREST messages via `mapAuthError()`
- `babel.config.js` — Removed duplicate `@babel/plugin-proposal-decorators` and `@babel/plugin-proposal-class-properties` that caused "Cannot assign to read-only property 'NONE'" crash
- `app/(clinic)/pairing.tsx` — BUG-01: "Proceed" button now navigates to `/(clinic)/live-feed`
- `app/(clinic)/live-feed.tsx` — BUG-02: "Use This Frame" navigates to `/(clinic)/clinical-data`; thermalStore wired
- `app/(clinic)/clinical-data.tsx` — BUG-03: Submit navigates to `/(clinic)/assessment`; Cancel returns to `/(clinic)`
- Input fields across all auth screens — removed label props, use placeholder text only
- `types/index.ts` — Added missing fields: `AuthUser.phone`, `ScreeningSession.app_version`, `PatientVitals.recorded_at`, `ThermalCapture.resolution_x/y`, `ClassificationResult.feature_vector`

---

## [0.1.0] — 2026-03-20

### Added
- Initial UI implementation for all three roles: Clinic, Patient, Admin
- Expo Router file-based navigation with role-based route groups
- Zustand stores: authStore, sessionStore, deviceStore, thermalStore
- Supabase authentication integration (login, register, logout, session restore, password reset)
- Custom theme system (dark navy + teal palette) in `constants/theme.ts`
- Component library: ScreenWrapper, Card, Badge, Button, Input, ThermalMap, ClassificationCard, etc.
- Mock data system for dev/demo (`data/mockData.ts`)
- TypeScript type definitions (`types/`)
- CLAUDE.md with session protocols, coding standards, and memory bank system
- Memory bank (`memory-bank/`) with 8 project context files
- CHANGELOG.md (this file)
- MCP connection to Supabase via postgres pooler
- File path comments on all source files
- Coding standards, security rules, and comment style guide in CLAUDE.md

### Architecture
- React Native 0.81.5 + Expo 54 + Expo Router 6
- Supabase project: `yqgpykyogvoawlffkeoq` (ap-northeast-2)
- 8 database tables confirmed: profiles, patients, clinics, devices, patient_vitals, screening_sessions, thermal_captures, classification_results

---
