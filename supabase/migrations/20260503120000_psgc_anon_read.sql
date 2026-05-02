-- supabase/migrations/20260503120000_psgc_anon_read.sql
-- PSGC reference data is non-sensitive (public administrative codes).
-- Allow anonymous reads so clinic signup pickers can populate before
-- the user is authenticated.

DROP POLICY IF EXISTS ph_regions_select   ON ph_regions;
DROP POLICY IF EXISTS ph_provinces_select ON ph_provinces;
DROP POLICY IF EXISTS ph_cities_select    ON ph_cities;
DROP POLICY IF EXISTS ph_barangays_select ON ph_barangays;

CREATE POLICY ph_regions_select   ON ph_regions   FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ph_provinces_select ON ph_provinces FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ph_cities_select    ON ph_cities    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ph_barangays_select ON ph_barangays FOR SELECT TO anon, authenticated USING (true);
