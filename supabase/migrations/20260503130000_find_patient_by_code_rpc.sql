-- supabase/migrations/20260503130000_find_patient_by_code_rpc.sql
-- SECURITY DEFINER lookup that any authenticated user can call to resolve a
-- global patient_code → minimal profile fields. Bypasses RLS so clinic
-- operators can find a patient they haven't linked yet (the existing
-- profiles_select_clinic policy only grants access to profiles already
-- recorded in the operator's clinic).
--
-- Returns only the fields needed to populate the post-capture form and the
-- clinic's "add patient" screen. Email, clinic_id, and other sensitive
-- columns are NOT exposed.

CREATE OR REPLACE FUNCTION find_patient_by_code(p_code TEXT)
RETURNS TABLE (
  id UUID,
  patient_code TEXT,
  full_name TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  sex sex_type,
  date_of_birth DATE,
  contact_number TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, patient_code, full_name, first_name, middle_name, last_name,
         sex, date_of_birth, contact_number
  FROM profiles
  WHERE patient_code = upper(trim(p_code))
    AND role = 'patient';
$$;

GRANT EXECUTE ON FUNCTION find_patient_by_code(TEXT) TO authenticated;
