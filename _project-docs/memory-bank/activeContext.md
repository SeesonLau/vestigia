# Active Context — Lumenai (formerly Vestigia)
**Last updated:** 2026-04-07

---

## What Was Done This Session (2026-04-07) — v0.9.3

### npx expo run:android
- User confirmed native rebuild is complete — `react-native-ble-plx` and `expo-image-picker` are now active.

### Admin Settings Cleanup
- `app/(admin)/settings.tsx` — removed `Notifications` row (and its divider) from Account section
- `app/(admin)/settings.tsx` — removed version footer (`{S.app.name} Admin · {S.app.version}`) from bottom
- Admin settings now matches clinic/patient style: no clutter, no version footer

### Patient Registration Form
- `app/(clinic)/register-patient.tsx` — new screen with full registration form:
  - Patient Code (text, required, auto-caps)
  - Date of Birth (YYYY-MM-DD text input, format validated)
  - Sex (segmented button group: Male / Female / Other)
  - Diabetes Type (segmented button group: Type 1 / Type 2 / Gestational / Unknown)
  - Diabetes Duration in years (numeric, validated 0–100)
  - Notes (optional multiline)
  - On success: auto-selects the new patient → navigates directly to live-feed
  - Handles Postgres `23505` duplicate code error with a specific message
- `app/(clinic)/patient-select.tsx` — `person-add-outline` icon in header navigates to register-patient; empty state (no search) shows "Register First Patient" button
- `app/(clinic)/_layout.tsx` — `register-patient` registered as hidden `Tabs.Screen`

---

## What Was Done Previous Session (2026-04-07) — v0.9.2

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

### Settings / Profile
- ✅ Clinic, patient, admin settings all cleaned up (no Notifications, no version footers)
- ✅ Profile screens for clinic + patient with DB integration
- ✅ Avatar upload via Supabase Storage (active after native rebuild)
- ✅ Legal screens for both roles

### Patient Registration
- ✅ Clinic staff can register new patients directly from patient-select screen
- ✅ New patient auto-selected after registration → goes straight to live-feed

### Camera / Hardware
- ✅ Native rebuild done — BLE + image picker now active
- ✅ ESP32 Waveshare MIO802M5S (WiFi) — WebSocket stream implemented
- ⚠️ UVCModule.kt is still a stub — needs real libuvccamera-release.aar

### Auth
- ✅ All auth flows working
- ✅ 30-minute inactivity timeout on all roles

---

## Pending Manual Steps
1. End-to-end test: bilateral capture → DPN API → save to Supabase (manual, on device)
2. `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`
3. ESP32 firmware configuration (BLE + WebSocket per protocol spec)

---

## Next Steps (priority order)
1. End-to-end test: full bilateral capture → DPN API → classification result → save to cloud
2. Link `libuvccamera-release.aar` to enable real FLIR Lepton UVC path (HW-01)
3. Verify DPN API PNG encoding accepted by server
