-- supabase/migrations/20260503180000_widen_confidence_score.sql
-- The DPN API returns confidence as a percentage (0-100), but the column
-- was numeric(5,4) which caps at 9.9999, causing 22003 numeric_field_overflow
-- when persisting any confidence over ~10%.
-- Switch to unconstrained numeric (matches the new mean_asymmetry / mean
-- temp columns and is plenty for 0-100 with a few decimals).

alter table public.classification_results
  alter column confidence_score type numeric;
