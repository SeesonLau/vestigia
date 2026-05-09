# Figure descriptions for Methodology Chapter 2

Drop each block under its corresponding figure in the thesis document.
The text is written as an *introducing* paragraph (referenced as
"Figure 2.X.Y" in the third person, present tense) so it reads as a
caption-companion, not as standalone documentation.

Section 2.4 has no figures — its descriptions live inline as the 10
prose subsections produced by chat 2.

---

## Section 2.1 — System Architecture

### Fig 2.1.1 — System Overview

Figure 2.1.1 presents the global architecture of LumenAI as a six-tier
stack. Thermal data originates at the *Hardware* tier (FLIR Lepton 3.5
sensor + PureThermal Mini Pro USB host), passes through the *Firmware*
tier where the camera-side STM32 firmware and the Android-side Kotlin
module preprocess each frame, and reaches the *Mobile App* tier built
on React Native and Expo Router. From the mobile app, processed
sessions flow over HTTPS to the *Cloud* tier — a Supabase project
that bundles row-level-security-gated Postgres, Auth, Storage, three
Edge Functions, and ten SECURITY DEFINER RPCs — and out to the
*External AI* tier, a remote HuggingFace Spaces FastAPI server that
wraps a YOLOv11 foot detector and a sklearn fusion classifier. The
*Web Admin* tier is a separate Next.js console that interacts with the
same Cloud tier over HTTPS for clinic vetting, password-reset
mediation, and ticket triage; it does not touch the Hardware or
Firmware tiers.

### Fig 2.1.2 — Hardware Tier

Figure 2.1.2 details the physical signal chain from the thermal sensor
to the host phone. The FLIR Lepton 3.5 micro-thermal core captures a
160 × 120 long-wave-infrared scene with per-pixel radiometric
calibration and streams the raw frames over the Video-over-SPI (VoSPI)
protocol; configuration commands run on a separate I²C control channel
known as the Lepton Command and Control Interface (CCI). The carrier
board, GroupGets's PureThermal Mini Pro, embeds an STM32F412
microcontroller running the open-source PureThermal firmware. The
STM32 ingests VoSPI frames, applies minimal repackaging, and
re-publishes the stream as a USB Video Class (UVC) device. The Android
phone enumerates that UVC endpoint over a USB-OTG cable and consumes
the Y16-format frames at approximately 9 frames per second. The
dashed `ESP32 + BLE` element marks a future wireless variant; it is
not part of the current prototype.

### Fig 2.1.3 — Firmware / Native UVC Pipeline

Figure 2.1.3 picks up where the camera-side firmware stops and traces
the per-frame processing chain implemented in the Android-side Kotlin
module `UVCModule.kt`. Each Y16 frame received over USB enters the
pipeline and is processed sequentially. A 3 × 3 spatial median filter
suppresses pixel-level noise, after which a motion-adaptive
exponential-moving-average (EMA) temporal filter dampens still pixels
while preserving fast motion edges. Contrast-Limited Adaptive
Histogram Equalisation (CLAHE) restores local contrast lost to the
camera's wide dynamic range using an 8 × 8 tile grid with clip limit
3.0. A bilinear upscale to 320 × 240 doubles the visible resolution,
followed by a 3 × 3 unsharp mask that sharpens the upscaled image. An
emissivity correction (skin ε ≈ 0.98 with reflected temperature
configurable per device) converts apparent brightness back to physical
temperature, and the palette stage maps temperatures to RGB using the
medical default. The same processed matrix forks into five outputs:
the live preview frame for the on-screen camera, the three-slot
bundle PNGs (full / cropped / isolated) for the bilateral capture, a
16-bit TIFF that preserves the radiometric values, the full-frame
CSV grid in degrees Celsius, and the masked CSV in which background
cells are zeroed.

### Fig 2.1.4 — Mobile App Tier

