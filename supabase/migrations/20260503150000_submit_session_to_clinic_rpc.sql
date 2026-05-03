-- supabase/migrations/20260503150000_submit_session_to_clinic_rpc.sql
-- Patient → "Submit my self-capture to a clinic" flow.
--
-- Behaviour:
--  * caller MUST own the session (subject_profile_id = auth.uid())
--  * session MUST be capture_mode='patient_self' AND clinic_id IS NULL
--    (already-clinic captures or already-submitted captures are rejected)
--  * looks up the clinic by clinic_code (the operator-friendly
--    XX-YYYYMMDD-HHMM-NN string), creates or finds the patients row for
--    (clinic, profile), UPDATEs the session to set clinic_id + patient_id,
--    and seeds a clinic_access row in 'accepted' state (the submission is
--    itself the patient's consent).
--
-- SECURITY DEFINER + auth.uid() check, so it's safe to GRANT to authenticated.

CREATE OR REPLACE FUNCTION submit_session_to_clinic(
  p_session_id UUID,
  p_clinic_code TEXT
)
RETURNS TABLE (clinic_id UUID, patient_id UUID, access_status request_status)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_session screening_sessions%ROWTYPE;
  v_clinic clinics%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_patient_id UUID;
  v_existing_patient UUID;
  v_access_row clinic_access%ROWTYPE;
  v_access_status request_status;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT * INTO v_session FROM screening_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  IF v_session.subject_profile_id <> v_caller THEN
    RAISE EXCEPTION 'Not authorized to submit this session';
  END IF;
  IF v_session.capture_mode <> 'patient_self' THEN
    RAISE EXCEPTION 'Only self-captures can be submitted to a clinic';
  END IF;
  IF v_session.clinic_id IS NOT NULL THEN
    RAISE EXCEPTION 'This session is already submitted';
  END IF;

  SELECT * INTO v_clinic FROM clinics WHERE clinic_code = upper(trim(p_clinic_code));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No clinic found with that code';
  END IF;
  IF NOT v_clinic.is_active THEN
    RAISE EXCEPTION 'Clinic is inactive';
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_caller;
  IF NOT FOUND OR v_profile.role <> 'patient' THEN
    RAISE EXCEPTION 'Profile is not a patient';
  END IF;

  SELECT id INTO v_existing_patient
  FROM patients
  WHERE clinic_id = v_clinic.id AND profile_id = v_caller;

  IF v_existing_patient IS NOT NULL THEN
    v_patient_id := v_existing_patient;
  ELSE
    INSERT INTO patients (
      clinic_id, profile_id,
      first_name, middle_name, last_name,
      sex, date_of_birth, contact_number
    ) VALUES (
      v_clinic.id, v_caller,
      v_profile.first_name, v_profile.middle_name, v_profile.last_name,
      v_profile.sex, v_profile.date_of_birth, v_profile.contact_number
    )
    RETURNING id INTO v_patient_id;
  END IF;

  UPDATE screening_sessions
  SET clinic_id = v_clinic.id,
      patient_id = v_patient_id,
      updated_at = now()
  WHERE id = p_session_id;

  --Seed / promote clinic_access. Submitting is itself an act of consent so
  --we skip the pending dance and write 'accepted' directly.
  SELECT * INTO v_access_row
  FROM clinic_access
  WHERE clinic_id = v_clinic.id AND patient_profile_id = v_caller;

  IF NOT FOUND THEN
    INSERT INTO clinic_access (
      clinic_id, patient_profile_id, status, requested_by, responded_at
    ) VALUES (
      v_clinic.id, v_caller, 'accepted', v_caller, now()
    );
    v_access_status := 'accepted';
  ELSIF v_access_row.status = 'pending' OR v_access_row.status IN ('rejected', 'revoked') THEN
    UPDATE clinic_access
    SET status = 'accepted', responded_at = now()
    WHERE id = v_access_row.id;
    v_access_status := 'accepted';
  ELSE
    v_access_status := v_access_row.status;
  END IF;

  RETURN QUERY SELECT v_clinic.id, v_patient_id, v_access_status;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_session_to_clinic(UUID, TEXT) TO authenticated;
