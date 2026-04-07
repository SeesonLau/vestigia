# UI Screens Checklist
**Last verified:** 2026-04-07 (v0.9.1 full codebase QA audit)

Legend: ✅ Done | 🔄 Partial | ❌ Stub/mock only

---

| ID | Screen | File | Built | Real Data | Loading | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|---|
| UI-01a | Login | `(auth)/login.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | signInWithPassword, lockout after 5 fails, error mapping, version from S.app.version |
| UI-01b | Register | `(auth)/register.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Role picker, clinic selector, email confirm flow, all validation |
| UI-01c | Forgot Password | `(auth)/forgot-password.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | resetPasswordForEmail wired |
| UI-01d | Update Password | `(auth)/update-password.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Session guard present; deep link handler; CODE-15 open (harmless) |
| UI-01e | Account Activated | `(auth)/account-activated.tsx` | ✅ | ✅ | N/A | N/A | N/A | Email confirm landing screen → login |
| UI-02 | Mode Select | `app/mode-select.tsx` | ✅ | ✅ | N/A | N/A | N/A | Go Online → login; Work Offline → offline live-feed |
| UI-03 | Device Pairing | `(clinic)/pairing.tsx` | 🔄 | 🔄 | ✅ | ✅ | ✅ | Active Source card, FLIR info, ESP32 WiFi config, BLE scan; USB device registration to Supabase ✅; BLE/WiFi needs real hardware |
| UI-04 | Live Thermal Feed | `(clinic)/live-feed.tsx` | ✅ | 🔄 | ✅ | ✅ | N/A | Bilateral two-step capture flow ✅; UVC + WiFi camera paths wired ✅; CSV/image import feeds AI pipeline ✅; real hardware pending |
| UI-05 | Clinical Data | `(clinic)/clinical-data.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | All vitals validated and inserted to Supabase ✅; MOCK_ANGIOSOMES deferred (CODE-09) |
| UI-06 | AI Assessment | `(clinic)/assessment.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Real dpnApi.ts call on mount; server-waking retry; breathing progress; error/retry state |
| UI-07 | DPN Result | `(clinic)/dpn-result.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Full classification display; asymmetry; save-to-cloud to classification_results ✅ |
| UI-08 | Session History | `(clinic)/history.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Cloud/Local pill toggle; real Supabase sessions ✅; PostgREST join normalized ✅; local captures with sync button |
| UI-09 | Offline Capture | `(offline)/live-feed.tsx` | ✅ | 🔄 | ✅ | ✅ | N/A | UVC + CSV/image import; saves to SQLite; routes to offline save |
| UI-10 | Offline Save | `(offline)/save.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Patient label + vitals; saves via saveCapture() to SQLite |
| UI-11 | Clinic Sync | `(clinic)/sync.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Patient search (ilike); uploads session + captures + vitals; inserts data_request; markSynced |
| UI-12 | Clinic Home | `(clinic)/index.tsx` | ✅ | 🔄 | ✅ | ✅ | N/A | Today's stats + clinic name from Supabase ✅; device card hardcoded (UX-11 deferred) |
| UI-13 | Patient Select | `(clinic)/patient-select.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Real patients via Supabase ilike search ✅ |
| UI-14 | Clinic Settings | `(clinic)/settings.tsx` | ✅ | 🔄 | ✅ | N/A | N/A | Sign Out ✅; Change Password ✅; Paired Device from deviceStore; Clear Cache + Delete Account with confirms |
| UI-15 | Patient Dashboard | `(patient)/index.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Real sessions ✅; CSV/image import on thermal scans ✅; pending requests badge ✅ |
| UI-16 | Patient Sync | `(patient)/sync.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Lists data_requests; Accept/Reject writes status to Supabase |
| UI-17 | Patient Settings | `(patient)/settings.tsx` | ✅ | ✅ | N/A | N/A | N/A | Edit Profile, Change Password, Notifications, Sign Out |
| UI-18 | Admin Dashboard | `(admin)/index.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | Real stats from Supabase ✅ |
| UI-19 | Admin Users | `(admin)/users.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | profiles table ✅; Activate/Deactivate + Alert on error ✅ |
| UI-20 | Admin Clinics | `(admin)/clinics.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | clinics + devices ✅; Activate/Deactivate + Alert on error ✅ |
| UI-21 | Admin Settings | `(admin)/settings.tsx` | ✅ | ✅ | ✅ | ✅ | N/A | Reads/writes system_config; maintenance_mode + audit_log_enabled toggles |

---

## Summary

| Category | Count |
|---|---|
| Fully complete (all ✅) | 19 |
| Partial — real data, some hardware/mock gaps | 6 |
| Stub / mock only | 0 |
| Not started | 0 |
| **Total screens** | **25** |

**Remaining gaps (all hardware/deferred):**
- `(clinic)/live-feed.tsx` — real frames pending UVC AAR + ESP32 firmware
- `(clinic)/pairing.tsx` — BLE/WiFi needs hardware to test
- `(offline)/live-feed.tsx` — same UVC stub caveat
- `(clinic)/index.tsx` — device status card hardcoded (UX-11, deferred)
- `(clinic)/clinical-data.tsx` — MOCK_ANGIOSOMES deferred (CODE-09)
