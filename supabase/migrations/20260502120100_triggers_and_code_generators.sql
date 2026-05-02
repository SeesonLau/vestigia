-- supabase/migrations/20260502120100_triggers_and_code_generators.sql
-- updated_at touch trigger, patient/clinic code generators, and the
-- handle_new_user trigger that mirrors auth.users into profiles.

-- =======================
-- Generic updated_at trigger
-- =======================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_clinics_updated BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON screening_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =======================
-- gen_patient_code: XXX-YYYYMMDD-HHMM-NN
-- XXX = first / middle (or 0) / last initials, uppercased
-- =======================
CREATE OR REPLACE FUNCTION gen_patient_code() RETURNS TRIGGER AS $$
DECLARE
  v_initials TEXT;
  v_ts TEXT;
  v_prefix TEXT;
  v_counter INT;
BEGIN
  IF NEW.role <> 'patient' THEN
    RETURN NEW;
  END IF;

  IF NEW.patient_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_initials := upper(left(NEW.first_name, 1))
              || COALESCE(upper(left(NEW.middle_name, 1)), '0')
              || upper(left(NEW.last_name, 1));
  v_ts := to_char(COALESCE(NEW.created_at, now()), 'YYYYMMDD-HH24MI');
  v_prefix := v_initials || '-' || v_ts;

  --Race-safe counter via xact-scoped advisory lock
  PERFORM pg_advisory_xact_lock(hashtext(v_prefix));

  SELECT COUNT(*) INTO v_counter
    FROM profiles
    WHERE patient_code LIKE v_prefix || '-%';

  NEW.patient_code := v_prefix || '-' || lpad(v_counter::text, 2, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_gen_patient_code
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION gen_patient_code();

-- =======================
-- gen_clinic_code: XX-YYYYMMDD-HHMM-NN
-- XX = facility-type prefix
-- =======================
CREATE OR REPLACE FUNCTION gen_clinic_code() RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_ts TEXT;
  v_full TEXT;
  v_counter INT;
BEGIN
  IF NEW.clinic_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_prefix := CASE NEW.facility_type
    WHEN 'tertiary_hospital'    THEN 'TH'
    WHEN 'secondary_hospital'   THEN 'SH'
    WHEN 'primary_hospital'     THEN 'PH'
    WHEN 'outpatient_clinic'    THEN 'OC'
    WHEN 'diagnostic_center'    THEN 'DG'
    WHEN 'infirmary'            THEN 'IN'
    WHEN 'birthing_home'        THEN 'BH'
    WHEN 'dialysis_center'      THEN 'DY'
    WHEN 'ambulatory_surgical'  THEN 'AS'
  END;

  v_ts := to_char(COALESCE(NEW.created_at, now()), 'YYYYMMDD-HH24MI');
  v_full := v_prefix || '-' || v_ts;

  PERFORM pg_advisory_xact_lock(hashtext(v_full));

  SELECT COUNT(*) INTO v_counter
    FROM clinics
    WHERE clinic_code LIKE v_full || '-%';

  NEW.clinic_code := v_full || '-' || lpad(v_counter::text, 2, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clinics_gen_code
  BEFORE INSERT ON clinics
  FOR EACH ROW EXECUTE FUNCTION gen_clinic_code();

-- =======================
-- handle_new_user: AFTER INSERT on auth.users -> profiles row
-- Reads role / first_name / middle_name / last_name / patient fields
-- from raw_user_meta_data. Defaults role to 'patient' and supplies
-- placeholder names if metadata is missing so seed/admin paths work.
-- =======================
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER
SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_meta JSONB;
  v_role user_role;
  v_first TEXT;
  v_middle TEXT;
  v_last TEXT;
  v_sex sex_type;
  v_dob DATE;
  v_contact TEXT;
BEGIN
  v_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  v_role  := COALESCE(NULLIF(v_meta->>'role','')::user_role, 'patient');
  v_first := COALESCE(NULLIF(v_meta->>'first_name',''), 'Unknown');
  v_last  := COALESCE(NULLIF(v_meta->>'last_name',''),  'User');
  v_middle := NULLIF(v_meta->>'middle_name', '');

  IF v_role = 'patient' THEN
    v_sex     := NULLIF(v_meta->>'sex','')::sex_type;
    v_dob     := NULLIF(v_meta->>'date_of_birth','')::date;
    v_contact := NULLIF(v_meta->>'contact_number','');
  END IF;

  INSERT INTO profiles (
    id, email, first_name, middle_name, last_name,
    role, sex, date_of_birth, contact_number
  ) VALUES (
    NEW.id, NEW.email, v_first, v_middle, v_last,
    v_role, v_sex, v_dob, v_contact
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
