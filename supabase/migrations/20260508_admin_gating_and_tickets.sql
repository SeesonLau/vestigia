-- 2026-05-08 — Admin-gated approvals + Feedback / support tickets.
--
-- Three new admin-mediated workflows:
--   1. Clinic signup must be approved by an admin before the account can be
--      used (clinics use fabricated emails; admin verifies DOH LTO etc.).
--   2. Clinic password reset goes through an admin queue (no real email
--      infrastructure — admin sets a temporary password via the
--      `admin-set-clinic-password` Edge Function).
--   3. Patients + clinics can file support tickets from Settings → Feedback.
--      Admins resolve them; status + response echo back to the submitter.

-- =======================
-- Clinic approval gate
-- =======================
ALTER TABLE clinics
  ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected')),
  ADD COLUMN approved_by UUID REFERENCES profiles(id),
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT;

-- Existing clinics keep their behaviour — flip them all to approved so
-- production data continues to work; only newly-registered clinics hit
-- the pending gate.
UPDATE clinics
   SET approval_status = 'approved',
       approved_at     = COALESCE(approved_at, now())
 WHERE approval_status = 'pending';

-- Lock down approval_status — the existing clinics_update RLS policy
-- allows clinic owners to update their own row (avatar, address, etc.)
-- but they must NOT be able to flip themselves to approved. Trigger
-- raises if a non-admin caller tries to change approval_status.
CREATE OR REPLACE FUNCTION clinics_block_non_admin_approval_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can change approval_status'
      USING ERRCODE = '42501';  -- insufficient_privilege
  END IF;
  IF (NEW.approved_by IS DISTINCT FROM OLD.approved_by
      OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
      OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason)
     AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can change approval metadata'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clinics_protect_approval ON clinics;
CREATE TRIGGER clinics_protect_approval
  BEFORE UPDATE ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION clinics_block_non_admin_approval_change();

-- =======================
-- Clinic password-reset queue
-- =======================
CREATE TABLE clinic_password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','expired')),
  notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pwd_reset_requester ON clinic_password_reset_requests(clinic_profile_id, created_at DESC);
CREATE INDEX idx_pwd_reset_status    ON clinic_password_reset_requests(status, created_at DESC);

ALTER TABLE clinic_password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Requester reads their own; admin reads all.
CREATE POLICY pwd_reset_select ON clinic_password_reset_requests
  FOR SELECT TO authenticated
  USING (clinic_profile_id = auth.uid() OR is_admin());

-- Requester inserts only on their own behalf.
CREATE POLICY pwd_reset_insert ON clinic_password_reset_requests
  FOR INSERT TO authenticated
  WITH CHECK (clinic_profile_id = auth.uid());

-- Only admins update (review / mark approved-rejected).
CREATE POLICY pwd_reset_update ON clinic_password_reset_requests
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =======================
-- Support tickets
-- =======================
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submitter_role TEXT NOT NULL CHECK (submitter_role IN ('clinic','patient')),
  category TEXT NOT NULL CHECK (category IN ('bug','feature_request','question','billing')),
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 3 AND 120),
  body    TEXT NOT NULL CHECK (length(body)    BETWEEN 3 AND 4000),
  status  TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved')),
  admin_response TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_submitter ON support_tickets(submitter_profile_id, created_at DESC);
CREATE INDEX idx_support_tickets_status    ON support_tickets(status, created_at DESC);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tickets_select ON support_tickets
  FOR SELECT TO authenticated
  USING (submitter_profile_id = auth.uid() OR is_admin());

CREATE POLICY tickets_insert ON support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (submitter_profile_id = auth.uid());

CREATE POLICY tickets_update ON support_tickets
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Keep updated_at fresh on every UPDATE.
CREATE OR REPLACE FUNCTION support_tickets_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS support_tickets_touch ON support_tickets;
CREATE TRIGGER support_tickets_touch
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION support_tickets_touch_updated_at();

-- =======================
-- RPCs — caller-side
-- =======================

-- Clinic submits a password-reset request. Reads auth.uid() to identify
-- the caller; rejects if the caller isn't a clinic-role user.
CREATE OR REPLACE FUNCTION submit_password_reset_request(p_notes TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role   TEXT;
  v_id     UUID;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_caller;
  IF v_role IS DISTINCT FROM 'clinic' THEN
    RAISE EXCEPTION 'Only clinic accounts can request a password reset here'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO clinic_password_reset_requests (clinic_profile_id, notes)
  VALUES (v_caller, NULLIF(trim(p_notes), ''))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Patient or clinic submits a support ticket. Caller's role is
-- read from profiles (not user-supplied) so we can't be lied to.
CREATE OR REPLACE FUNCTION submit_support_ticket(
  p_category TEXT,
  p_subject  TEXT,
  p_body     TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role   TEXT;
  v_id     UUID;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_caller;
  IF v_role NOT IN ('clinic','patient') THEN
    RAISE EXCEPTION 'Only clinic or patient accounts can file tickets'
      USING ERRCODE = '42501';
  END IF;

  IF p_category NOT IN ('bug','feature_request','question','billing') THEN
    RAISE EXCEPTION 'Invalid category: %', p_category USING ERRCODE = '22023';
  END IF;

  INSERT INTO support_tickets (submitter_profile_id, submitter_role, category, subject, body)
  VALUES (v_caller, v_role, p_category, trim(p_subject), trim(p_body))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- =======================
-- RPCs — admin-side
-- =======================

CREATE OR REPLACE FUNCTION admin_approve_clinic(p_clinic_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;
  UPDATE clinics
     SET approval_status  = 'approved',
         approved_by      = auth.uid(),
         approved_at      = now(),
         rejection_reason = NULL
   WHERE id = p_clinic_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinic not found: %', p_clinic_id USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_reject_clinic(p_clinic_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;
  IF length(coalesce(trim(p_reason), '')) < 3 THEN
    RAISE EXCEPTION 'Rejection reason is required' USING ERRCODE = '22023';
  END IF;
  UPDATE clinics
     SET approval_status  = 'rejected',
         approved_by      = auth.uid(),
         approved_at      = now(),
         rejection_reason = trim(p_reason)
   WHERE id = p_clinic_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinic not found: %', p_clinic_id USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_resolve_ticket(
  p_ticket_id UUID,
  p_status    TEXT,
  p_response  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('open','in_progress','resolved') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status USING ERRCODE = '22023';
  END IF;

  IF p_status = 'resolved' THEN
    UPDATE support_tickets
       SET status         = 'resolved',
           admin_response = NULLIF(trim(p_response), ''),
           resolved_by    = auth.uid(),
           resolved_at    = now()
     WHERE id = p_ticket_id;
  ELSE
    UPDATE support_tickets
       SET status         = p_status,
           admin_response = COALESCE(NULLIF(trim(p_response), ''), admin_response),
           resolved_by    = NULL,
           resolved_at    = NULL
     WHERE id = p_ticket_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found: %', p_ticket_id USING ERRCODE = 'P0002';
  END IF;
END;
$$;
