-- 20260512_ticket_severity.sql
-- Adds a nullable `severity` column to support_tickets so admins can
-- triage incoming reports (Low / Medium / High / Critical). Also adds
-- a SECURITY DEFINER RPC admin_set_ticket_severity so the admin web
-- console can assign severity independently of resolve/in_progress
-- transitions (which still go through admin_resolve_ticket).
--
-- Tickets submitted by end-users always start with severity = NULL —
-- the admin assigns it from the inbox.

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS severity text NULL;

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_severity_check;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_severity_check
  CHECK (severity IS NULL OR severity IN ('low','medium','high','critical'));

CREATE OR REPLACE FUNCTION public.admin_set_ticket_severity(p_ticket_id uuid, p_severity text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;
  IF p_severity IS NOT NULL AND p_severity NOT IN ('low','medium','high','critical') THEN
    RAISE EXCEPTION 'Invalid severity: %', p_severity USING ERRCODE = '22023';
  END IF;
  UPDATE support_tickets
     SET severity   = p_severity,
         updated_at = now()
   WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found: %', p_ticket_id USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_ticket_severity(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_ticket_severity(uuid, text) TO authenticated;
