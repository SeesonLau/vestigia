# Active Context — Lumen AI (formerly Vestigia)
**Last updated:** 2026-04-08

---

## What Was Done This Session (2026-04-08) — v0.9.4

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
- ✅ `UVCModule.kt` fully implemented — emits Y16 Base64 frames to JS
- ✅ Jetifier enabled; serenegiant:common runtime dep added
- ⚠️ Untested on physical device — emulator has no USB host stack

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
1. Install release APK on physical device; test UVC camera with PureThermal Mini Pro
2. End-to-end test: bilateral FLIR capture → DPN API → save to Supabase
3. `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`
4. ESP32 firmware configuration (BLE + WebSocket per protocol spec)

---

## Next Steps (priority order)
1. Test release APK on device — verify UVC frames flow from FLIR → live-feed → assessment
2. End-to-end test: full bilateral capture → DPN API → classification result → save to cloud
3. Offline history screen + patient live-feed + patient history (from plan file)
