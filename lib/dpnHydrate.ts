// lib/dpnHydrate.ts
//Reconstruct a DPNScanResponse-shaped object from a classification_results
//row so we can re-render the full result UI without calling the API again.
//Used by the standalone Assessment screen and the bundle-detail viewer.
//
//Source-of-truth precedence:
// 1. row.result_payload (full API response) -- preferred. Set on every
//    new insert. No reconstruction, all per-foot probabilities and
//    diagnosis factors render correctly.
// 2. Individual columns -- fallback for older rows from before the
//    result_payload column was added. Reconstructs per-foot fields from
//    the combined verdict + confidence; sub-model probs, fusion method,
//    and diagnosis factors come back empty.

import type {
  AsymmetryResult,
  DPNScanResponse,
  FootResult,
  RegionMeans,
} from "./dpnApi";

/** Subset of classification_results columns used to rebuild the response. */
export interface StoredClassification {
  classification: "POSITIVE" | "NEGATIVE";
  confidence_score: number | null;
  max_asymmetry_c: number | null;
  per_angiosome_asymmetry: RegionMeans | null;
  left_regions: RegionMeans | null;
  right_regions: RegionMeans | null;
  mean_asymmetry: number | null;
  left_foot_mean_temp_c: number | null;
  right_foot_mean_temp_c: number | null;
  /** Full DPNScanResponse — preferred source. Older rows may not have this. */
  result_payload: DPNScanResponse | null;
}

/** Columns to SELECT from `classification_results` to rebuild the result. */
export const STORED_CLASSIFICATION_COLUMNS =
  "classification, confidence_score, max_asymmetry_c, per_angiosome_asymmetry, " +
  "left_regions, right_regions, mean_asymmetry, " +
  "left_foot_mean_temp_c, right_foot_mean_temp_c, result_payload";

export function hydrateFromStored(row: StoredClassification): DPNScanResponse {
  //Preferred path: the full payload was saved at insert time, just return it.
  if (row.result_payload) return row.result_payload;

  //Fallback for legacy rows: rebuild a degraded DPNScanResponse from the
  //individual columns. Per-foot probabilities and sub-model breakdowns are
  //synthesised from the combined verdict + confidence; diagnosis factors
  //and fusion method are unrecoverable.
  const isPositive = row.classification === "POSITIVE";
  const conf = Number(row.confidence_score ?? 0);
  const positiveProb = isPositive ? conf : 100 - conf;
  const probs = { Control: 100 - positiveProb, Diabetic: positiveProb };

  const foot = (regions: RegionMeans | null): FootResult => ({
    prediction:    isPositive ? "DPN Positive" : "DPN Negative",
    confidence:    conf,
    is_diabetic:   isPositive,
    probabilities: probs,
    regions:       regions ?? null,
  });

  const asym: AsymmetryResult = {
    mean_asymmetry:        Number(row.mean_asymmetry ?? 0),
    max_asymmetry:         Number(row.max_asymmetry_c ?? 0),
    left_foot_mean_temp:   Number(row.left_foot_mean_temp_c ?? 0),
    right_foot_mean_temp:  Number(row.right_foot_mean_temp_c ?? 0),
    mean_temp_difference:  Number(row.mean_asymmetry ?? 0),
    asymmetry_significant: false,
    threshold_used:        2.2,
    region_asymmetry:      row.per_angiosome_asymmetry ?? null,
  };
  asym.asymmetry_significant = asym.max_asymmetry > asym.threshold_used;

  return {
    success:             true,
    is_valid_foot:       true,
    rejection_reason:    null,
    combined_prediction: isPositive ? "DPN Positive" : "DPN Negative",
    combined_confidence: conf,
    is_diabetic:         isPositive,
    left_foot:           foot(row.left_regions),
    right_foot:          foot(row.right_regions),
    asymmetry:           asym,
    diagnosis_factors:   [],
  };
}
