-- 20260512_ticket_activity_timeseries.sql
-- Daily opened-vs-resolved time series over the support_tickets table.
-- Returns one row per calendar day for the last N days (default 30),
-- back-filled with zeroes via generate_series so the line chart never
-- has gaps. Admin-only; called by the web dashboard.

CREATE OR REPLACE FUNCTION public.admin_ticket_activity_timeseries(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series jsonb;
  v_days   int;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;
  v_days := GREATEST(1, LEAST(COALESCE(p_days, 30), 365));

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'day',      d.day::text,
      'opened',   COALESCE(o.cnt, 0),
      'resolved', COALESCE(r.cnt, 0)
    ) ORDER BY d.day
  ), '[]'::jsonb)
  INTO v_series
  FROM generate_series(
    (CURRENT_DATE - ((v_days - 1) || ' days')::interval)::date,
    CURRENT_DATE,
    interval '1 day'
  ) AS d(day)
  LEFT JOIN (
    SELECT created_at::date AS day, count(*) AS cnt
      FROM support_tickets
     WHERE created_at >= CURRENT_DATE - (v_days || ' days')::interval
     GROUP BY created_at::date
  ) o ON o.day = d.day
  LEFT JOIN (
    SELECT resolved_at::date AS day, count(*) AS cnt
      FROM support_tickets
     WHERE resolved_at IS NOT NULL
       AND resolved_at >= CURRENT_DATE - (v_days || ' days')::interval
     GROUP BY resolved_at::date
  ) r ON r.day = d.day;

  RETURN v_series;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ticket_activity_timeseries(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_ticket_activity_timeseries(int) TO authenticated;
