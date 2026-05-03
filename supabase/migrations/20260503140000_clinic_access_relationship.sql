-- supabase/migrations/20260503140000_clinic_access_relationship.sql
-- Per-relationship history-share between a clinic and a patient profile.
-- The capturing clinic always sees its own captures via the existing
-- clinic_id-match RLS rule; the new clinic_access table only gates
-- HISTORICAL access -- sessions captured by other clinics or by the
-- patient themselves.
--
-- Lifecycle:
--   pending  → accepted | rejected
--   accepted → revoked  (patient initiates)
--   rejected → pending  (clinic re-requests, after 5 min cooldown)
--   revoked  → pending  (clinic re-requests, no cooldown)

CREATE TABLE clinic_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'pending',
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (clinic_id, patient_profile_id)
);

CREATE INDEX idx_clinic_access_patient ON clinic_access(patient_profile_id, status);
CREATE INDEX idx_clinic_access_clinic  ON clinic_access(clinic_id, status);

ALTER TABLE clinic_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY clinic_access_select ON clinic_access FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (auth_role() = 'clinic'  AND clinic_id = auth_clinic_id())
    OR (patient_profile_id = auth.uid())
  );

-- Writes happen only via the SECURITY DEFINER RPCs below.

-- request_clinic_access(p_clinic_id, p_patient_profile_id) ───────────
CREATE OR REPLACE FUNCTION request_clinic_access(
  p_clinic_id UUID,
  p_patient_profile_id UUID
)
RETURNS TABLE (status request_status, retry_after_seconds INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing clinic_access%ROWTYPE;
  v_caller UUID := auth.uid();
  v_cooldown_seconds INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_caller AND role = 'clinic' AND clinic_id = p_clinic_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to request access for this clinic';
  END IF;

  SELECT * INTO v_existing
  FROM clinic_access
  WHERE clinic_id = p_clinic_id AND patient_profile_id = p_patient_profile_id;

  IF NOT FOUND THEN
    INSERT INTO clinic_access (clinic_id, patient_profile_id, status, requested_by)
    VALUES (p_clinic_id, p_patient_profile_id, 'pending', v_caller);
    RETURN QUERY SELECT 'pending'::request_status, 0;
    RETURN;
  END IF;

  IF v_existing.status IN ('accepted', 'pending') THEN
    RETURN QUERY SELECT v_existing.status, 0;
    RETURN;
  END IF;

  IF v_existing.status = 'rejected'
     AND v_existing.responded_at IS NOT NULL
     AND v_existing.responded_at > now() - interval '5 minutes' THEN
    v_cooldown_seconds := GREATEST(
      0,
      CEIL(EXTRACT(EPOCH FROM (v_existing.responded_at + interval '5 minutes' - now())))::INT
    );
    RAISE EXCEPTION 'Cooldown active. Retry in % seconds', v_cooldown_seconds
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE clinic_access
  SET status       = 'pending',
      requested_by = v_caller,
      requested_at = now(),
      responded_at = NULL
  WHERE id = v_existing.id;

  RETURN QUERY SELECT 'pending'::request_status, 0;
END;
$$;

GRANT EXECUTE ON FUNCTION request_clinic_access(UUID, UUID) TO authenticated;

-- respond_to_clinic_access(p_request_id, p_approve) ──────────────────
CREATE OR REPLACE FUNCTION respond_to_clinic_access(
  p_request_id UUID,
  p_approve BOOLEAN
)
RETURNS request_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_row clinic_access%ROWTYPE;
  v_new_status request_status;
BEGIN
  SELECT * INTO v_row FROM clinic_access WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_row.patient_profile_id <> v_caller THEN
    RAISE EXCEPTION 'Not authorized to respond to this request';
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Request is no longer pending (current: %)', v_row.status;
  END IF;

  v_new_status := CASE WHEN p_approve THEN 'accepted'::request_status
                                       ELSE 'rejected'::request_status END;
  UPDATE clinic_access
  SET status = v_new_status, responded_at = now()
  WHERE id = p_request_id;

  RETURN v_new_status;
END;
$$;

GRANT EXECUTE ON FUNCTION respond_to_clinic_access(UUID, BOOLEAN) TO authenticated;

-- revoke_clinic_access(p_request_id) ─────────────────────────────────
CREATE OR REPLACE FUNCTION revoke_clinic_access(p_request_id UUID)
RETURNS request_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_row clinic_access%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM clinic_access WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_row.patient_profile_id <> v_caller THEN
    RAISE EXCEPTION 'Not authorized to revoke this access';
  END IF;
  IF v_row.status <> 'accepted' THEN
    RAISE EXCEPTION 'Only accepted access can be revoked (current: %)', v_row.status;
  END IF;

  UPDATE clinic_access
  SET status = 'revoked', responded_at = now()
  WHERE id = p_request_id;

  RETURN 'revoked'::request_status;
END;
$$;

GRANT EXECUTE ON FUNCTION revoke_clinic_access(UUID) TO authenticated;

-- screening_sessions SELECT policy: add the historical-access OR clause
DROP POLICY IF EXISTS sessions_select ON screening_sessions;

CREATE POLICY sessions_select ON screening_sessions FOR SELECT TO authenticated
  USING (
    is_admin()
    OR subject_profile_id = auth.uid()
    OR operator_id = auth.uid()
    OR (auth_role() = 'clinic' AND clinic_id = auth_clinic_id())
    OR (
      auth_role() = 'clinic'
      AND subject_profile_id IN (
        SELECT patient_profile_id FROM clinic_access
        WHERE clinic_id = auth_clinic_id() AND status = 'accepted'
      )
    )
  );
