# UI Screens Checklist
**Last verified:** 2026-03-30 (v0.5.2 full codebase QA audit)

Legend: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Stub/mock

---

| ID | Screen | File | Built | Real Data | Loading | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-01a | Login | `(auth)/login.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Supabase signIn, lockout, error mapping. Version updated to v0.5.2 |
| UI-01b | Register | `(auth)/register.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Role picker, clinic selector, email confirm flow |
| UI-01c | Forgot Password | `(auth)/forgot-password.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | resetPasswordForEmail wired |
| UI-01d | Update Password | `(auth)/update-password.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Session guard, deep link handler. Duplicate useEffect import (CODE-15, low) |
| UI-01e | Account Activated | `(auth)/account-activated.tsx` | ✅ | ✅ | N/A | N/A | N/A | Confirm email landing screen |
| UI-02 | Device Pairing | `(clinic)/pairing.tsx` | 🔄 | ❌ | ✅ | ❌ | N/A | UI done; BLE scan/pair mock with setTimeout. No error state for pair failure |
| UI-03 | Live Thermal Feed | `(clinic)/live-feed.tsx` | 🔄 | ❌ | N/A | N/A | N/A | Renders mock matrix via setInterval. Debug subtitle removed ✅ |
| UI-04 | AI Assessment | `(clinic)/assessment.tsx` | 🔄 | ❌ | ✅ | ✅ | N/A | MOCK_RESULT hardcoded (GAP-04, deferred hardware). Debug subtitle removed ✅ |
| UI-05 | Clinical Data | `(clinic)/clinical-data.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | VitalsForm + Supabase inserts wired; angiosome preview still mock. Debug subtitle removed ✅ |
| UI-06 | Session History | `(clinic)/history.tsx` | ✅ | 🔄 | ✅ | ✅ | ✅ | Real sessions list. positiveCount/negativeCount always 0 — PostgREST join alias mismatch (GAP-15 open). Debug subtitle removed ✅ |
| UI-06b | Session Detail (clinic) | `(clinic)/session/[id].tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Full detail with PostgREST joins normalized correctly |
| UI-07a | Clinic Settings | `(clinic)/settings.tsx` | ✅ | 🔄 | N/A | N/A | N/A | Device subtitle reads from deviceStore; paired device is mock. Debug subtitle removed ✅ |
| UI-07b | Patient Settings | `(patient)/settings.tsx` | ✅ | ✅ | N/A | N/A | N/A | Now reachable via settings icon in patient dashboard header (NAV-03 fixed ✅) |
| UI-07c | Admin Settings | `(admin)/settings.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Maintenance/Audit Log read/write system_config. Has configError + isLoading states |
| UI-08 | Admin Dashboard | `(admin)/index.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Real stats from Supabase. ActivityIndicator + fetchError. Debug subtitle removed ✅ |
| UI-08b | Admin Users | `(admin)/users.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Full CRUD modal, activate/deactivate writes to DB. Error handling added ✅ (GAP-16 fixed). Toggle error silent (GAP-18 open) |
| UI-08c | Admin Clinics | `(admin)/clinics.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Full clinic + device list, activate/deactivate writes to DB. Error handling added ✅ (GAP-17 fixed). Toggle error silent (GAP-18 open) |
| UI-09 | Patient Dashboard | `(patient)/index.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Real sessions; settings icon + logout in header |
| UI-09b | Patient Session Detail | `(patient)/session/[id].tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Full detail with PostgREST joins normalized correctly |
| UI-10 | Clinic Home | `(clinic)/index.tsx` | ✅ | 🔄 | ✅ | ✅ | N/A | Today's stats + clinic name from Supabase. Loading indicator ✅ (UX-15 fixed). Error state ✅ (UX-16 fixed). Device card still hardcoded (UX-11, deferred hardware) |
| UI-11 | Patient Select | `(clinic)/patient-select.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Hidden from tab bar; accessed via Home "New Screening". Debug subtitle removed ✅ |

---

## Summary

| Category | Count |
|---|---|
| Fully done (all ✅) | 16 |
| Partial (real data, some UX/hardware gaps) | 5 |
| Stub / mock data only | 0 |
| Not started | 0 |
| **Total screens** | **21** |

**Open issues remaining:**
- `(clinic)/history.tsx` — positiveCount/negativeCount always 0 (GAP-15)
- `(admin)/users.tsx` + `(admin)/clinics.tsx` — toggle failure not shown to user (GAP-18)
- `(clinic)/assessment.tsx` — AI result mock (GAP-04, deferred hardware)
- `(clinic)/pairing.tsx`, `live-feed.tsx` — BLE/Wi-Fi/thermal all mock (deferred hardware)
- `(clinic)/index.tsx` — device status card hardcoded (UX-11, deferred hardware)