Figure 2.1.4 decomposes the React Native app into its primary
sub-systems. Expo Router groups the screen file tree by role —
`(auth)`, `(clinic)`, `(patient)`, and `(offline)` — and navigation
between roles is gated by Zustand stores for authentication, capture
session, DPN result, and region-of-interest state. A small set of
TypeScript libraries handles the cross-cutting concerns: `lib/thermal`
wraps the native UVC bridge and stages bilateral bundles, `lib/dpnApi`
is the typed client for the HuggingFace classifier, `lib/profile`
orchestrates the avatar upload and circular crop pipeline, and
`lib/admin` wraps the clinic-approval and support-ticket RPCs. The
native `UVCModule` (a hexagonal external system in the figure) is
reached only through `lib/thermal/uvcCamera.ts`; Supabase is reached
over HTTPS by every store; the HuggingFace classifier is reached only
via `lib/dpnApi.ts`.

### Fig 2.1.5 — Cloud Backend Tier

Figure 2.1.5 inventories the Supabase project that backs the mobile
and web tiers. The Postgres tier carries the operational tables —
`profiles`, `clinics`, `patients`, `screening_sessions`,
`thermal_captures`, `classification_results` — alongside the workflow
tables added in version 1.0.0: `support_tickets`,
`clinic_password_reset_requests`, and `clinic_access_relationships`.
Row-level security is enabled on every table, with INSERT WITH CHECK
clauses constraining writes to the caller's clinic or session.
Storage holds three buckets: `avatars` (public read, RLS-gated write),
`thermal-images` (private, signed URLs), and `thermal-csv` (private,
signed URLs). Three Edge Functions handle workflows that require a
service-role escalation — `clinic-signup` provisions a new clinic
atomically, `auth-redirect` serves the email-confirmation HTML
bridge, and `admin-set-clinic-password` lets the admin web console
reset a clinic's password after JWT and role validation. Ten
SECURITY DEFINER RPCs expose the rest of the workflow surface to the
mobile app and the web admin.

### Fig 2.1.6 — Web Admin Tier

Figure 2.1.6 outlines the Next.js admin console under the `web/`
directory. The root page redirects to `/admin`, where a layout-level
auth gate (the `useAdminSession` hook) verifies that the signed-in
user has `profiles.role = 'admin'` before rendering any of the four
queues — Dashboard, Clinics, Password Resets, or Tickets. Both the
auth hook and the typed RPC wrappers in `web/lib/admin-rpc.ts` reach
Supabase over HTTPS, and the web console never carries a service-role
key; every privileged operation is delegated to the
`admin-set-clinic-password` Edge Function or to a SECURITY DEFINER
RPC.

### Fig 2.1.7 — External AI Tier

Figure 2.1.7 shows the integration with the external Diabetic
Peripheral Neuropathy classifier. The mobile app hits the public
HuggingFace Spaces endpoint `catnipp9/transistors-thermal-dpn-ai`,
which hosts a FastAPI server. The model pipeline inside the Space
runs a YOLOv11 foot detector that gates the input on a valid foot
bounding box, followed by a sklearn fusion classifier that consumes
both convolutional features and per-angiosome temperature statistics.
Because Spaces idle after roughly fifteen minutes of inactivity, the
mobile client polls `GET /health` every five seconds with a
sixty-second timeout to wake the container before issuing the
`POST /predict` call; on cold-start the user sees a "warming up"
indicator. The classifier returns left- and right-foot predictions,
per-foot confidence percentages, the per-angiosome means (medial
plantar, lateral plantar, medial calcaneal, lateral calcaneal), and
the inter-foot asymmetry block.

---

## Section 2.6 — Process Charts

### Fig 2.6.1 — Patient Sign-Up

Figure 2.6.1 traces the patient-onboarding path. Registration begins
on `(auth)/register.tsx`, where the email, password, and demographic
fields are validated client-side. On success, `auth.signUp` writes
both the `auth.users` row and (via the `handle_new_user` trigger) the
matching `profiles` row, after which Supabase emails the user a
confirmation link. Tapping the link loads the `(auth)/account-activated`
deep-link handler, which calls `auth.setSession` and routes the user
to the patient home. Validation failures loop back to the form;
sign-up errors terminate at an error state.

