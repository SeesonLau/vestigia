-- supabase/migrations/20260502120400_seed_admin_account.sql
-- Seeds the single admin account.
--   email:    transistor@lumenai.com
--   password: @dmin123!
-- Mobile login is blocked at the app layer (role=admin check after sign-in).
-- Password reset is not exposed; recovery is handled in the admin webapp.

-- Defensive: a legacy trigger from a prior schema would fire
-- handle_new_user twice, causing the profiles insert to collide on PK.
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

DO $$
DECLARE
  v_admin_id UUID := gen_random_uuid();
  v_email TEXT := 'transistor@lumenai.com';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE NOTICE 'Admin account already exists, skipping seed.';
    RETURN;
  END IF;

  -- 1. auth.users (email/password, auto-confirmed)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated', 'authenticated',
    v_email,
    crypt('@dmin123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', 'admin',
      'first_name', 'Lumen',
      'last_name', 'Admin'
    ),
    now(), now(),
    '', '', '', ''
  );

  -- 2. auth.identities (required for email/password sign-in)
  --    Note: auth.identities.email is a generated column -- do not insert.
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_admin_id::text,
    v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', v_email),
    'email',
    now(), now(), now()
  );

  -- 3. handle_new_user trigger has already created the profiles row
  --    with role='admin' from raw_user_meta_data.
  RAISE NOTICE 'Admin seeded with id %', v_admin_id;
END $$;
