# System Patterns — Vestigia

## Navigation Architecture
- **Expo Router** (file-based routing) with role-based route groups:
  - `/(auth)` — Stack: login, register, forgot-password
  - `/(clinic)` — Bottom tabs: Home, Device, Scan, History, Settings + hidden screens
  - `/(patient)` — Stack: dashboard, session/[id], settings
  - `/(admin)` — Stack: dashboard (with internal tabs)
- `app/index.tsx` is the routing hub — restores session, redirects by role

## State Management
- **Zustand** (no Redux, no Context API)
  - `authStore` — user, login, logout, register, restoreSession
  - `sessionStore` — active screening session
  - `deviceStore` — BLE/WiFi device connection state
  - `thermalStore` — live thermal frames and captures

## Offline-First Pattern
- `/(offline)` route group: `live-feed` → `save` — capture without an account
- Local SQLite via `expo-sqlite` v16 (`lib/db/localDb.ts`, `lib/db/offlineCaptures.ts`)
- `LocalCapture` stored with `synced=0`; `markSynced()` sets `synced=1` + session ID
- `/mode-select` screen: entry point for unauthenticated users (Go Online | Work Offline)
- Clinic sync screen: patient search → upload session → `data_requests` row → `markSynced()`
- Patient sync screen: lists pending `data_requests`, accept/reject

## UVC Camera Pattern (Android)
- Native module `UVCModule.kt` (saki4510t/UVCCamera via JitPack)
- JS bridge: `lib/thermal/uvcCamera.ts` — `connectCamera()`, `onFrame()`, `onCameraConnected/Disconnected()`
- Frames emitted as Base64 Y16 strings → parsed by `parseY16Frame()` → 160×120 °C matrix

## Thermal Data Pipeline
- `lib/thermal/preprocessing.ts`: `parseY16Frame` → `normalizeMatrix` → `segmentFootRegion` → `buildApiPayload`
- `lib/classification/riskScoring.ts`: `computeRiskLevel(asymmetry)` → LOW / MEDIUM / HIGH
  - HIGH: any asymmetry ≥ 2.2°C, MEDIUM: ≥ 1.5°C, LOW: all below
- AI model API (FR-507) — blocked, replaces mock result when endpoint is confirmed

## Component Patterns
- `ScreenWrapper` wraps all screens (handles safe area, optional scroll)
- `StyleSheet.create()` per component file (no CSS-in-JS library)
- Controlled inputs with inline error messages
- Status/Badge variants: `positive | negative | warning | info | muted`

## Supabase Integration Pattern
- Client initialized in `lib/supabase.ts` via env vars
- Auth state synced via `supabase.auth.onAuthStateChange()` in authStore
- AsyncStorage for session persistence across app restarts
- Real data calls go through store actions (not direct in components)

## Theming
- All colors, typography, spacing, radius in `constants/theme.ts`
- Dark navy (#050d1a) + teal accent (#14b08e) palette
- Semantic colors: red = positive DPN (bad), teal = negative DPN (good)
