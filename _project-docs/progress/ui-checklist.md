# UI Screens Checklist
**Last verified:** 2026-03-20 (full codebase scan)

Legend: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Stub/mock

---

| ID | Screen | Built | Real Data | Navigation | Notes |
|---|---|---|---|---|---|
| UI-01 | Authentication | ✅ | ✅ | ✅ | Login, register, forgot-password all wired to Supabase |
| UI-02 | Device Pairing | 🔄 | ❌ | ⚠️ | UI done, BLE logic is mock + TODOs. Navigate-to-live-feed button is empty |
| UI-03 | Live Thermal Feed | 🔄 | ❌ | ⚠️ | Renders mock thermal matrix via setInterval. Navigate-to-clinical-data button is empty |
| UI-04 | AI Assessment | 🔄 | ❌ | ✅ | UI complete with ClassificationCard + AngiosomeTable + TCIDisplay. All values mocked |
| UI-05 | Clinical Data | 🔄 | ❌ | ✅ | VitalsForm UI done. Submit handler is a dummy setTimeout — no real upload |
| UI-06 | Session History | 🔄 | ❌ | ✅ | List UI done with filters. Uses MOCK_CLINIC_SESSIONS |
| UI-07 | Settings | ⚠️ | ❌ | ✅ | Screen exists for all roles but is a stub — no functional settings |
| UI-08 | Admin Dashboard | 🔄 | ❌ | ✅ | Overview/Users/Clinics tabs built. All stats are mocked. Action buttons are empty |
| UI-09 | Patient Dashboard | 🔄 | ❌ | ✅ | Dashboard with latest result + history built. All data is mocked. onPress handlers empty |

---

## Summary
- **Fully done:** UI-01 (auth)
- **UI built, data mocked:** UI-03, UI-04, UI-05, UI-06, UI-08, UI-09
- **UI partially built:** UI-02 (missing BLE), UI-07 (stub)
- **Nothing started:** none
