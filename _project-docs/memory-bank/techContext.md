# Tech Context — Vestigia

## Core Stack
| Layer | Technology | Version |
|---|---|---|
| Framework | React Native + Expo | RN 0.81.5, Expo 54.0.33 |
| Routing | Expo Router | 6.0.23 |
| Language | TypeScript | 5.9.2 (strict) |
| State | Zustand | 5.0.11 |
| Local DB | WatermelonDB | TBD — not yet installed |
| Cloud DB | Supabase | 2.99.2 |
| React | React | 19.1.0 |

## Database Strategy — Offline-First Dual DB
- **Local:** WatermelonDB — offline capture, temporary session storage, queue for sync
- **Cloud:** Supabase (PostgreSQL) — persistent storage, syncs when online
- **Auth:** Supabase built-in auth (`auth.users`) — `profiles` table extends it via FK
- **Sync direction:** Local → Supabase (push on connectivity restore)
- **Full schema:** see `_project-docs/memory-bank/schema.md`

## Supabase
- **Project ref:** `yqgpykyogvoawlffkeoq`
- **Region:** ap-northeast-2 (Asia Pacific - Seoul)
- **Pooler:** `aws-1-ap-northeast-2.pooler.supabase.com:5432` (session mode)
- **MCP:** Configured in `.mcp.json` via `@modelcontextprotocol/server-postgres`
- **Env vars:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Database Tables (Supabase)
- `profiles` — extends auth.users with role (patient/clinic/admin)
- `clinics` — healthcare facilities
- `patients` — patient records linked to clinics (anonymized via patient_code)
- `devices` — thermal imaging hardware (hardware specs TBD)
- `screening_sessions` — scan session lifecycle records
- `thermal_captures` — 80×62 thermal matrix + angiosome temps + TCI
- `patient_vitals` — blood glucose, BP, HbA1c per session
- `classification_results` — AI output, asymmetries, confidence score

## UI & Fonts
- No external UI library — custom StyleSheet components
- **Fonts:** Space Grotesk (400/500/600/700) + Space Mono (400)
- **Icons:** Expo Vector Icons, Expo Symbols, React Native SVG
- **Animations:** Reanimated 4.1.1 + Gesture Handler 2.28.0

## Dev Setup
```bash
npm install
npx expo start
```
Requires `.env.local` with Supabase URL and anon key.

## Mock Accounts (dev/demo)
| Email | Password | Role |
|---|---|---|
| clinic@email.com | 12345678 | clinic |
| admin@email.com | 12345678 | admin |
| patient@email.com | 12345678 | patient |
