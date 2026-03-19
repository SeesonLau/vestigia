// lib/database/models/ThermalCapture.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { ScreeningSession } from './ScreeningSession';

export class ThermalCapture extends Model {
  static table = 'thermal_captures';

  static associations = {
    screening_sessions: { type: 'belongs_to' as const, key: 'session_id' },
  };

  @field('supabase_id') supabaseId!: string | null;
  @field('session_id') sessionId!: string;
  @field('foot') foot!: string;
  @field('thermal_matrix') thermalMatrix!: string; //JSON string — parse on read
  @field('min_temp_c') minTempC!: number;
  @field('max_temp_c') maxTempC!: number;
  @field('mean_temp_c') meanTempC!: number;
  @field('resolution_x') resolutionX!: number;
  @field('resolution_y') resolutionY!: number;
  @field('mpa_mean_c') mpaMeanC!: number | null;
  @field('lpa_mean_c') lpaMeanC!: number | null;
  @field('mca_mean_c') mcaMeanC!: number | null;
  @field('lca_mean_c') lcaMeanC!: number | null;
  @field('tci') tci!: number | null;
  @field('synced') synced!: boolean;
  @readonly @date('captured_at') capturedAt!: Date;

  @relation('screening_sessions', 'session_id') session!: ScreeningSession;
}
