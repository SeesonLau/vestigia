# Active Context — Lumen AI (formerly Vestigia)
**Last updated:** 2026-05-01

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
1. `npx expo run:android` — rebuild required for all Kotlin and JS changes in v0.9.7 + v0.9.8
2. End-to-end test: bilateral FLIR capture → bundle save → CSV viewer → BundleDetailScreen 3-image display
3. End-to-end test: bilateral FLIR capture → DPN API → save to Supabase
4. `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`
5. Delete dead code: `components/thermal/CsvViewerModal.tsx` (replaced by CsvViewerScreen, no longer imported)

---

## Next Steps (priority order)
1. `npx expo run:android` + install APK → physical device test of bilateral capture → isolation → bundle save → CSV viewer
2. Verify Y16 temperature data is correct (TLINEAR vs RAW14 — divide by 100 - 273.15 or raw scaled)
3. End-to-end DPN API flow with real thermal data
4. Clean up dead `CsvViewerModal.tsx`
