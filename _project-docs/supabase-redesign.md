# Supabase Redesign Plan — Vestigia

> Status: PLANNING — do not implement until explicitly instructed.
> This document tracks everything that needs to go into the database redesign.

---

## Filename Format

| Asset | Format | Example |
|-------|--------|---------|
| Bundle ID | `X_yymmdd-hhmm` | `S_030609-1617` |
| Left thermal image | `X_yymmdd-hhmm_L_img.png` | `S_030609-1617_L_img.png` |
| Right thermal image | `X_yymmdd-hhmm_R_img.png` | `S_030609-1617_R_img.png` |
| Left CSV | `X_yymmdd-hhmm_L_csv.csv` | `S_030609-1617_L_csv.csv` |
| Right CSV | `X_yymmdd-hhmm_R_csv.csv` | `S_030609-1617_R_csv.csv` |

- `X` = first letter of patient's last name (uppercase)
- `yymmdd` = capture date (year/month/day, 2-digit each)
- `hhmm` = capture time in 24-hour format

---

## Capture Bundle Contents

One complete bundle requires:
- Left foot thermal image (PNG)
- Left foot temperature data (CSV)
- Right foot thermal image (PNG)
- Right foot temperature data (CSV)
- Patient Details: First Name, Middle Name, Last Name, Gender, Age, Weight, Height
- Capture timestamp
- Foot side per file (L or R)

---

## User Roles & Data Access

### Clinic
- Can see ALL bundles from ALL patients registered to that clinic
- Patients are linked to a clinic via a `clinic_patients` join table
- Fills Patient Details form on behalf of the patient

### Patient
- Can only see their OWN bundles (Account tab) + their own local captures (Local tab)
- Fills Patient Details form themselves (may be pre-filled from profile in future)

### Offline (no login)
- Saves bundles locally only — no Supabase interaction
- When a user later logs in on the same device, they can see ALL local captures
- User manually selects which local captures to sync to their account
- Syncing only available on Patient/Clinic screens

---

## Session History Screen (Patient / Clinic)

| Tab | Contents |
|-----|----------|
| **Account** | Bundles uploaded to Supabase, bound to the logged-in account's ID |
| **Local** | Bundles saved in offline mode on this device, not yet synced. Has a Sync button. |

- After sync: local bundle gets tagged with the logged-in `account_id`, moves to Account tab
- **"Cloud" tab is renamed to "Account"** in the existing Session History screen

---

## Proposed Supabase Schema

### `clinics`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | Clinic name |
| created_at | timestamptz | |

### `clinic_patients`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| clinic_id | uuid FK → clinics.id | |
| patient_account_id | uuid FK → auth.users.id | |
| registered_at | timestamptz | |

### `patients`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| account_id | uuid FK → auth.users.id | Supabase auth user |
| first_name | text | |
| middle_name | text | nullable |
| last_name | text | |
| gender | text | 'Male' / 'Female' / 'Other' |
| age | int | |
| weight_kg | numeric | |
| height_cm | numeric | |
| created_at | timestamptz | |

### `thermal_bundles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| bundle_code | text | e.g. `S_030609-1617` |
| patient_id | uuid FK → patients.id | |
| account_id | uuid FK → auth.users.id | who uploaded/synced |
| source | text | 'account' or 'local_sync' |
| captured_at | timestamptz | timestamp of capture |
| synced_at | timestamptz | nullable — when local was synced |
| created_at | timestamptz | |

### `foot_captures`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| bundle_id | uuid FK → thermal_bundles.id | |
| foot | text | 'L' or 'R' |
| image_filename | text | e.g. `S_030609-1617_L_img.png` |
| image_path | text | Supabase Storage path |
| csv_filename | text | e.g. `S_030609-1617_L_csv.csv` |
| csv_path | text | Supabase Storage path |
| created_at | timestamptz | |

---

## Supabase Storage Buckets

| Bucket | Contents | Path structure |
|--------|----------|----------------|
| `thermal-images` | PNG thermal images | `{account_id}/{bundle_code}/{filename}` |
| `thermal-csv` | CSV temperature files | `{account_id}/{bundle_code}/{filename}` |

---

## RLS Policies (planned)

- **Patient**: can read/write only rows where `account_id = auth.uid()`
- **Clinic**: can read rows where `patient_account_id` exists in `clinic_patients` for their `clinic_id`
- **Offline sync**: upsert allowed on `thermal_bundles` and `foot_captures` where `account_id = auth.uid()`

---

## Upload Strategy (performance)

1. **Parallel uploads** — fire all 4 file uploads simultaneously via `Promise.all`:
   - PNG_L, PNG_R, CSV_L, CSV_R all upload at once
   - Estimated time saving: ~3× faster vs sequential

2. **Save locally first, upload in background** — user sees "Saved" immediately, upload happens behind the scenes without blocking next capture

3. **Single RPC for DB rows** — one Supabase Edge Function inserts `patients` + `thermal_bundles` + both `foot_captures` rows atomically (avoids 3 sequential round trips)

4. **Skip TIFF from upload** — TIFF is large and redundant (CSV already has all temperature values). Only PNG + CSV per foot are uploaded.

5. **Offline sync queue** — local bundles are queued and auto-uploaded on next login with connectivity. Progress shown in Local tab.

6. **Deduplicate on sync** — use `bundle_code` as a unique key so re-syncing the same bundle never creates duplicates

---

## Local Storage Schema (offline / pre-sync)

Stored via `expo-sqlite` or `AsyncStorage` per bundle:

```json
{
  "bundle_code": "S_030609-1617",
  "captured_at": "2003-06-09T16:17:00",
  "synced": false,
  "patient": {
    "first_name": "John",
    "middle_name": "Doe",
    "last_name": "Sison",
    "gender": "Male",
    "age": 45,
    "weight_kg": 70.5,
    "height_cm": 165.0
  },
  "left": {
    "image_filename": "S_030609-1617_L_img.png",
    "csv_filename": "S_030609-1617_L_csv.csv",
    "image_local_path": "...",
    "csv_local_path": "..."
  },
  "right": {
    "image_filename": "S_030609-1617_R_img.png",
    "csv_filename": "S_030609-1617_R_csv.csv",
    "image_local_path": "...",
    "csv_local_path": "..."
  }
}
```

---

## What Changes from Current Schema

- `screening_sessions` → replaced by `thermal_bundles`
- `classification_results` → deferred (DPN classification is a future feature)
- Patient vitals were already removed — confirmed not needed
- Session History "Cloud" tab → renamed to "Account"
- All captures (online or synced-from-offline) bound to `account_id`

---

## Open Questions (resolve before implementation)

- [ ] What is the exact clinic registration flow? Does a clinic admin invite patients, or does a patient join a clinic via a code?
- [ ] Should `patients` table merge with `auth.users` metadata, or stay as a separate table?
- [ ] Is the `bundle_code` globally unique across all users, or only unique per account?
- [ ] Classification/DPN analysis — deferred to a later session, but the schema should leave room for it (a `classification_results` table linked to `thermal_bundles.id`)
