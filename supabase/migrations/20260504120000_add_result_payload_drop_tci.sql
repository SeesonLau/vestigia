-- supabase/migrations/20260504120000_add_result_payload_drop_tci.sql
-- Add a single jsonb sink for the full DPNScanResponse so re-hydration
-- doesn't have to reconstruct per-foot probabilities, sub-model breakdowns,
-- fusion method, threshold, or diagnosis factors. Older rows without the
-- payload will continue to hydrate from the individual columns as a fallback.

alter table public.classification_results
  add column if not exists result_payload jsonb;

comment on column public.classification_results.result_payload is
  'Full DPNScanResponse from the API. Source of truth for re-rendering the analysis details on the bundle viewer.';

-- Drop the unused TCI columns. The DPN API does not produce these and we
-- have no plans to compute them client-side; they were leftover scaffolding.
alter table public.classification_results
  drop column if exists left_tci,
  drop column if exists right_tci,
  drop column if exists bilateral_tci;
