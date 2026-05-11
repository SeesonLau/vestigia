-- 20260512_ticket_qa_codes.sql
-- Auto-generated QA-code subjects per category.
--
-- Replaces the freeform `subject` field with a server-assigned QA code
-- (BUG-23, UX-22, PERF-14, ...) the moment a user submits a ticket. The
-- prefix is derived from the category; the numeric suffix continues the
-- existing QA sequence found in _project-docs/progress/qa-bugs.md plus
-- the rows already seeded into support_tickets.
--
-- Changes:
--   1. category CHECK widened: { ui_ux, bug, performance, accessibility,
--      security, navigation, auth, data_sync, hardware, question, code,
--      database, thermal }. The first 10 are user-facing; the last 3
--      (code/database/thermal) only exist because they were seeded from
--      the dev-side QA log.
--   2. Existing rows re-classified by subject prefix.
--   3. New helper next_ticket_code(prefix) — advisory-locked so two
--      concurrent submitters can't collide.
--   4. submit_support_ticket loses the p_subject param and always
--      auto-assigns the subject. Mobile clients no longer prompt for it.
--   5. admin_ticket_dashboard_stats() returns a single jsonb payload
--      (total + by-status + by-severity + by-category + unassigned
--      severity) so the web dashboard can render rich interactive
--      tiles in one round trip.

-- 1. Widen the category CHECK
ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_category_check;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_category_check
  CHECK (category IN (
    'ui_ux','bug','performance','accessibility','security','navigation',
    'auth','data_sync','hardware','question','code','database','thermal'
  ));

-- 2. Backfill seeded rows
UPDATE public.support_tickets
   SET category = CASE
     WHEN subject ~ '^BUG-'   THEN 'bug'
     WHEN subject ~ '^UX-'    THEN 'ui_ux'
     WHEN subject ~ '^CODE-'  THEN 'code'
     WHEN subject ~ '^GAP-'   THEN 'data_sync'
     WHEN subject ~ '^PERF-'  THEN 'performance'
     WHEN subject ~ '^A11Y-'  THEN 'accessibility'
     WHEN subject ~ '^SEC-'   THEN 'security'
     WHEN subject ~ '^NAV-'   THEN 'navigation'
     WHEN subject ~ '^AUTH-'  THEN 'auth'
     WHEN subject ~ '^DB-'    THEN 'database'
     WHEN subject ~ '^HW-'    THEN 'hardware'
     WHEN subject ~ '^ISO-'   THEN 'thermal'
     ELSE category
   END
 WHERE subject ~ '^(BUG|UX|CODE|GAP|PERF|A11Y|SEC|NAV|AUTH|DB|HW|ISO)-';

-- 3. Helper next_ticket_code(prefix)
CREATE OR REPLACE FUNCTION public.next_ticket_code(p_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max  int;
  v_pad  text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ticket_code_' || p_prefix)::bigint);
  SELECT COALESCE(
           MAX(NULLIF(regexp_replace(subject, '^' || p_prefix || '-', ''), '')::int),
           0
         )
    INTO v_max
    FROM support_tickets
   WHERE subject ~ ('^' || p_prefix || '-[0-9]+$');
  v_pad := lpad((v_max + 1)::text, 2, '0');
  RETURN p_prefix || '-' || v_pad;
END;
$$;

-- 4. submit_support_ticket(category, body) — auto-assigns subject
DROP FUNCTION IF EXISTS public.submit_support_ticket(text, text, text);

CREATE OR REPLACE FUNCTION public.submit_support_ticket(p_category text, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller  uuid := auth.uid();
  v_role    text;
  v_id      uuid;
  v_prefix  text;
  v_subject text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT role INTO v_role FROM profiles WHERE id = v_caller;
  IF v_role NOT IN ('clinic','patient') THEN
    RAISE EXCEPTION 'Only clinic or patient accounts can file tickets' USING ERRCODE = '42501';
  END IF;

  v_prefix := CASE p_category
    WHEN 'ui_ux'         THEN 'UX'
    WHEN 'bug'           THEN 'BUG'
    WHEN 'performance'   THEN 'PERF'
    WHEN 'accessibility' THEN 'A11Y'
    WHEN 'security'      THEN 'SEC'
    WHEN 'navigation'    THEN 'NAV'
    WHEN 'auth'          THEN 'AUTH'
    WHEN 'data_sync'     THEN 'GAP'
    WHEN 'hardware'      THEN 'HW'
    WHEN 'question'      THEN 'QUE'
    WHEN 'code'          THEN 'CODE'
    WHEN 'database'      THEN 'DB'
    WHEN 'thermal'       THEN 'ISO'
    ELSE NULL
  END;

  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Invalid category: %', p_category USING ERRCODE = '22023';
  END IF;

  v_subject := next_ticket_code(v_prefix);

  INSERT INTO support_tickets (submitter_profile_id, submitter_role, category, subject, body)
  VALUES (v_caller, v_role, p_category, v_subject, trim(p_body))
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'subject', v_subject);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_support_ticket(text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.submit_support_ticket(text, text) TO authenticated;

-- 5. Admin dashboard stats
CREATE OR REPLACE FUNCTION public.admin_ticket_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status   jsonb;
  v_severity jsonb;
  v_category jsonb;
  v_role     jsonb;
  v_total    int;
  v_unassigned_sev int;
  v_resolved_last_7d int;
  v_opened_last_7d   int;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;
  SELECT count(*) INTO v_total            FROM support_tickets;
  SELECT count(*) INTO v_unassigned_sev   FROM support_tickets WHERE severity IS NULL;
  SELECT count(*) INTO v_resolved_last_7d FROM support_tickets WHERE resolved_at >= now() - interval '7 days';
  SELECT count(*) INTO v_opened_last_7d   FROM support_tickets WHERE created_at  >= now() - interval '7 days';
  SELECT jsonb_object_agg(coalesce(status,   'unknown'),    c) INTO v_status
    FROM (SELECT status,   count(*) AS c FROM support_tickets GROUP BY status)   s;
  SELECT jsonb_object_agg(coalesce(severity, 'unassigned'), c) INTO v_severity
    FROM (SELECT severity, count(*) AS c FROM support_tickets GROUP BY severity) s;
  SELECT jsonb_object_agg(coalesce(category, 'unknown'),    c) INTO v_category
    FROM (SELECT category, count(*) AS c FROM support_tickets GROUP BY category) s;
  SELECT jsonb_object_agg(coalesce(submitter_role, 'unknown'), c) INTO v_role
    FROM (SELECT submitter_role, count(*) AS c FROM support_tickets GROUP BY submitter_role) s;
  RETURN jsonb_build_object(
    'total',               v_total,
    'unassigned_severity', v_unassigned_sev,
    'resolved_last_7d',    v_resolved_last_7d,
    'opened_last_7d',      v_opened_last_7d,
    'by_status',           coalesce(v_status,   '{}'::jsonb),
    'by_severity',         coalesce(v_severity, '{}'::jsonb),
    'by_category',         coalesce(v_category, '{}'::jsonb),
    'by_role',             coalesce(v_role,     '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ticket_dashboard_stats() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_ticket_dashboard_stats() TO authenticated;
