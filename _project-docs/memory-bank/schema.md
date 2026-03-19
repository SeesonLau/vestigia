# Database Schema — Vestigia
**Source:** Thesis Chapter 6 — Data Requirements
**Last updated:** 2026-03-20

---

## Architecture

**Dual database — offline-first:**
- **Local:** WatermelonDB — for offline capture and temporary storage
- **Cloud:** Supabase (PostgreSQL) — syncs when online

**Authentication:** Supabase built-in auth (`auth.users`). The `profiles` table extends it via FK → `auth.users(id)`.

---

## Schema Overview

| Table | Function | RLS |
|---|---|---|
| `profiles` | User identity, auth metadata, role | Users read own; Admin reads all |
| `clinics` | Clinic/facility registration | Clinic reads own; Admin reads all |
| `patients` | Patient records linked to a clinic | Patient reads own; Clinic reads own patients; Admin reads all |
| `devices` | Registered thermal imaging hardware | Clinic reads own; Admin reads all |
| `screening_sessions` | Session records: patient + clinic + device | Patient reads own; Clinic reads own patients; Admin reads all |
| `thermal_captures` | Raw thermal matrix + angiosome temps + TCI | Inherits from screening_sessions via FK |
| `patient_vitals` | Clinical vitals per session | Inherits from screening_sessions via FK |
| `classification_results` | AI output, asymmetries, TCI | Inherits from screening_sessions via FK |

> All UUID PKs use `gen_random_uuid()`. Timestamps use `TIMESTAMPTZ DEFAULT now()`.
> RLS must be enabled on all tables. Never rely on client-side filtering alone.
> All DB changes must be logged in `supabase-changes.md` with SQL and reason.

---

## profiles
Extends `auth.users`. Role determines access tier.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, FK → auth.users(id) | Supabase Auth user ID |
| email | TEXT | UNIQUE, NOT NULL | User email |
| full_name | TEXT | NOT NULL | Display name |
| role | TEXT | NOT NULL, CHECK IN (patient, clinic, admin) | Access role |
| clinic_id | UUID | FK → clinics(id), NULLABLE | Required for clinic role |
| phone | TEXT | NULLABLE | Contact phone |
| is_active | BOOLEAN | DEFAULT true | Account status |
| created_at | TIMESTAMPTZ | DEFAULT now() | Created timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last updated |

---

## clinics
Healthcare facility records. Multiple clinic users can share one clinic.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Clinic ID |
| name | TEXT | NOT NULL | Facility name |
| address | TEXT | NULLABLE | Physical address |
| facility_type | TEXT | CHECK IN (hospital, clinic, barangay_health_station, other) | Facility type |
| contact_phone | TEXT | NULLABLE | Contact number |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMPTZ | DEFAULT now() | Registration timestamp |

---

## patients
Patient records. Minimal PII per RA 10173. Anonymized via `patient_code`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Patient ID |
| user_id | UUID | FK → profiles(id), UNIQUE, NULLABLE | Linked profile (if patient has account) |
| clinic_id | UUID | FK → clinics(id), NOT NULL | Registering clinic |
| patient_code | TEXT | UNIQUE, NOT NULL | Anonymized ID (e.g., DPN-P-0001) |
| date_of_birth | DATE | NULLABLE | Date of birth |
| sex | TEXT | CHECK IN (male, female, other), NULLABLE | Biological sex |
| diabetes_type | TEXT | CHECK IN (type1, type2, gestational, unknown), NULLABLE | Diabetes type |
| diabetes_duration_years | INTEGER | CHECK >= 0, NULLABLE | Years since diagnosis |
| notes | TEXT | NULLABLE | Clinical notes |
| created_at | TIMESTAMPTZ | DEFAULT now() | Created timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last updated |

---

## devices
Registered thermal imaging hardware. Each device belongs to one clinic.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Device ID |
| device_code | TEXT | UNIQUE, NOT NULL | Hardware ID (e.g., DPN-Scanner-01) |
| clinic_id | UUID | FK → clinics(id), NOT NULL | Owning clinic |
| firmware_version | TEXT | NULLABLE | Current firmware |
| sensor_model | TEXT | DEFAULT MI0802M5S | Thermal sensor model |
| last_calibration_date | DATE | NULLABLE | Last calibration |
| is_active | BOOLEAN | DEFAULT true | Operational status |
| registered_at | TIMESTAMPTZ | DEFAULT now() | Registration timestamp |

> **Hardware specs not finalized.** `sensor_model`, `firmware_version`, and calibration fields are placeholders until hardware is confirmed.

---

