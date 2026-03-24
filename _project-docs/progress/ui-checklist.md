# UI Screens Checklist
**Last verified:** 2026-03-24 (full codebase QA audit)

Legend: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Stub/mock

---

| ID | Screen | File | Built | Real Data | Loading | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-01a | Login | `(auth)/login.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Supabase signIn, lockout, error mapping. Hardcoded version "v1.0.0" (CODE-14) |
| UI-01b | Register | `(auth)/register.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Role picker, clinic selector, email confirm flow |
| UI-01c | Forgot Password | `(auth)/forgot-password.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | resetPasswordForEmail wired |
| UI-01d | Update Password | `(auth)/update-password.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Session guard, deep link handler. Duplicate useEffect import (CODE-15) |
| UI-01e | Account Activated | `(auth)/account-activated.tsx` | ✅ | ✅ | N/A | N/A | N/A | Confirm email landing screen |
| UI-02 | Device Pairing | `(clinic)/pairing.tsx` | 🔄 | ❌ | ✅ | ❌ | N/A | UI done; BLE scan/pair are mock with setTimeout |
| UI-03 | Live Thermal Feed | `(clinic)/live-feed.tsx` | 🔄 | ❌ | N/A | N/A | N/A | Renders mock matrix via setInterval. Debug subtitle "UI-03" visible (UX-17) |
| UI-04 | AI Assessment | `(clinic)/assessment.tsx` | 🔄 | ❌ | ✅ | ✅ | N/A | All classification values are MOCK_RESULT (GAP-04, deferred). Debug subtitle "UI-04" visible (UX-17) |
| UI-05 | Clinical Data | `(clinic)/clinical-data.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | VitalsForm + Supabase inserts wired; angiosome preview still mock. Debug subtitle "UI-05" visible (UX-17) |
| UI-06 | Session History | `(clinic)/history.tsx` | ✅ | 🔄 | ✅ | ✅ | ✅ | Real sessions list. positiveCount/negativeCount always 0 — PostgREST join not normalized (GAP-15). Debug subtitle "UI-06" visible (UX-17) |
| UI-06b | Session Detail (clinic) | `(clinic)/session/[id].tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Full detail with PostgREST joins normalized |
| UI-07a | Clinic Settings | `(clinic)/settings.tsx` | ✅ | 🔄 | N/A | N/A | N/A | Device subtitle reads from deviceStore; paired device is mock |
| UI-07b | Patient Settings | `(patient)/settings.tsx` | ✅ | ✅ | N/A | N/A | N/A | Edit Profile + Notifications show Coming Soon alert. Unreachable — no nav push exists (NAV-03) |
| UI-07c | Admin Settings | `(admin)/settings.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Maintenance/Audit Log read/write system_config. Has configError + isLoading states |
| UI-08 | Admin Dashboard | `(admin)/index.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Real stats from Supabase. Has ActivityIndicator + fetchError states. Debug subtitle "UI-08" visible (UX-17) |
| UI-08b | Admin Users | `(admin)/users.tsx` | ✅ | ✅ | ✅ | ❌ | ✅ | Full CRUD modal, activate/deactivate writes to DB. fetchUsers does not destructure error — silent failure (GAP-16) |
| UI-08c | Admin Clinics | `(admin)/clinics.tsx` | ✅ | ✅ | ✅ | ❌ | ✅ | Full clinic + device list, activate/deactivate writes to DB. fetchClinics does not destructure error — silent failure (GAP-17) |
| UI-09 | Patient Dashboard | `(patient)/index.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Real sessions; has setFetchError state |
| UI-09b | Patient Session Detail | `(patient)/session/[id].tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Full detail with PostgREST joins normalized |
| UI-10 | Clinic Home | `(clinic)/index.tsx` | ✅ | 🔄 | ❌ | ❌ | N/A | Today's stats + clinic name from Supabase; device card hardcoded. No loading indicator (UX-15), errors swallowed silently (UX-16) |
| UI-11 | Patient Select | `(clinic)/patient-select.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Hidden from tab bar (v0.5.1); accessed via Home "New Screening" button. Debug subtitle "UI-02b" visible (UX-17) |

---

## Summary

| Category | Count |
|---|---|
| Fully done (all ✅) | 14 |
| Partial (real data, missing some states) | 6 |
| Stub / mock data only | 1 |
| Not started | 0 |

**Screens with open issues:**
- `(clinic)/index.tsx` — no loading indicator (UX-15), errors swallowed silently (UX-16), device card hardcoded (UX-11, deferred)
- `(clinic)/history.tsx` — positiveCount/negativeCount always 0 due to PostgREST join not normalized (GAP-15)
- `(admin)/users.tsx` — fetch error not destructured, silent failure (GAP-16)
- `(admin)/clinics.tsx` — fetch error not destructured, silent failure (GAP-17)
- `(clinic)/assessment.tsx` — AI result is mock (GAP-04, deferred)
- `(patient)/settings.tsx` — screen unreachable, no navigation push to it (NAV-03)
- 7 screens have debug `subtitle="UI-xx"` strings visible in production (UX-17): patient-select, live-feed, assessment, clinical-data, history, clinic home(?), admin dashboard