### Fig 2.6.2 — Clinic Sign-Up

Figure 2.6.2 traces the clinic-onboarding path, which differs from
the patient path because a service-role escalation is needed to
provision the clinic atomically. The DOH LTO and PSGC location codes
are validated client-side first; the `clinic-signup` Edge Function
then writes the `clinics` row with `approval_status = 'pending'` and
the auth user in a single transaction. The newly registered operator
is shown the auto-generated `clinic_code` and parked on the
pending-approval screen — they cannot sign in until an administrator
on the web console invokes either `admin_approve_clinic` or
`admin_reject_clinic`.

### Fig 2.6.3 — Sign-In

Figure 2.6.3 enforces three orthogonal checks during sign-in. A
five-attempt / thirty-second lockout prevents brute-force credential
stuffing; a role check rejects admin accounts on the mobile binary
because admins must use the web console; and clinic accounts are
gated against `clinics.approval_status` so that pending or rejected
clinics are signed back out with the rejection reason. Patients fall
through directly to the patient home, while approved clinics route
to the clinic home.

### Fig 2.6.4 — Patient Password Reset

Figure 2.6.4 traces the patient-side password recovery flow. The user
submits their email and the client calls `auth.resetPasswordForEmail`,
which delivers a tokenised link to the inbox. Tapping the link lands
on the web bridge at `/auth/reset-password`, which immediately forwards
to the mobile deep-link `lumenai://auth/reset-password`. The deep-link
handler calls `auth.setSession` with the recovery tokens, after which
`(auth)/update-password.tsx` collects the new password and submits via
`auth.updateUser`.

### Fig 2.6.5 — Clinic Password Reset (Admin-Mediated)

Figure 2.6.5 traces the admin-mediated clinic password recovery flow.
Because clinic accounts use fabricated emails, the standard email
reset is unavailable. A logged-in clinic instead files a
`clinic_password_reset_requests` row through the
`submit_password_reset_request` RPC. The administrator on the web
console picks up the request, verifies the requester's identity by
phone against the contact mobile on file, then invokes the
`admin-set-clinic-password` Edge Function. The Edge Function
double-checks the caller's JWT and admin role before calling
`auth.admin.updateUserById` and stamping the request row as approved.
The administrator communicates the new password back to the clinic
over the same call.

### Fig 2.6.6 — Inactivity Timeout

Figure 2.6.6 traces the thirty-minute inactivity sign-out. The
`useInactivityTimeout` hook, mounted in `app/_layout.tsx`, observes
touch events on the entire app surface. Any touch resets the timer;
if the timer elapses without a touch, the hook calls `auth.signOut`
and routes back to the login screen. The clinic-screening flow,
which can span ten minutes of preparation followed by capture,
deliberately falls inside the thirty-minute window so that idle
sessions are reaped without interrupting active ones.

### Fig 2.6.7 — Bilateral Capture

Figure 2.6.7 traces the central thermal-capture pipeline. The screen
first checks that the UVC camera is connected; if not, it falls into
the connect flow (Figure 2.6.9) and re-checks afterwards. Once a live
preview is running, the operator may optionally drag a region-of-
interest rectangle, then performs two separate captures — left foot,
then right foot. Each capture buffers a brief frame window and
submits the buffer to the native `processCapture` method, which
returns a symmetric three-slot bundle: the full palette frame, the
same palette image cropped to the ROI (or null when no ROI was
drawn), and the isolated foot. The bundle is staged in
`useThermalStore` and the operator advances to the patient details
form. Discarding mid-flow returns to the live preview without saving.

### Fig 2.6.8 — Foot Isolation

Figure 2.6.8 details the per-frame foot-isolation algorithm that runs
inside `processCapture`. When an ROI is drawn, the algorithm samples
background temperatures from the thin "moat" just outside the ROI
rectangle, computes a one-sided threshold that survives sensor drift,
extracts the largest connected component via breadth-first search,
fills internal holes by flooding the inverse mask from the frame
border, and re-clips the result to the ROI box. When no ROI is drawn,
the algorithm falls back to a global Otsu threshold followed by the
same largest-component selection. Both branches return a boolean
mask of identical shape; the masked CSV and the third bundle slot
are derived from this mask.

