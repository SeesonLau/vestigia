# Active Context — Vestigia
**Last updated:** 2026-03-20

---

## What Was Done This Session

### Auth — Full Audit + Fixes
- Audited all auth code; found 10 bugs (AUTH-04, AUTH-06, AUTH-08 through AUTH-15)
- Fixed all 10 — see `_project-docs/auth/auth-flow.md` for full details
- Key fixes: login no longer blocks valid passwords, rate limiting added, session guard on update-password, deep link handler tightened, subscription leak patched, pendingClinicId scoped correctly, raw DB errors mapped to friendly messages

### Email Confirmation — Mobile Deep Link Flow
- `emailRedirectTo` in `signUp` now points to a Supabase Edge Function
- Edge Function (`supabase/functions/auth-redirect/index.ts`) serves a Vestigia-themed HTML page:
  - **Mobile:** auto-fires `vestigia://confirm` to open the app
  - **Desktop:** shows "Open on Your Phone" message
- After confirmation deep link fires, app routes to `/(auth)/account-activated` (new screen) instead of directly to dashboard
- User taps "Sign In" from there → goes to login

### UI Fixes
- `app/(patient)/settings.tsx` — was empty (1 line); now a proper settings screen
- `components/layout/ScreenWrapper.tsx` — replaced deprecated RN `SafeAreaView` with `react-native-safe-area-context`

---

## Current State

### Auth
- ✅ Login, register, logout, session restore all working
- ✅ Password reset with deep link (vestigia://update-password)
- ✅ Email confirmation with Edge Function redirect + account-activated screen
- ✅ Rate limiting on login (5 attempts → 30s lockout)
- ✅ All error messages user-friendly (no raw Supabase/PostgREST text)
- ✅ Mock accounts fully removed

### App
- ✅ Clinic navigation flow wired: pairing → live-feed → clinical-data → assessment
- ✅ thermalStore wired to live-feed and clinical-data screens
- ✅ All auth screens use Ionicons (no emoji icons)
- ✅ All 8 DB tables match thesis schema; RLS enabled on all tables
- ✅ TypeScript types aligned with DB columns
- ❌ All session/patient/device data is still mock — no real Supabase reads post-auth
- ❌ WatermelonDB not installed
- ❌ BLE/Wi-Fi device comms not implemented (deferred — hardware not finalized)

### Pending Supabase Dashboard Steps
- Add `https://[project-ref].supabase.co/functions/v1/auth-redirect` to Redirect URLs
- Deploy Edge Function: `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`

---

## Next Steps (priority order)
1. Deploy Edge Function + configure Supabase redirect URL
2. Wire clinic dashboard quick action buttons (UX-01 — all 4 are empty stubs)
3. Wire clinical-data form submit to local DB + Supabase (GAP-05)
4. Install WatermelonDB + define local schema (GAP-06)
5. Build sync logic: WatermelonDB → Supabase
6. Real Supabase reads for sessions, patients, vitals, results (CODE-08)

---

## Open Questions
- What is the AI classification model — local inference or cloud API?
- Is BLE device hardware finalized? (deferred)
