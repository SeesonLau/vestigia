// supabase/functions/clinic-signup/index.ts
// Server-side clinic registration. Clinic accounts skip email
// verification (the Edge Function uses the service role to call
// auth.admin.createUser with email_confirm: true), then atomically
// inserts the clinics row and links it back on profiles.clinic_id.

import { createClient } from "jsr:@supabase/supabase-js@2";

const FACILITY_TYPES = new Set([
  "tertiary_hospital", "secondary_hospital", "primary_hospital",
  "outpatient_clinic", "diagnostic_center", "infirmary",
  "birthing_home", "dialysis_center", "ambulatory_surgical",
]);

const DOH_LTO_RE = /^[0-9]{2}-[0-9]{3}-[0-9]{2}-[A-Z]{2}-[0-9]$/;
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ClinicSignupBody {
  email: string;
  password: string;
  facility_name: string;
  facility_type: string;
  doh_lto_number: string;     //NN-NNN-NN-LL-N
  region_code: string;
  province_code?: string | null;
  city_code: string;
  barangay_code: string;
  address_line?: string;
  zip_code?: string;
  phone: string;              //digits only, length 11, starts with 0
  website?: string;
  contact_first_name: string;
  contact_middle_name?: string;
  contact_last_name: string;
  contact_mobile: string;     //digits only, length 11
  contact_email: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function validate(b: ClinicSignupBody): string | null {
  if (!EMAIL_RE.test(b.email))                return "Invalid email address";
  if ((b.password ?? "").length < 8)          return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(b.password))              return "Password needs an uppercase letter";
  if (!/[0-9]/.test(b.password))              return "Password needs a number";
  if (!b.facility_name?.trim())               return "Facility name is required";
  if (!FACILITY_TYPES.has(b.facility_type))   return "Invalid facility type";
  if (!DOH_LTO_RE.test(b.doh_lto_number))     return "DOH LTO number format is invalid";
  if (!b.region_code)                         return "Region is required";
  if (!b.city_code)                           return "City/Municipality is required";
  if (!b.barangay_code)                       return "Barangay is required";
  if (!/^0\d{10}$/.test(b.phone))             return "Phone must be 11 digits starting with 0";
  if (!b.contact_first_name?.trim())          return "Contact first name is required";
  if (!b.contact_last_name?.trim())           return "Contact last name is required";
  if (!/^0\d{10}$/.test(b.contact_mobile))    return "Contact mobile must be 11 digits starting with 0";
  if (!EMAIL_RE.test(b.contact_email))        return "Invalid contact email";
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: ClinicSignupBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const validationError = validate(body);
  if (validationError) return json({ error: validationError }, 400);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "Server misconfigured (missing service role)" }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  //1. Create the auth user with email already confirmed.
  //   handle_new_user trigger creates the profiles row from metadata.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: body.email.toLowerCase().trim(),
    password: body.password,
    email_confirm: true,
    user_metadata: {
      role: "clinic",
      first_name:  body.contact_first_name.trim(),
      middle_name: body.contact_middle_name?.trim() ?? "",
      last_name:   body.contact_last_name.trim(),
    },
  });
  if (createErr || !created?.user) {
    return json({ error: createErr?.message ?? "Failed to create user" }, 400);
  }
  const userId = created.user.id;

  //2. Insert clinics row. Roll back the auth user on failure.
  const { data: clinic, error: clinicErr } = await admin
    .from("clinics")
    .insert({
      owner_profile_id: userId,
      facility_name:    body.facility_name.trim(),
      facility_type:    body.facility_type,
      doh_lto_number:   body.doh_lto_number,
      region_code:      body.region_code,
      province_code:    body.province_code ?? null,
      city_code:        body.city_code,
      barangay_code:    body.barangay_code,
      address_line:     body.address_line?.trim() ?? null,
      zip_code:         body.zip_code?.trim() ?? null,
      phone:            body.phone,
      website:          body.website?.trim() || null,
      contact_first_name:  body.contact_first_name.trim(),
      contact_middle_name: body.contact_middle_name?.trim() || null,
      contact_last_name:   body.contact_last_name.trim(),
      contact_mobile:      body.contact_mobile,
      contact_email:       body.contact_email.toLowerCase().trim(),
    })
    .select("id, clinic_code")
    .single();

  if (clinicErr || !clinic) {
    await admin.auth.admin.deleteUser(userId);
    return json({ error: clinicErr?.message ?? "Failed to create clinic" }, 400);
  }

  //3. Link the clinic back on the profiles row.
  const { error: linkErr } = await admin
    .from("profiles")
    .update({ clinic_id: clinic.id })
    .eq("id", userId);

  if (linkErr) {
    //Clinic + user exist but profile.clinic_id is unset; clean up both.
    await admin.from("clinics").delete().eq("id", clinic.id);
    await admin.auth.admin.deleteUser(userId);
    return json({ error: linkErr.message }, 400);
  }

  return json({
    success: true,
    user_id: userId,
    clinic_id: clinic.id,
    clinic_code: clinic.clinic_code,
  });
});
