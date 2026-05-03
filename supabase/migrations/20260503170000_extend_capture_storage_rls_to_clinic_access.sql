-- supabase/migrations/20260503170000_extend_capture_storage_rls_to_clinic_access.sql
-- The screening_sessions SELECT policy was already extended so a clinic
-- can see sessions of patients who granted clinic_access (status='accepted').
-- The captures and storage policies were not, so the clinic could see the
-- session row but not the thermal_captures rows or the underlying images
-- and CSVs. Extend all three with the same OR clause.

DROP POLICY IF EXISTS captures_select ON public.thermal_captures;
CREATE POLICY captures_select ON public.thermal_captures FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM screening_sessions s
      WHERE s.id = thermal_captures.session_id
        AND (
          s.subject_profile_id = auth.uid()
          OR s.operator_id      = auth.uid()
          OR (auth_role() = 'clinic'::user_role AND s.clinic_id = auth_clinic_id())
          OR (
            auth_role() = 'clinic'::user_role
            AND s.subject_profile_id IN (
              SELECT ca.patient_profile_id FROM clinic_access ca
              WHERE ca.clinic_id = auth_clinic_id() AND ca.status = 'accepted'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS thermal_images_read ON storage.objects;
CREATE POLICY thermal_images_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'thermal-images'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM screening_sessions s
        WHERE s.id::text = (storage.foldername(objects.name))[1]
          AND (
            s.subject_profile_id = auth.uid()
            OR s.operator_id      = auth.uid()
            OR (auth_role() = 'clinic'::user_role AND s.clinic_id = auth_clinic_id())
            OR (
              auth_role() = 'clinic'::user_role
              AND s.subject_profile_id IN (
                SELECT ca.patient_profile_id FROM clinic_access ca
                WHERE ca.clinic_id = auth_clinic_id() AND ca.status = 'accepted'
              )
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS thermal_csv_read ON storage.objects;
CREATE POLICY thermal_csv_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'thermal-csv'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM screening_sessions s
        WHERE s.id::text = (storage.foldername(objects.name))[1]
          AND (
            s.subject_profile_id = auth.uid()
            OR s.operator_id      = auth.uid()
            OR (auth_role() = 'clinic'::user_role AND s.clinic_id = auth_clinic_id())
            OR (
              auth_role() = 'clinic'::user_role
              AND s.subject_profile_id IN (
                SELECT ca.patient_profile_id FROM clinic_access ca
                WHERE ca.clinic_id = auth_clinic_id() AND ca.status = 'accepted'
              )
            )
          )
      )
    )
  );
