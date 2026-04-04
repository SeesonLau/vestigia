# Active Context — Vestigia
**Last updated:** 2026-04-04

---

## What Was Done This Session (2026-04-04)

### UVC Camera Integration
- `android/app/src/main/java/com/anonymous/vestigia/UVCModule.kt` — Native Kotlin module (saki4510t/UVCCamera)
- `android/app/src/main/java/com/anonymous/vestigia/UVCPackage.kt` — ReactPackage registration
- `android/app/src/main/java/com/anonymous/vestigia/MainApplication.kt` — Registered UVCPackage
- `android/app/build.gradle` — JitPack dependency added
- `android/app/src/main/res/xml/usb_device_filter.xml` — VID=0x1e4e, PID=0x0100
- `android/app/src/main/AndroidManifest.xml` — USB host feature + device-attached intent filter
- `lib/thermal/uvcCamera.ts` — JS bridge for native module
- `.gitignore` — Removed `/android` (bare workflow with custom native modules)
- `app/(clinic)/live-feed.tsx` — Rewritten to use real UVC frames

### Thermal Data Pipeline (FR-506 complete)
- `lib/thermal/preprocessing.ts` — `parseY16Frame` (B64 Y16→160×120 °C matrix), `normalizeMatrix`, `segmentFootRegion`, `getMatrixStats`, `buildApiPayload`

### Offline-First Feature (complete)
- `app/mode-select.tsx` — Entry point: Go Online | Work Offline
- `app/(offline)/_layout.tsx` — Stack navigator
- `app/(offline)/live-feed.tsx` — Same UVC logic, saves B64 + metadata to SQLite
- `app/(offline)/save.tsx` — Patient label + optional vitals form, `saveCapture()`
- `lib/db/localDb.ts` — `getDb()`, `migrate()`, `generateLocalId()`
- `lib/db/offlineCaptures.ts` — `saveCapture`, `getCaptureById`, `getAllCaptures`, `getUnsyncedCaptures`, `markSynced`, `deleteCapture`
- `app/(clinic)/history.tsx` — Rewritten: Cloud|Local toggle, local capture cards with sync button
- `app/(clinic)/sync.tsx` — Patient search → upload session to Supabase → data_request → markSynced
- `app/(patient)/sync.tsx` — List pending data_requests, accept/reject
- `app/(patient)/index.tsx` — Notification bell with badge for pending requests
- `types/index.ts` — Added `LocalCapture`, `DataRequest` interfaces
- `package.json` — Removed WatermelonDB

### GAP-18 Fixed
- `app/(admin)/users.tsx` — Alert on Supabase error in handleToggleActive
- `app/(admin)/clinics.tsx` — Alert on Supabase error in handleToggleActive

### FR-508 Complete
- `lib/classification/riskScoring.ts` — `computeRiskLevel(asymmetry)`, `computeRiskLevelFromResult(result)`, `getRiskLevelDescription(level)` — LOW/MEDIUM/HIGH thresholding at 1.5°C / 2.2°C

---

## Current State

### Auth
- ✅ Login, register, logout, session restore all working
- ✅ Password reset + email confirmation deep links working
- ✅ Rate limiting, error mapping, session guards — all done
- ✅ Cold start <1 second (no blocking DB call)

### App
- ✅ Full clinic screening flow: Dashboard → Pair → Patient Select → Live Feed → Clinical Data → Assessment
- ✅ Assessment result saved to `classification_results`
- ✅ Session detail screens read real Supabase data (both clinic + patient)
- ✅ History screen — Cloud (Supabase) + Local (SQLite) toggle
- ✅ Admin users + clinics screens read from Supabase; Activate/Deactivate wired with error alerts
- ✅ 30-minute inactivity timeout on all roles
- ✅ All settings screens fully wired
- ✅ Offline-first: capture → save locally → sync to Supabase → patient accepts
- ✅ UVC camera: Android native module wired, live-feed uses real frames
- ✅ Thermal preprocessing pipeline complete (FR-506)
- ✅ Risk scoring library complete (FR-508)
- ❌ AI model API client (FR-507) — blocked on AI team endpoint confirmation
- ❌ Angiosome overlay on thermal map (GAP-08) — depends on FR-507

### Open Issues
- NAV-01: No back button on assessment (intentional, low priority)
- GAP-08: Thermal map angiosome overlay (deferred, needs FR-507)
- Edge Function not yet deployed

### Pending Manual Steps
- `npm install` — to remove WatermelonDB from node_modules
- `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`

---

## Next Steps (priority order)
1. **FR-507** — AI model API client — waiting on AI team to confirm endpoint URL, request format, response schema, auth method
2. **GAP-08** — Thermal map angiosome overlay — depends on FR-507 response shape
3. **Edge Function deploy** — manual step, run when ready
4. **npm install** — remove WatermelonDB from node_modules

---

## Open Questions
- **AI model API contract** — endpoint URL, request format, response schema, auth method?
- **Preprocessing scope** — does the external AI API expect raw matrices or normalized data?
- **Risk scoring ownership** — does the AI API return `risk_level` directly, or does the app compute it?
