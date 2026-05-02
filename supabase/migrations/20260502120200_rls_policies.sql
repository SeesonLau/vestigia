-- supabase/migrations/20260502120200_rls_policies.sql
-- Enables RLS on every table and defines policies. Includes
-- SECURITY DEFINER helper functions (auth_role, auth_clinic_id,
-- is_admin) that read profiles without re-entering RLS.

-- =======================
-- Helper functions
-- =======================
CREATE OR REPLACE FUNCTION auth_role() RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_clinic_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clinic_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- =======================
-- Enable RLS everywhere
-- =======================
ALTER TABLE ph_regions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_provinces           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_cities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ph_barangays           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics                ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices                ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE thermal_captures       ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log              ENABLE ROW LEVEL SECURITY;

-- =======================
-- ph_* reference tables
-- =======================
CREATE POLICY ph_regions_select   ON ph_regions   FOR SELECT TO authenticated USING (true);
CREATE POLICY ph_provinces_select ON ph_provinces FOR SELECT TO authenticated USING (true);
CREATE POLICY ph_cities_select    ON ph_cities    FOR SELECT TO authenticated USING (true);
CREATE POLICY ph_barangays_select ON ph_barangays FOR SELECT TO authenticated USING (true);

CREATE POLICY ph_regions_admin   ON ph_regions   FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY ph_provinces_admin ON ph_provinces FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY ph_cities_admin    ON ph_cities    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY ph_barangays_admin ON ph_barangays FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- =======================
-- profiles
-- =======================
CREATE POLICY profiles_select_self   ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

CREATE POLICY profiles_select_clinic ON profiles FOR SELECT TO authenticated
  USING (
    auth_role() = 'clinic'
    AND id IN (SELECT profile_id FROM patients WHERE clinic_id = auth_clinic_id())
  );

CREATE POLICY profiles_update_self   ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

CREATE POLICY profiles_delete_admin  ON profiles FOR DELETE TO authenticated
  USING (is_admin());

-- =======================
-- clinics
-- =======================
CREATE POLICY clinics_select   ON clinics FOR SELECT TO authenticated USING (true);
CREATE POLICY clinics_insert   ON clinics FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR auth.uid() = owner_profile_id);
CREATE POLICY clinics_update   ON clinics FOR UPDATE TO authenticated
  USING (is_admin() OR auth.uid() = owner_profile_id)
  WITH CHECK (is_admin() OR auth.uid() = owner_profile_id);
CREATE POLICY clinics_delete   ON clinics FOR DELETE TO authenticated
  USING (is_admin());

-- =======================
-- devices
-- =======================
CREATE POLICY devices_select ON devices FOR SELECT TO authenticated
  USING (is_admin() OR clinic_id = auth_clinic_id());
CREATE POLICY devices_write  ON devices FOR ALL TO authenticated
  USING (is_admin() OR clinic_id = auth_clinic_id())
  WITH CHECK (is_admin() OR clinic_id = auth_clinic_id());

-- =======================
-- patients
-- =======================
CREATE POLICY patients_select ON patients FOR SELECT TO authenticated
  USING (
    is_admin()
    OR clinic_id = auth_clinic_id()
    OR profile_id = auth.uid()
  );
CREATE POLICY patients_insert ON patients FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR clinic_id = auth_clinic_id());
CREATE POLICY patients_update ON patients FOR UPDATE TO authenticated
  USING (is_admin() OR clinic_id = auth_clinic_id())
  WITH CHECK (is_admin() OR clinic_id = auth_clinic_id());
CREATE POLICY patients_delete ON patients FOR DELETE TO authenticated
  USING (is_admin());

-- =======================
-- screening_sessions
-- =======================
CREATE POLICY sessions_select ON screening_sessions FOR SELECT TO authenticated
  USING (
    is_admin()
    OR subject_profile_id = auth.uid()
    OR operator_id = auth.uid()
    OR (auth_role() = 'clinic' AND clinic_id = auth_clinic_id())
  );
CREATE POLICY sessions_insert ON screening_sessions FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR subject_profile_id = auth.uid()
    OR operator_id = auth.uid()
    OR (auth_role() = 'clinic' AND clinic_id = auth_clinic_id())
  );
CREATE POLICY sessions_update ON screening_sessions FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR subject_profile_id = auth.uid()
    OR operator_id = auth.uid()
    OR (auth_role() = 'clinic' AND clinic_id = auth_clinic_id())
  )
  WITH CHECK (
    is_admin()
    OR subject_profile_id = auth.uid()
    OR operator_id = auth.uid()
    OR (auth_role() = 'clinic' AND clinic_id = auth_clinic_id())
  );
CREATE POLICY sessions_delete ON screening_sessions FOR DELETE TO authenticated
  USING (is_admin());

-- =======================
-- thermal_captures (inherit via session)
-- =======================
CREATE POLICY captures_select ON thermal_captures FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM screening_sessions s
      WHERE s.id = thermal_captures.session_id
      AND (
        s.subject_profile_id = auth.uid()
        OR s.operator_id = auth.uid()
        OR (auth_role() = 'clinic' AND s.clinic_id = auth_clinic_id())
      )
    )
  );
CREATE POLICY captures_write ON thermal_captures FOR ALL TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM screening_sessions s
      WHERE s.id = thermal_captures.session_id
      AND (
        s.operator_id = auth.uid()
        OR (auth_role() = 'clinic' AND s.clinic_id = auth_clinic_id())
        OR s.subject_profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM screening_sessions s
      WHERE s.id = thermal_captures.session_id
      AND (
        s.operator_id = auth.uid()
        OR (auth_role() = 'clinic' AND s.clinic_id = auth_clinic_id())
        OR s.subject_profile_id = auth.uid()
      )
    )
  );

-- =======================
-- classification_results (inherit via session)
-- =======================
CREATE POLICY classifications_select ON classification_results FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM screening_sessions s
      WHERE s.id = classification_results.session_id
      AND (
        s.subject_profile_id = auth.uid()
        OR s.operator_id = auth.uid()
        OR (auth_role() = 'clinic' AND s.clinic_id = auth_clinic_id())
      )
    )
  );
CREATE POLICY classifications_write ON classification_results FOR ALL TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM screening_sessions s
      WHERE s.id = classification_results.session_id
      AND (
        s.operator_id = auth.uid()
        OR (auth_role() = 'clinic' AND s.clinic_id = auth_clinic_id())
        OR s.subject_profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM screening_sessions s
      WHERE s.id = classification_results.session_id
      AND (
        s.operator_id = auth.uid()
        OR (auth_role() = 'clinic' AND s.clinic_id = auth_clinic_id())
        OR s.subject_profile_id = auth.uid()
      )
    )
  );

-- =======================
-- data_requests
-- =======================
CREATE POLICY requests_select ON data_requests FOR SELECT TO authenticated
  USING (is_admin() OR from_profile_id = auth.uid() OR to_profile_id = auth.uid());
CREATE POLICY requests_insert ON data_requests FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR from_profile_id = auth.uid());
CREATE POLICY requests_update ON data_requests FOR UPDATE TO authenticated
  USING (is_admin() OR to_profile_id = auth.uid())
  WITH CHECK (is_admin() OR to_profile_id = auth.uid());
CREATE POLICY requests_delete ON data_requests FOR DELETE TO authenticated
  USING (is_admin());

-- =======================
-- system_config
-- =======================
CREATE POLICY config_admin ON system_config FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- =======================
-- audit_log (server-side writes via service role)
-- =======================
CREATE POLICY audit_select ON audit_log FOR SELECT TO authenticated
  USING (is_admin());
