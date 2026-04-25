# Active Context — Lumen AI (formerly Vestigia)
**Last updated:** 2026-04-25

---

## What Was Done This Session (2026-04-25) — v0.9.6

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
- ⚠️ Y16 format gap — libuvccamera Java API has no Y16 constant; camera connects via YUYV (AGC visual data, not temperature). Temperatures will be wrong until JNI bridge to libuvc C API is written.
- ⚠️ Physical device end-to-end test still pending

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
1. Install release APK on physical device; test UVC camera — verify live-feed no longer crashes
2. End-to-end test: bilateral FLIR capture → DPN API → save to Supabase (including `thermal-images` Storage)
3. Y16 JNI bridge — write JNI wrapper calling libuvc C API to select Y16 by GUID `{59313631-0000-0010-8000-00AA00389B71}`; `libuvc.so` already in build outputs
4. `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`
5. ESP32 firmware configuration (BLE + WebSocket per protocol spec)

---

## Next Steps (priority order)
1. Install new APK → verify live-feed screen no longer crashes with camera connected
2. Y16 format JNI bridge (get real temperature data from camera)
3. End-to-end test: bilateral FLIR capture → DPN API → classification result → save to cloud
4. Offline history screen + patient live-feed + patient history (from plan file)