### Fig 2.6.9 — UVC Camera Connect

Figure 2.6.9 traces the USB connection sequence. The Android USB host
service is queried for connected devices, and the Lepton's vendor and
product identifiers are matched against the enumerated list. If
permission has not been granted before, the system permission dialog
is shown; on grant, the JNI `connect` method opens the UVC stream and
frames begin arriving asynchronously through the `onDisplayFrame`
callback. Failures at any of the three checkpoints — no Lepton
present, permission denied, or JNI failure — surface as an error
state with role-appropriate copy.

### Fig 2.6.10 — DPN Classification

Figure 2.6.10 traces the AI inference pipeline. The mobile client
first hits the HuggingFace Spaces health endpoint to wake the model
container; it polls `GET /health` every five seconds for up to sixty
seconds. Once the server reports ready, the masked CSVs for both feet
are POSTed to `/predict/patient/mobile`. If the YOLO foot detector
rejects the input — for example, when no valid foot is visible — the
classifier returns an "Unknown" verdict and the result is rendered
without a save. Otherwise, the parsed result is persisted to
`classification_results` and rendered on the DPN result screen. A
sixty-second timeout terminates at an error state and offers a retry.

### Fig 2.6.11 — Save Online

Figure 2.6.11 traces the cloud-save sequence for an online capture.
After a final guard that confirms all required slots are present, the
client uploads slot 1 (the full palette PNG) and slot 3 (the isolated
foot PNG) and the masked CSV unconditionally, while slot 2 (the
cropped palette PNG) is uploaded only when a region of interest was
drawn. After the four storage uploads succeed, the `thermal_captures`
row and the parent `screening_sessions` row are inserted in a single
transaction, with the session's status moving to `analysed`.

### Fig 2.6.12 — Save Offline

