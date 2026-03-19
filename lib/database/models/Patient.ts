// lib/database/models/Patient.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Patient extends Model {
  static table = 'patients';

  @field('supabase_id') supabaseId!: string | null;
  @field('clinic_id') clinicId!: string;
  @field('patient_code') patientCode!: string;
  @field('date_of_birth') dateOfBirth!: string | null;
  @field('sex') sex!: string | null;
  @field('diabetes_type') diabetesType!: string | null;
  @field('diabetes_duration_years') diabetesDurationYears!: number | null;
  @field('notes') notes!: string | null;
  @field('synced') synced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
