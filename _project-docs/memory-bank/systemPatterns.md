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

## Mock-First Development
- `data/mockData.ts` has mock accounts, patients, clinics, sessions
- `authStore.login()` checks mock accounts first, then falls through to Supabase
- Allows full UI dev and demos without live backend

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
