-- 20260512_session_discard.sql
-- Per-role soft-discard for screening_sessions. The clinic side and the
-- patient side each carry an independent discard timestamp so neither
-- can wipe the other's history. A discarded session stays in the
-- database (preserving clinic_access audits, classification_results
-- joins, etc.) but is filtered out of the default history view and
-- the role's own stat counts.
--
-- Hard delete is still admin-only and is intended for GDPR-style
-- erasure requests, not routine cleanup.

ALTER TABLE public.screening_sessions
  ADD COLUMN IF NOT EXISTS clinic_discarded_at  timestamptz NULL,
  ADD COLUMN IF NOT EXISTS patient_discarded_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS screening_sessions_clinic_discarded_at_idx
  ON public.screening_sessions (clinic_id, clinic_discarded_at);
CREATE INDEX IF NOT EXISTS screening_sessions_patient_discarded_at_idx
  ON public.screening_sessions (subject_profile_id, patient_discarded_at);

CREATE OR REPLACE FUNCTION public.discard_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller       uuid := auth.uid();
  v_role         text;
  v_clinic_id    uuid;
  v_session_clinic uuid;
  v_session_subject uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT role, clinic_id INTO v_role, v_clinic_id
    FROM profiles WHERE id = v_caller;
  SELECT clinic_id, subject_profile_id INTO v_session_clinic, v_session_subject
    FROM screening_sessions WHERE id = p_session_id;
  IF v_session_clinic IS NULL AND v_session_subject IS NULL THEN
    RAISE EXCEPTION 'Session not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_role = 'clinic' AND v_clinic_id IS NOT NULL AND v_clinic_id = v_session_clinic THEN
    UPDATE screening_sessions
       SET clinic_discarded_at = now(), updated_at = now()
     WHERE id = p_session_id;
  ELSIF v_role = 'patient' AND v_session_subject = v_caller THEN
    UPDATE screening_sessions
       SET patient_discarded_at = now(), updated_at = now()
     WHERE id = p_session_id;
  ELSE
    RAISE EXCEPTION 'Not authorised to discard this session' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller       uuid := auth.uid();
  v_role         text;
  v_clinic_id    uuid;
  v_session_clinic uuid;
  v_session_subject uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT role, clinic_id INTO v_role, v_clinic_id
    FROM profiles WHERE id = v_caller;
  SELECT clinic_id, subject_profile_id INTO v_session_clinic, v_session_subject
    FROM screening_sessions WHERE id = p_session_id;
  IF v_session_clinic IS NULL AND v_session_subject IS NULL THEN
    RAISE EXCEPTION 'Session not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_role = 'clinic' AND v_clinic_id IS NOT NULL AND v_clinic_id = v_session_clinic THEN
    UPDATE screening_sessions
       SET clinic_discarded_at = NULL, updated_at = now()
     WHERE id = p_session_id;
  ELSIF v_role = 'patient' AND v_session_subject = v_caller THEN
    UPDATE screening_sessions
       SET patient_discarded_at = NULL, updated_at = now()
     WHERE id = p_session_id;
  ELSE
    RAISE EXCEPTION 'Not authorised to restore this session' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.discard_session(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_session(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.discard_session(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.restore_session(uuid) TO authenticated;
