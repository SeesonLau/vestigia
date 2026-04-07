-- Migration: fix handle_new_user to auto-create a clinic record for clinic registrations
-- Run this in the Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_clinic_id uuid;
  clinic_name   text;
BEGIN
  clinic_name := NEW.raw_user_meta_data->>'clinic_name';

  IF COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'clinic'
     AND clinic_name IS NOT NULL
     AND clinic_name <> ''
  THEN
    -- Create a new clinic entry for this registration
    INSERT INTO public.clinics (name, is_active)
    VALUES (clinic_name, true)
    RETURNING id INTO new_clinic_id;

    INSERT INTO public.profiles (id, email, full_name, role, clinic_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed User'),
      'clinic',
      new_clinic_id
    );
  ELSE
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed User'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
    );
  END IF;

  RETURN NEW;
END;
$$;