Figure 2.6.12 traces the on-device save flow used by the offline
guest path. After confirming both feet were captured,
`bundleStorage.saveBundle` writes a JSON `ThermalBundle` to
AsyncStorage and then attempts a best-effort write of the PNG and
CSV files to the device's downloads folder. The bundle code
generated by the helper (e.g. `S_260508-1430`, formed from the
patient's last initial and the timestamp) is the offline-flow's
analogue to a Postgres primary key.

### Fig 2.6.13 — Submit Offline Session to Clinic

Figure 2.6.13 traces the cross-role submission flow. A patient who
captured offline (or who simply wants to share an existing session)
enters the target clinic's eight-character code on the
submit-to-clinic screen. The `submit_session_to_clinic` RPC validates
the format, looks up the clinic by code, confirms it is active, and
inserts a `clinic_access_relationships` row at status `accepted` so
the receiving clinic can read the session. The receiving clinic sees
the session in its history view on the next focus event.

### Fig 2.6.14 — Clinic Access Relationship Lifecycle

Figure 2.6.14 traces the lifecycle of a clinic-access relationship.
A clinic can request access to a patient's history through
`request_clinic_access`, which inserts a row at status `pending`. The
patient sees the request in the inbox on the sync screen and either
accepts or rejects it via `respond_to_clinic_access`. After
acceptance, either side can revoke the relationship at any time using
`revoke_clinic_access`, after which the clinic loses access
immediately. The figure makes the lane separation between *Clinic*,
*Patient*, and *System* explicit so the chapter prose can highlight
which side initiates each transition.

### Fig 2.6.15 — Submit Support Ticket

Figure 2.6.15 traces the support-ticket submission and status-echo
flow. Either role can submit a ticket from the Settings hub. Subject
and body are length-checked at the SQL level (3–120 and 3–4000
characters respectively); the `submit_support_ticket` RPC inserts a
row at status `open`, identifying the submitter from `auth.uid()`.
The submitter's "My Tickets" list refetches on focus so an admin's
response appears the next time the user returns to the screen.

### Fig 2.6.16 — Approve / Reject Clinic

Figure 2.6.16 traces the admin-side decision flow for pending clinic
applications. An administrator filtering for pending clinics selects
a row and chooses Approve or Reject. The approval modal confirms the
facility name and DOH LTO; the reject modal additionally collects a
reason that the clinic will see at the next sign-in attempt. Both
paths route through SECURITY DEFINER RPCs (`admin_approve_clinic` and
`admin_reject_clinic`) that write to the clinic row and reload the
queue.

### Fig 2.6.17 — Set Clinic Password (Edge Function)

Figure 2.6.17 traces the privileged path used by the admin to set a
clinic's password. The Set-Password modal collects the new password
(entered twice for confirmation) and invokes the
`admin-set-clinic-password` Edge Function. The function performs
three guards in sequence — caller JWT validity (HTTP 401 on failure),
`profiles.role = 'admin'` (HTTP 403 on failure), and the `request_id`
↔ `profile_id` consistency check (HTTP 400 on mismatch) — before
calling `auth.admin.updateUserById` with a service-role key. On
success, the matching `clinic_password_reset_requests` row is stamped
as approved and a banner reminds the admin to deliver the new
password verbally over the same call used to verify the requester's
identity.

### Fig 2.6.18 — Resolve Support Ticket

Figure 2.6.18 traces the admin-side ticket-resolution flow. The
administrator selects a ticket from the inbox and may either move it
to `in_progress` without a body (a single click on Mark in Progress)
or to `resolved` with a written response of at least three
characters. Both transitions go through `admin_resolve_ticket`,
which records the resolver and the resolution timestamp. The
submitter sees the new status pill and the response on the next
focus event.

### Fig 2.6.19 — Avatar Upload + Circular Crop

Figure 2.6.19 traces the avatar-upload flow. Tapping the avatar
opens an action sheet with Camera and Library options. Either source
feeds the image to `CropAvatarModal`, where pan and pinch gestures
(via `react-native-reanimated` and `react-native-gesture-handler`)
position the image inside a circular SVG mask. On confirm,
`expo-image-manipulator` materialises the crop and resizes the result
to 512 × 512 pixels. The image is uploaded to Supabase Storage at
the RLS-mandated path `avatars/profiles/<auth.uid()>/avatar.jpg` and
the `profiles.avatar_url` column is updated.

### Fig 2.6.20 — Account Deactivation

Figure 2.6.20 traces the deactivate-account flow. The user requests
deactivation from Settings, an explicit confirmation modal asks them
to acknowledge that the action is irreversible, and on confirm the
client flips `profiles.is_active` to `false`. Errors from the update
surface as an Alert dialog naming the Postgres error message rather
than silently signing the user out. On success, the user is signed
out and routed to the login screen.

---

## Section 2.7 — Database

### Fig 2.7.1 — Entity Relationship Diagram

Figure 2.7.1 is the entity-relationship diagram of the LumenAI
Postgres schema. Entities are organised into four logical clusters.
The *Reference* cluster (the four PSGC lookup tables) is seeded once
at deploy time and not modified at runtime; its rows are referenced
by `clinics` to capture region, province, city, and barangay codes.
The *Identity* cluster pivots on Supabase's `auth.users` (one-to-one
with `profiles`) and `clinics`, with a profile optionally linked into
a clinic when the account is a clinic operator. The *Sessions*
cluster carries the screening data — `screening_sessions` references
the patient, the clinic that captured the session, and the operator
profile, and a session aggregates `thermal_captures`, `patient_vitals`,
and `classification_results` rows that all share the same session
identifier. The *Workflow* cluster carries the cross-cutting tables
added with version 1.0.0: clinic-access relationships, password-reset
requests, support tickets, data-export requests, and admin-only
system configuration. All foreign keys are N : 1 — there are no
many-to-many or self-referencing relationships in the current
schema, which keeps the cardinality lines straightforward to read.
