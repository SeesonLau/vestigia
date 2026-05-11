-- 20260512_seed_qa_tickets.sql
-- One-shot seed: every resolved row from _project-docs/progress/qa-bugs.md
-- as a closed support_ticket so the admin web console reflects the QA
-- history. Subject = QA code; body = issue text minus file/line; severity
-- preserved from the audit log; status = resolved; resolved_at = fix date
-- at 12:00 PHT (UTC+8); resolved_by = admin.
--
-- Submitter routing:
--   Clinic (TH-20260503-0002-00 -> f635e0a7-c5cc-4599-851c-b34f3994e34c)
--     receives every cross-cutting bug, every admin-web finding, every
--     clinic-flow file, every auth/DB/security/perf/iso finding.
--   Patient (JGS-20260502-2347-00 -> af6189d1-e507-44d0-a8f5-1176e872f0e4)
--     receives only items rooted in app/(patient)/* or
--     lib/profile/avatarUpload.ts (avatar/profile feature shipped patient-side first).
--
-- Re-run safe: skips rows whose (subject, submitter_profile_id) tuple
-- already exists.

WITH new_tickets (subject, body, severity, role, submitter, fix_dt) AS (
  VALUES
  -- Code Quality
  ('CODE-01', $b$Mock accounts hardcoded in auth store.$b$, 'high',     'clinic',  'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('CODE-02', $b$console.log audit -- only console.warn/console.error in non-sensitive paths.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('CODE-03', $b$AuthUser missing phone, created_at, updated_at.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('CODE-04', $b$ScreeningSession missing app_version.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('CODE-05', $b$PatientVitals missing recorded_at, id, session_id.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('CODE-06', $b$ThermalCapture missing resolution_x, resolution_y.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('CODE-07', $b$File-path comment missing on some utility files.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('CODE-08', $b$Submit handler was a dummy setTimeout -- no real upload.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('CODE-09', $b$MOCK_ANGIOSOMES removed when the DPN API began returning real per-angiosome regions.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('CODE-10', $b$clearSession() and discardCapture() not called on exit.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('CODE-11', $b$Clinic name hardcoded as "Cebu City Health Center".$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('CODE-12', $b$(usersData as any[]) casts.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('CODE-13', $b$Unused param i in .map().$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('CODE-14', $b$Version string hardcoded.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-30 12:00:00+08'::timestamptz),
  ('CODE-15', $b$Two separate React imports -- consolidated to a single import React, { useEffect, useState } from "react".$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('CODE-16', $b$dbg() console.log call without a __DEV__ guard.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-30 12:00:00+08'::timestamptz),
  ('CODE-18', $b$Unused label: string prop on TabIcon.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-07 12:00:00+08'::timestamptz),
  ('CODE-19', $b$Dead /(admin) switch branch removed; only clinic and patient cases remain.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('CODE-20', $b$Orphan WatermelonDB directory deleted. @nozbe/watermelondb was never tracked in package.json so stale node_modules entries will sweep on the next npm install.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('CODE-21', $b$Removed unused generateMockThermalMatrix export.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('CODE-22', $b$JSX attribute spacing fixed -- added a space between icon="..." and focused={focused} on all three Tabs.Screen tabBarIcon usages.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-08 12:00:00+08'::timestamptz),
  ('CODE-23', $b$Added a file-path comment on line 1 of the web admin root layout.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-08 12:00:00+08'::timestamptz),
  ('CODE-24', $b$Dropped the dead "cancelled" local plus its cleanup. Left a short comment explaining the trailing .catch(() => {}) silences the floating promise inside useFocusEffect -- the actual error still lands in loadError state via refreshList.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-08 12:00:00+08'::timestamptz),
  ('CODE-25', $b$Deleted the dead buildUnprocessedPng private fn plus its docstring. Slot 1 is now always rendered via buildProcessedPng(crop=null) so the unused grayscale encoder is gone. compileReleaseKotlin clean in 15 s.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-08 12:00:00+08'::timestamptz),

  -- UI / UX -- BUG family
  ('BUG-01', $b$"Connect & Start Scanning" button had no onPress.$b$, 'critical', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('BUG-02', $b$"Use This Frame" button had no onPress.$b$, 'critical', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('BUG-03', $b$Submit and Cancel buttons had no onPress handlers.$b$, 'critical', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('BUG-05', $b$Foot selector buttons had no onPress; active style was hardcoded.$b$, 'critical', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('BUG-06', $b$THUMB_H aspect ratio was wrong on session-detail, assessment and patient index thumbnails.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-06 12:00:00+08'::timestamptz),

  -- UX
  ('UX-01', $b$Quick Action buttons on the clinic home had no onPress.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('UX-02', $b$Session card onPress missing on the patient home.$b$, 'medium', 'patient', 'af6189d1-e507-44d0-a8f5-1176e872f0e4', '2026-03-20 12:00:00+08'::timestamptz),
  ('UX-03', $b$Action buttons on the admin index had no handlers.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('UX-04', $b$Clinic settings handlers were stubs.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('UX-05', $b$Patient settings screen was a stub.$b$, 'medium', 'patient', 'af6189d1-e507-44d0-a8f5-1176e872f0e4', '2026-03-20 12:00:00+08'::timestamptz),
  ('UX-06', $b$Admin settings handlers were stubs.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('UX-07', $b$Session detail screens read from MOCK_CLINIC_SESSIONS.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('UX-08', $b$Admin Activate/Deactivate only called setSelected(null) -- no Supabase write.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('UX-09', $b$Admin index had no ActivityIndicator or error state.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('UX-10', $b$Patient index had no error state on the session fetch.$b$, 'medium', 'patient', 'af6189d1-e507-44d0-a8f5-1176e872f0e4', '2026-03-21 12:00:00+08'::timestamptz),
  ('UX-11', $b$Hardcoded device card on the clinic home -- removed in the home-redesign commit.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('UX-12', $b$system_config failure in admin settings was silently ignored.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('UX-13', $b$"Good morning" greeting on the clinic home was hardcoded -- now derived from local time.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('UX-14', $b$Emoji and unclear Unicode replaced with Ionicons across multiple screens.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('UX-15', $b$Clinic index missing an ActivityIndicator while fetching.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-30 12:00:00+08'::timestamptz),
  ('UX-16', $b$clinicResult.error was silently ignored on the clinic home.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-30 12:00:00+08'::timestamptz),
  ('UX-17', $b$Debug ID strings were visible in production across several screens.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-30 12:00:00+08'::timestamptz),
  ('UX-18', $b$Orphan (patient)/save.tsx route deleted; the matching Tabs.Screen entry in (patient)/_layout.tsx removed.$b$, 'low', 'patient', 'af6189d1-e507-44d0-a8f5-1176e872f0e4', '2026-05-07 12:00:00+08'::timestamptz),
  ('UX-19', $b$Dropped the unused asymmetry? prop and the AsymmetryResult import from FootAngiosomeDiagram; updated the call site in DpnResultView.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('UX-20', $b$Replaced the native confirm() in the admin Clinics queue with a styled Approve confirmation modal that mirrors the Reject one (cancel + Approve buttons, inline error). The Reject modal also moved off alert() for the "Reason is required" check -- the error now renders inline.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-08 12:00:00+08'::timestamptz),
  ('UX-21', $b$Replaced the native alert() on the admin Password Resets queue with an inline dismissible success banner: "Password updated for {facility}. Communicate the new password to {operator}..." -- the admin can dismiss with x or it stays until the next action.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-08 12:00:00+08'::timestamptz),

  -- Supabase / Data integration
  ('GAP-04', $b$Mock AI classification replaced by a real dpnApi.scanPatient() call (HuggingFace Spaces YOLOv11 + sklearn fusion).$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-07 12:00:00+08'::timestamptz),
  ('GAP-05', $b$Clinical-data submit did not write to Supabase.$b$, 'critical', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('GAP-07', $b$Save to cloud never inserted from the assessment screen.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('GAP-09', $b$Clinic history read from MOCK_CLINIC_SESSIONS.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('GAP-10', $b$Admin users page read from MOCK_ALL_USERS.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('GAP-11', $b$Admin clinics page read from MOCK_CLINICS and MOCK_DEVICES.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('GAP-12', $b$Clinic index .then() had no error branch.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('GAP-13', $b$Admin index Promise.all() had no error handling.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('GAP-14', $b$Patient index fetches did not destructure error.$b$, 'medium', 'patient', 'af6189d1-e507-44d0-a8f5-1176e872f0e4', '2026-03-21 12:00:00+08'::timestamptz),
  ('GAP-15', $b$History screen PostgREST join alias mismatch.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-30 12:00:00+08'::timestamptz),
  ('GAP-16', $b$Admin users error not destructured from the Supabase response.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-30 12:00:00+08'::timestamptz),
  ('GAP-17', $b$Admin clinics error not destructured from the Supabase response.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-30 12:00:00+08'::timestamptz),
  ('GAP-18', $b$Admin Activate/Deactivate raised no user-facing notification on Supabase error.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-05 12:00:00+08'::timestamptz),
  ('GAP-19', $b$Patient deactivate-account flow now destructures { error } and surfaces Alert.alert("Could not deactivate", error.message) instead of silently signing the user out. Same fix applied to the clinic profile.$b$, 'medium', 'patient', 'af6189d1-e507-44d0-a8f5-1176e872f0e4', '2026-05-07 12:00:00+08'::timestamptz),
  ('GAP-20', $b$Clinic sync data_requests insert now destructures error and console.warns the message so failures do not disappear.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('GAP-21', $b$When feed_mode='processed' with no ROI, slot 2 is null and the processed_path insert is null. Verified that the bundle viewer and PatientDetailsScreen handle this correctly.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),

  -- Performance
  ('PERF-01..04', $b$generateMockThermalMatrix called at module or component scope on session/[id], assessment and patient/index -- moved inside effects/refs.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('PERF-05', $b$app.json "output": "static" caused an SSR crash.$b$, 'critical', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('PERF-06', $b$createClient() in lib/supabase was blocking startup.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('PERF-07', $b$Supabase proxy get trap returned unbound methods.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('PERF-08', $b$Full profile fetch on every cold start.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('PERF-09..11', $b$Inline arrow function inside FlatList renderItem on history, users and clinics screens.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-30 12:00:00+08'::timestamptz),
  ('PERF-12', $b$Clinic profile successTimerRef now lives in a useRef and is cleared on unmount via the useEffect cleanup return.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('PERF-13', $b$Same pattern applied on the patient profile timer.$b$, 'low', 'patient', 'af6189d1-e507-44d0-a8f5-1176e872f0e4', '2026-05-07 12:00:00+08'::timestamptz),

  -- Accessibility
  ('A11Y-01', $b$"Guides" toggle on the live feed had no accessibilityLabel.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('A11Y-02', $b$Chevron on the clinic home had no accessibility role.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('A11Y-03', $b$Colors.text.muted contrast was 3.64:1 -- below WCAG AA.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('A11Y-04', $b$Muted badge text contrast was about 4.4:1.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-07 12:00:00+08'::timestamptz),
  ('A11Y-05', $b$No tabBarAccessibilityLabel after the tabs went icons-only.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-30 12:00:00+08'::timestamptz),
  ('A11Y-06', $b$Light accent #009DAE -> #0E7A89. White text on accent now 5.06:1 (was 3.27:1).$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('A11Y-07', $b$Dark accent #26C6DA -> #0E7A89. White text now 5.06:1 (was 2.04:1).$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('A11Y-08', $b$warning #F59E0B -> #B45309. On white now 5.03:1 (was 2.14:1).$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('A11Y-09', $b$error #EF4444 -> #B91C1C. On white now 6.46:1 (was 3.76:1).$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('A11Y-10', $b$Added accessibilityLabel="Back" and accessibilityRole="button" to the header back-arrow on request-password-reset.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-08 12:00:00+08'::timestamptz),
  ('A11Y-11', $b$Same accessibility fix on the shared FeedbackScreen -- covers both clinic and patient feedback routes.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-08 12:00:00+08'::timestamptz),

  -- Security
  ('SEC-01', $b$Mock service-role bypass in the auth store.$b$, 'critical', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('SEC-02', $b$RLS INSERT WITH CHECK clauses missing across multiple tables.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('SEC-03', $b$Heart rate and HbA1c inputs had no range validation in clinical-data.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('SEC-04', $b$Avatar upload wrote to <userId>/avatar.jpg but the avatars_write RLS policy required profiles/<auth.uid()>/... -- every upload was rejected. Path now profiles/${userId}/avatar.jpg.$b$, 'medium', 'patient', 'af6189d1-e507-44d0-a8f5-1176e872f0e4', '2026-05-07 12:00:00+08'::timestamptz),
  ('SEC-05', $b$avatars bucket was private -- getPublicUrl() returned a URL that could not load. Bucket flipped to public; RLS still gates writes.$b$, 'low', 'patient', 'af6189d1-e507-44d0-a8f5-1176e872f0e4', '2026-05-07 12:00:00+08'::timestamptz),
  ('SEC-06', $b$Verified end-to-end: caller JWT validated via auth.getUser(); admin role checked via service-role read of profiles.role BEFORE any privileged action; UUIDs validated; password length enforced (>= 8); clinic_profile_id of the request row must match the body profile_id; pending-only state guard prevents double-resolution; password update + row stamp are sequenced so a stamp failure does not leave the password un-changed. CORS wildcard is intentional (admin web may be deployed at multiple origins).$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-08 12:00:00+08'::timestamptz),

  -- Navigation
  ('NAV-02', $b$router.replace() fired before Root Layout mounted.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),
  ('NAV-03', $b$Patient settings was unreachable.$b$, 'medium', 'patient', 'af6189d1-e507-44d0-a8f5-1176e872f0e4', '2026-03-30 12:00:00+08'::timestamptz),
  ('NAV-04', $b$Five screens were missing back buttons.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-07 12:00:00+08'::timestamptz),
  ('NAV-07', $b$New home screens pushed ?sessionId=... (camelCase) but bundle-detail read session_id (snake_case); the empty fallback reached Postgres as eq("id", "") and surfaced as "invalid input syntax for type uuid: ''".$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),

  -- Auth history
  ('AUTH-01', $b$resetPasswordForEmail missing redirectTo.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-02', $b$update-password.tsx was missing entirely.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-03', $b$Deep link handler was missing.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-04', $b$Password validation showed errors one at a time on register.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-05', $b$Mock accounts wired into the auth store.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-06', $b$No login lockout after repeated failures.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-07', $b$Admin registration path was unclear -- clarified that admin is created via the dashboard / web app only.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-08', $b$Login rejected valid passwords shorter than 8 chars on sign-in (the length rule should only fire on register).$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-09', $b$Unknown role caused a silent freeze on login and register.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-10', $b$selectedClinicId was not reset on role switch in register.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-11', $b$update-password.tsx had no session guard.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-12', $b$Deep link handler in _layout was too broad.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-13', $b$onAuthStateChange subscription leaked.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-14', $b$pendingClinicId was held for all roles; logout() was missing try-finally.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-15', $b$PGRST116 was not mapped to a friendly error.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('AUTH-16', $b$Clinic-approval gate added -- login() now reads clinics.approval_status for the clinic owner; pending and rejected clinics are signed out with a clear message; auto-sign-in removed from registerClinic() so freshly registered clinics land on clinic-pending-approval instead.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('BUG-04', $b$No inactivity timeout on the root layout -- added useInactivityTimeout (30 min).$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-21 12:00:00+08'::timestamptz),

  -- Schema / DB
  ('DB-01', $b$Tables not yet verified against the thesis schema.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('DB-02', $b$RLS not yet verified end-to-end.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-03-20 12:00:00+08'::timestamptz),
  ('DB-03 / GAP-06', $b$WatermelonDB sync deferred -- replaced by expo-sqlite. CODE-20 covers the orphan-file cleanup.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('GAP-01', $b$BLE scan was mock.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-06 12:00:00+08'::timestamptz),
  ('GAP-02', $b$Wi-Fi WebSocket was not implemented.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-06 12:00:00+08'::timestamptz),
  ('GAP-03', $b$Live feed frames came from a mock setInterval.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-06 12:00:00+08'::timestamptz),
  ('HW-01', $b$UVC native module was stubbed.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-08 12:00:00+08'::timestamptz),
  ('DB-05', $b$Added feed_mode TEXT NOT NULL DEFAULT 'unprocessed' and relaxed processed_image_path NOT NULL so the new 3-slot pipeline can store rows where slot 2 is null.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('DB-06', $b$Flipped the avatars bucket public.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('DB-07', $b$Admin gating + tickets migration: clinics.approval_status (plus approved_by / approved_at / rejection_reason); clinic_password_reset_requests + RLS; support_tickets + RLS; RPCs submit_password_reset_request, submit_support_ticket, admin_approve_clinic, admin_reject_clinic, admin_resolve_ticket. Existing clinics back-filled to approval_status='approved'. Trigger clinics_block_non_admin_approval_change fences the new admin-only columns from non-admin updates.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('DB-08', $b$Docstring rewritten to describe the new symmetric semantics of feed_mode: unprocessed = Raw mode, processed = Enhanced mode; both produce (full, cropped or null, isolated). No SQL change -- the CHECK constraint and nullable processed_image_path are still correct.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-08 12:00:00+08'::timestamptz),

  -- Thermal isolation
  ('ISO-01', $b$Cold subject inverted polarity -- fixed by border-polarity component selection.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-15 12:00:00+08'::timestamptz),
  ('ISO-02', $b$Thin structure severed before closing -- fixed by closing before BFS.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-15 12:00:00+08'::timestamptz),
  ('ISO-03', $b$Coloured fringe residue -- fixed by opening after BFS.$b$, 'medium', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-04-15 12:00:00+08'::timestamptz),
  ('ISO-04', $b$Variance guardrail was empirical -- superseded by the ROI moat sampler plus one-sided threshold.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('ISO-05', $b$Internal donut hole inside the warm foot remained even after closing morph -- new fillHoles() helper does 4-connect BFS from the frame border on the inverse mask.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('ISO-06', $b$When the foot extended past the framing rectangle, bgMedian over the entire outside region was pulled toward the foot's own temperature; threshold ballooned and most of the foot fell below it. Moat sampler now reads only the thin ring outside the ROI.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-07 12:00:00+08'::timestamptz),
  ('ISO-07', $b$Symmetric 3-slot pipeline: processCapture derives feedMode from the enhanced flag; processThermalFrames divergent branches collapsed into one uniform path producing slot 1 = palette full, slot 2 = palette cropped (null when no ROI), slot 3 = isolated cropped. Bundle viewers (online + offline) read feed_mode and render RAW/ENHANCED labels. Offline ThermalBundle now persists feed_mode; FootData.processed_image_b64 is nullable.$b$, 'high', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-08 12:00:00+08'::timestamptz),
  ('ISO-08', $b$Re-ran npx expo prebuild --platform android --no-install to regenerate the 25 baked-in launcher webp files (5 sizes x 5 variants) from the LumenAI adaptive-icon paths in app.json -- the create-expo-app default blue triangle was sticking around because prebuild had not been re-run since the brand assets were swapped. Splash colours splashscreen_background (light/dark) also picked up the teal values from app.json. UVCModule.kt and the rest of the java source were untouched.$b$, 'low', 'clinic', 'f635e0a7-c5cc-4599-851c-b34f3994e34c', '2026-05-08 12:00:00+08'::timestamptz)
)
INSERT INTO public.support_tickets (
  submitter_profile_id,
  submitter_role,
  category,
  subject,
  body,
  status,
  severity,
  admin_response,
  resolved_by,
  resolved_at,
  created_at,
  updated_at
)
SELECT
  t.submitter::uuid,
  t.role,
  'bug',
  t.subject,
  t.body,
  'resolved',
  t.severity,
  $b$Closed during the 2026-05-08 QA sweep; verified against the codebase at audit time. See _project-docs/progress/qa-bugs.md for the full audit trail.$b$,
  '5eecb2a4-7ff5-4ade-86b5-b473133b72bd'::uuid,
  t.fix_dt,
  t.fix_dt - interval '1 hour',
  t.fix_dt
FROM new_tickets t
WHERE NOT EXISTS (
  SELECT 1 FROM public.support_tickets st
  WHERE st.subject = t.subject AND st.submitter_profile_id = t.submitter::uuid
);