## screening_sessions
Central table — links patient, operator, device, and clinic per session.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Session ID |
| patient_id | UUID | FK → patients(id), NOT NULL | Patient screened |
| operator_id | UUID | FK → profiles(id), NOT NULL | Clinic user performing screening |
| device_id | UUID | FK → devices(id), NOT NULL | Device used |
| clinic_id | UUID | FK → clinics(id), NOT NULL | Screening clinic |
| status | TEXT | NOT NULL, DEFAULT pending, CHECK IN (pending, capturing, uploading, processing, completed, failed, discarded) | Session lifecycle |
| ambient_temperature_c | REAL | CHECK BETWEEN 10.0 AND 45.0, NULLABLE | Room temperature °C |
| room_humidity_pct | REAL | CHECK BETWEEN 0 AND 100, NULLABLE | Room humidity % |
| notes | TEXT | NULLABLE | Operator notes |
| app_version | TEXT | NULLABLE | App version used |
| started_at | TIMESTAMPTZ | DEFAULT now() | Session start |
| completed_at | TIMESTAMPTZ | NULLABLE | Session end |

---

## thermal_captures
Raw 80×62 thermal matrix per session. Angiosome temps per Hernandez-Contreras et al. (2019).

> **Hardware not finalized.** Resolution and matrix format may change.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Capture ID |
| session_id | UUID | FK → screening_sessions(id), NOT NULL | Parent session |
| foot | TEXT | NOT NULL, CHECK IN (left, right, bilateral) | Which foot |
| thermal_matrix | JSONB | NOT NULL | 2D array of temps in °C (80×62) |
| min_temp_c | REAL | NOT NULL | Frame min temp |
| max_temp_c | REAL | NOT NULL | Frame max temp |
| mean_temp_c | REAL | NOT NULL | Frame mean temp |
| resolution_x | INTEGER | DEFAULT 80 | Horizontal resolution |
| resolution_y | INTEGER | DEFAULT 62 | Vertical resolution |
| captured_at | TIMESTAMPTZ | DEFAULT now() | Capture timestamp |
| mpa_mean_c | REAL | NULLABLE | Medial Plantar Artery angiosome mean °C |
| lpa_mean_c | REAL | NULLABLE | Lateral Plantar Artery angiosome mean °C |
| mca_mean_c | REAL | NULLABLE | Medial Calcaneal Artery angiosome mean °C |
| lca_mean_c | REAL | NULLABLE | Lateral Calcaneal Artery angiosome mean °C |
| tci | REAL | NULLABLE | Thermal Change Index (deviation from healthy reference) |

---

## patient_vitals
One vitals record per session. Ranges follow clinical standards.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Vitals ID |
| session_id | UUID | FK → screening_sessions(id), UNIQUE, NOT NULL | Parent session |
| blood_glucose_mgdl | REAL | CHECK BETWEEN 30.0 AND 600.0, NULLABLE | Blood glucose mg/dL |
| systolic_bp_mmhg | INTEGER | CHECK BETWEEN 60 AND 250, NULLABLE | Systolic BP mmHg |
| diastolic_bp_mmhg | INTEGER | CHECK BETWEEN 40 AND 150, NULLABLE | Diastolic BP mmHg |
| heart_rate_bpm | INTEGER | CHECK BETWEEN 30 AND 220, NULLABLE | Heart rate BPM |
| hba1c_pct | REAL | CHECK BETWEEN 3.0 AND 20.0, NULLABLE | HbA1c % |
| recorded_at | TIMESTAMPTZ | DEFAULT now() | Entry timestamp |

---

## classification_results
AI output per session. Populated by cloud AI module.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Result ID |
| session_id | UUID | FK → screening_sessions(id), UNIQUE, NOT NULL | Parent session |
| classification | TEXT | NOT NULL, CHECK IN (POSITIVE, NEGATIVE) | DPN classification |
| confidence_score | REAL | NOT NULL, CHECK BETWEEN 0.0 AND 1.0 | Model confidence |
| asymmetry_mpa_c | REAL | NULLABLE | Bilateral MPA temp diff °C |
| asymmetry_lpa_c | REAL | NULLABLE | Bilateral LPA temp diff °C |
| asymmetry_mca_c | REAL | NULLABLE | Bilateral MCA temp diff °C |
| asymmetry_lca_c | REAL | NULLABLE | Bilateral LCA temp diff °C |
| max_asymmetry_c | REAL | NULLABLE | Max bilateral asymmetry across all angiosomes °C |
| feature_vector | JSONB | NULLABLE | Full feature vector (18–30 features) |
| model_version | TEXT | NOT NULL | AI model version used |
| processing_time_ms | INTEGER | NULLABLE | Processing duration ms |
| classified_at | TIMESTAMPTZ | DEFAULT now() | Classification timestamp |
| angiosomes_flagged | TEXT[] | NULLABLE | Angiosomes exceeding 2.2°C threshold (e.g., MPA, LCA) |
| bilateral_tci | REAL | NULLABLE | Mean TCI across both feet |

---

## Clinical Reference

- **Asymmetry threshold:** >2.2°C bilateral = clinically significant (Hernandez-Contreras et al., 2019)
- **Angiosomes:** MPA, LPA, MCA, LCA (plantar regions)
- **TCI:** Thermal Change Index — deviation from healthy reference per angiosome
- **Privacy law:** RA 10173 (Data Privacy Act of the Philippines) — minimal PII, anonymized patient codes
