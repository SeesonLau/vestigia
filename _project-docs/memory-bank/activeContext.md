# Active Context — Lumenai (formerly Vestigia)
**Last updated:** 2026-04-06

---

## What Was Done This Session (2026-04-06) — v0.9.0

### DPN Classification API Integration (FR-507 — complete)

**Four gaps closed:**

1. **Bilateral capture state** — `useThermalStore` now holds `leftMatrix`, `rightMatrix`, `leftImageB64`, `rightImageB64` plus actions `captureLeft()`, `captureRight()`, `clearBilateral()`

2. **Base64 image generation** — `lib/thermal/thermalPng.ts` (NEW): pure-JS PNG encoder using Iron colormap (matches ThermalMap.tsx); CRC32 + Adler32 + DEFLATE stored blocks; no native dependencies. Imported image files read as base64 via `expo-file-system.readAsStringAsync`.

3. **Correct API payload shape** — `assessment.tsx` now assembles `DPNScanRequest` directly from thermalStore: `left_temperatures`/`right_temperatures` = raw °C matrices; `left_image_b64`/`right_image_b64` = PNG b64 strings. `buildApiPayload()` in `preprocessing.ts` is not used for this path.

4. **Assessment wired to real API** — `assessment.tsx` calls `useDPNStore().startScan()` on mount; shows breathing progress bar; navigates to `dpn-result` on success; error/retry state.

**New files:**
- `lib/dpnApi.ts` — API client (`checkServerHealth`, `scanPatient`)
- `store/dpnStore.ts` — Zustand slice (status, result, error, startScan, clearScan)
- `lib/thermal/thermalPng.ts` — Pure-JS PNG encoder
- `app/(clinic)/dpn-result.tsx` — Result screen with save-to-cloud

**Modified files:**
- `store/sessionStore.ts` — thermalStore extended (additive)
- `app/(clinic)/live-feed.tsx` — Two-step bilateral capture flow
- `app/(clinic)/assessment.tsx` — Real API call, no mock data
- `app/(clinic)/dpn-result.tsx` — Save-to-cloud added
- `app/(clinic)/_layout.tsx` — `dpn-result` registered as hidden screen

---

## What Was Done Previous Session (2026-04-06) — v0.8.0

### Dual Camera Support — FLIR Lepton 3.5 + Waveshare ESP32 MIO802M5S
- `lib/thermal/bleCamera.ts` (NEW) — Real BLE scanning via `react-native-ble-plx`
- `lib/thermal/wifiCamera.ts` (NEW) — WebSocket stream for ESP32; binary TM frame protocol
- `store/sessionStore.ts` — `useDeviceStore` extended with `cameraSource`, `wifiIp`, `wifiPort`
- `app/(clinic)/pairing.tsx` (REWRITE) — Active Camera Source card, FLIR info, ESP32 WiFi, BLE Discovery
- `app/(clinic)/live-feed.tsx` — Camera `useEffect` branches on `cameraSource`

### Session Detail Screens Removed
- `app/(clinic)/session/[id].tsx` — DELETED
- `app/(patient)/session/[id].tsx` — DELETED

---

## Current State

### DPN API Integration
- ✅ `lib/dpnApi.ts` — typed client with 60s timeout + error mapping
- ✅ `store/dpnStore.ts` — full server-waking retry logic (polls every 5s up to 60s)
- ✅ `lib/thermal/thermalPng.ts` — pure-JS PNG encoder (no native rebuild needed)
- ✅ `app/(clinic)/live-feed.tsx` — two-step bilateral capture (Left → Right)
- ✅ `app/(clinic)/assessment.tsx` — real API call, breathing progress, wakes server
- ✅ `app/(clinic)/dpn-result.tsx` — full result display + save-to-cloud

### Camera
- ✅ FLIR Lepton 3.5 (UVC) — native bridge exists; UVCModule.kt is a stub (real AAR not linked)
- ✅ ESP32 Waveshare MIO802M5S (WiFi) — WebSocket stream + BLE auto-discovery implemented
- ⚠️ BLE native module requires `npx expo run:android` rebuild (react-native-ble-plx added in v0.8.0)
- ⚠️ ESP32 firmware requirements: advertise as `ESP32-Thermal*`, BLE service `0000ffe0-...`, IP char `0000ffe1-...`, WebSocket on port 8080

### Auth
- ✅ Login, register, logout, session restore all working
- ✅ Password reset + email confirmation deep links working
- ✅ Rate limiting, error mapping, session guards — all done

### App
- ✅ Full clinic screening flow: Dashboard → Pair → Patient Select → Live Feed (bilateral) → Clinical Data → Assessment → DPN Result
- ✅ Assessment saves real API results to `classification_results`
- ✅ History screen — Cloud (Supabase) + Local (SQLite) toggle
- ✅ Admin users + clinics screens read from Supabase
- ✅ 30-minute inactivity timeout on all roles
- ✅ Offline-first: capture → save locally → sync to Supabase → patient accepts
- ✅ Thermal preprocessing pipeline (FR-506)
- ✅ Risk scoring library (FR-508)
- ✅ FR-507 DPN API integration — COMPLETE
- ❌ Angiosome overlay on thermal map (GAP-08) — API returns summary asymmetry, not per-angiosome

### Open Issues
- NAV-01: No back button on assessment (intentional, low priority)
- GAP-08: Thermal map angiosome overlay (deferred — API does not return per-angiosome data)
- `clinical-data.tsx` saves only one `thermal_captures` row (bilateral); per-foot rows not saved separately

### Pending Manual Steps
- `npx expo run:android` — rebuild required for `react-native-ble-plx`
- `npm install` — to remove WatermelonDB from node_modules
- `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`
- ESP32 firmware configuration (BLE + WebSocket per protocol spec)

---

## Next Steps (priority order)
1. **End-to-end test** — full scan flow on device: bilateral capture → API call → result → save to Supabase
2. **Verify PNG encoding** — confirm server can decode `left_image_b64`/`right_image_b64` (decode + render)
3. **`npx expo run:android`** — rebuild for BLE native module
4. **UVCModule.kt real implementation** — link `libuvccamera-release.aar`
5. **GAP-08** — Thermal map angiosome overlay — decide if `diagnosis_factors` strings are enough or if API needs per-angiosome values
6. **ESP32 firmware** — BLE advertising + WebSocket server per protocol spec
7. **Edge Function deploy** — `npx supabase functions deploy auth-redirect`
