# UI Screens Checklist
**Last verified:** 2026-03-21 (full codebase scan v2)

Legend: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Stub/mock

---

| ID | Screen | File | Built | Real Data | Loading | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-01a | Login | `(auth)/login.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Supabase signIn, lockout, error mapping |
| UI-01b | Register | `(auth)/register.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Role picker, clinic selector, email confirm flow |
| UI-01c | Forgot Password | `(auth)/forgot-password.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | resetPasswordForEmail wired |
| UI-01d | Update Password | `(auth)/update-password.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Session guard, deep link handler |
| UI-01e | Account Activated | `(auth)/account-activated.tsx` | ✅ | ✅ | N/A | N/A | N/A | Confirm email landing screen |
| UI-02 | Device Pairing | `(clinic)/pairing.tsx` | 🔄 | ❌ | ✅ | ❌ | N/A | UI done; BLE scan/pair are mock with setTimeout |
| UI-03 | Live Thermal Feed | `(clinic)/live-feed.tsx` | 🔄 | ❌ | N/A | N/A | N/A | Renders mock matrix via setInterval; no real hardware feed |
| UI-04 | AI Assessment | `(clinic)/assessment.tsx` | 🔄 | ❌ | ✅ | ✅ | N/A | UI complete; all classification values are `MOCK_RESULT` |
| UI-05 | Clinical Data | `(clinic)/clinical-data.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | VitalsForm + Supabase inserts wired; angiosome preview still mock |
| UI-06 | Session History | `(clinic)/history.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Real Supabase sessions, filter chips, empty state |
| UI-06b | Session Detail (clinic) | `(clinic)/session/[id].tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Full detail with PostgREST joins normalized |
| UI-07a | Clinic Settings | `(clinic)/settings.tsx` | ✅ | 🔄 | N/A | N/A | N/A | Device subtitle reads from deviceStore; paired device is mock |
| UI-07b | Patient Settings | `(patient)/settings.tsx` | ✅ | ✅ | N/A | N/A | N/A | Edit Profile + Notifications show Coming Soon alert |
| UI-07c | Admin Settings | `(admin)/settings.tsx` | ✅ | ✅ | ❌ | ❌ | N/A | Maintenance/Audit Log read/write system_config; no load error shown |
| UI-08 | Admin Dashboard | `(admin)/index.tsx` | ✅ | ✅ | ❌ | ❌ | ❌ | Real stats from Supabase; no loading/error states |
| UI-08b | Admin Users | `(admin)/users.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Full CRUD modal, activate/deactivate writes to DB |
| UI-08c | Admin Clinics | `(admin)/clinics.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Full clinic + device list, activate/deactivate writes to DB |
| UI-09 | Patient Dashboard | `(patient)/index.tsx` | ✅ | ✅ | ✅ | ❌ | ✅ | Real sessions; missing error state on fetch failure |
| UI-09b | Patient Session Detail | `(patient)/session/[id].tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Full detail with PostgREST joins |
| UI-10 | Clinic Home | `(clinic)/index.tsx` | ✅ | 🔄 | ❌ | ❌ | N/A | Today's stats + clinic name from Supabase ✅; device card hardcoded |
| UI-11 | Patient Select | `(clinic)/patient-select.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Search by patient_code; all states handled |

---

## Summary

| Category | Count |
|---|---|
| Fully done (all ✅) | 13 |
| Partial (real data, missing some states) | 5 |
| Stub / mock data only | 2 |
| Not started | 0 |

**Screens with open issues:**
- `(admin)/index.tsx` — missing loading + error state (UX-09)
- `(patient)/index.tsx` — missing error state (UX-10)
- `(clinic)/index.tsx` — device card hardcoded (UX-11, deferred)
- `(admin)/settings.tsx` — no load error for system_config (UX-12)
- `(clinic)/assessment.tsx` — AI result is mock (GAP-04, deferred)
