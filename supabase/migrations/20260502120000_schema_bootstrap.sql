-- supabase/migrations/20260502120000_schema_bootstrap.sql
-- Initial schema for Vestigia / Lumen AI.
-- Creates enums, PSGC reference tables (empty -- seed deferred),
-- and all core tables. RLS, triggers, storage buckets, and the
-- admin seed are applied by subsequent migrations.

-- =======================
-- ENUMS
-- =======================
CREATE TYPE user_role AS ENUM ('clinic','patient','admin');
CREATE TYPE sex_type AS ENUM ('male','female','other');
CREATE TYPE foot_type AS ENUM ('left','right');
CREATE TYPE session_status AS ENUM ('draft','uploading','completed','failed','discarded');
CREATE TYPE capture_mode_type AS ENUM ('clinical','patient_self','offline_guest');
CREATE TYPE dpn_classification AS ENUM ('POSITIVE','NEGATIVE','INCONCLUSIVE');
CREATE TYPE request_status AS ENUM ('pending','accepted','rejected','revoked');
CREATE TYPE facility_type AS ENUM (
  'tertiary_hospital','secondary_hospital','primary_hospital',
  'outpatient_clinic','diagnostic_center','infirmary',
  'birthing_home','dialysis_center','ambulatory_surgical'
);

-- =======================
-- REFERENCE TABLES (PSGC) -- seeds deferred
-- =======================
CREATE TABLE ph_regions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE ph_provinces (
  code TEXT PRIMARY KEY,
  region_code TEXT NOT NULL REFERENCES ph_regions(code) ON DELETE RESTRICT,
  name TEXT NOT NULL
);

CREATE TABLE ph_cities (
  code TEXT PRIMARY KEY,
  province_code TEXT NOT NULL REFERENCES ph_provinces(code) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  default_zip TEXT
);

CREATE TABLE ph_barangays (
  code TEXT PRIMARY KEY,
  city_code TEXT NOT NULL REFERENCES ph_cities(code) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  zip_override TEXT
);

CREATE INDEX idx_ph_provinces_region ON ph_provinces(region_code);
CREATE INDEX idx_ph_cities_province ON ph_cities(province_code);
CREATE INDEX idx_ph_barangays_city ON ph_barangays(city_code);

-- =======================
-- profiles
-- =======================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (
    first_name || COALESCE(' ' || middle_name, '') || ' ' || last_name
  ) STORED,
  role user_role NOT NULL,
  patient_code TEXT UNIQUE,
  sex sex_type,
  date_of_birth DATE,
  contact_number TEXT,
  avatar_url TEXT,
  clinic_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patient_code_only_for_patients CHECK (
    (role = 'patient' AND patient_code IS NOT NULL)
    OR (role <> 'patient' AND patient_code IS NULL)
  ),
  CONSTRAINT patient_fields_only_for_patients CHECK (
    role = 'patient' OR (sex IS NULL AND date_of_birth IS NULL AND contact_number IS NULL)
  )
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_clinic ON profiles(clinic_id);
CREATE INDEX idx_profiles_patient_code ON profiles(patient_code);

-- =======================
-- clinics
-- =======================
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_code TEXT NOT NULL UNIQUE,
  owner_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  facility_name TEXT NOT NULL,
  facility_type facility_type NOT NULL,
  doh_lto_number TEXT NOT NULL,
  region_code TEXT REFERENCES ph_regions(code) ON DELETE RESTRICT,
  province_code TEXT REFERENCES ph_provinces(code) ON DELETE RESTRICT,
  city_code TEXT REFERENCES ph_cities(code) ON DELETE RESTRICT,
  barangay_code TEXT REFERENCES ph_barangays(code) ON DELETE RESTRICT,
  address_line TEXT,
  zip_code TEXT,
  phone TEXT NOT NULL,
  website TEXT,
  contact_first_name TEXT NOT NULL,
  contact_middle_name TEXT,
  contact_last_name TEXT NOT NULL,
  contact_mobile TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT doh_lto_format CHECK (
    doh_lto_number ~ '^[0-9]{2}-[0-9]{3}-[0-9]{2}-[A-Z]{2}-[0-9]$'
  )
);

ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_clinic
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;

CREATE INDEX idx_clinics_facility_type ON clinics(facility_type);
CREATE INDEX idx_clinics_clinic_code ON clinics(clinic_code);

-- =======================
-- devices
-- =======================
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  serial TEXT,
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_clinic ON devices(clinic_id);

-- =======================
-- patients (clinic-side clinical record)
-- =======================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  sex sex_type,
  date_of_birth DATE,
  contact_number TEXT,
  diabetes_type TEXT,
  diabetes_duration_years NUMERIC(4,1),
  height_cm NUMERIC(5,2),
  weight_kg NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, profile_id)
);

CREATE INDEX idx_patients_clinic ON patients(clinic_id);
CREATE INDEX idx_patients_profile ON patients(profile_id);

-- =======================
-- screening_sessions (canonical capture record)
-- =======================
CREATE TABLE screening_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_code TEXT UNIQUE,
  subject_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  capture_mode capture_mode_type NOT NULL,
  status session_status NOT NULL DEFAULT 'draft',
  patient_snapshot JSONB,
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_subject ON screening_sessions(subject_profile_id);
CREATE INDEX idx_sessions_patient ON screening_sessions(patient_id);
CREATE INDEX idx_sessions_clinic ON screening_sessions(clinic_id);
CREATE INDEX idx_sessions_started ON screening_sessions(started_at DESC);
CREATE INDEX idx_sessions_status ON screening_sessions(status);

-- =======================
-- thermal_captures (one per foot per session)
-- =======================
CREATE TABLE thermal_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES screening_sessions(id) ON DELETE CASCADE,
  foot foot_type NOT NULL,
  thermal_matrix JSONB NOT NULL,
  min_temp_c NUMERIC(6,3),
  max_temp_c NUMERIC(6,3),
  mean_temp_c NUMERIC(6,3),
  mpa_mean_c NUMERIC(6,3),
  lpa_mean_c NUMERIC(6,3),
  mca_mean_c NUMERIC(6,3),
  lca_mean_c NUMERIC(6,3),
  resolution_x SMALLINT,
  resolution_y SMALLINT,
  raw_image_path TEXT,
  processed_image_path TEXT NOT NULL,
  isolated_image_path TEXT NOT NULL,
  csv_path TEXT,
  captured_at TIMESTAMPTZ NOT NULL,
  UNIQUE (session_id, foot)
);

CREATE INDEX idx_captures_session ON thermal_captures(session_id);

-- =======================
-- classification_results (1:1 with session)
-- =======================
CREATE TABLE classification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES screening_sessions(id) ON DELETE CASCADE,
  classification dpn_classification NOT NULL,
  confidence_score NUMERIC(5,4) NOT NULL,
  left_tci NUMERIC(6,4),
  right_tci NUMERIC(6,4),
  bilateral_tci NUMERIC(6,4),
  max_asymmetry_c NUMERIC(6,3),
  per_angiosome_asymmetry JSONB,
  angiosomes_flagged TEXT[],
  model_version TEXT NOT NULL,
  classified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =======================
-- data_requests (cross-role share inbox)
-- =======================
CREATE TABLE data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES screening_sessions(id) ON DELETE CASCADE,
  from_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX idx_requests_to ON data_requests(to_profile_id, status);
CREATE INDEX idx_requests_from ON data_requests(from_profile_id);

-- =======================
-- system_config (admin-tuned settings)
-- =======================
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- =======================
-- audit_log
-- =======================
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_profile ON audit_log(profile_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
