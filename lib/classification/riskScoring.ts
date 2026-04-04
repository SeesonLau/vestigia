// lib/classification/riskScoring.ts
import type { ClassificationResult } from "../../types";

//Thresholds (°C bilateral asymmetry)
const DPN_THRESHOLD = 2.2;    // ≥ this → HIGH (clinical DPN indicator)
const WARNING_THRESHOLD = 1.5; // ≥ this → MEDIUM (approaching threshold)

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface AsymmetryValues {
  mpa?: number; // medial plantar artery
  lpa?: number; // lateral plantar artery
  mca?: number; // medial calcaneal artery
  lca?: number; // lateral calcaneal artery
}

/**
 * Computes a risk level from raw angiosome asymmetry values.
 * Any single region meeting a threshold drives the overall level up.
 */
export function computeRiskLevel(asymmetry: AsymmetryValues): RiskLevel {
  const values = [asymmetry.mpa, asymmetry.lpa, asymmetry.mca, asymmetry.lca]
    .filter((v): v is number => v !== undefined && !isNaN(v))
    .map(Math.abs);

  if (values.length === 0) return "LOW";

  const max = Math.max(...values);
  if (max >= DPN_THRESHOLD) return "HIGH";
  if (max >= WARNING_THRESHOLD) return "MEDIUM";
  return "LOW";
}

/**
 * Derives risk level from a ClassificationResult (post-AI response).
 * Uses the pre-computed asymmetry fields on the result.
 * Falls back to the result's own risk_level if no asymmetry data is present.
 */
export function computeRiskLevelFromResult(
  result: Partial<ClassificationResult>
): RiskLevel {
  const hasAsymmetry =
    result.asymmetry_mpa_c !== undefined ||
    result.asymmetry_lpa_c !== undefined ||
    result.asymmetry_mca_c !== undefined ||
    result.asymmetry_lca_c !== undefined;

  if (hasAsymmetry) {
    return computeRiskLevel({
      mpa: result.asymmetry_mpa_c,
      lpa: result.asymmetry_lpa_c,
      mca: result.asymmetry_mca_c,
      lca: result.asymmetry_lca_c,
    });
  }

  // If the AI model already returned a risk_level, use it directly
  if (result.risk_level) return result.risk_level;

  // Last resort: derive from classification label
  if (result.classification === "POSITIVE") return "HIGH";
  if (result.classification === "NEGATIVE") return "LOW";
  return "LOW";
}

/**
 * Returns a human-readable description for a risk level.
 */
export function getRiskLevelDescription(level: RiskLevel): string {
  switch (level) {
    case "HIGH":
      return "Significant bilateral temperature asymmetry detected. Consult a specialist.";
    case "MEDIUM":
      return "Mild asymmetry detected. Monitor and rescreen within 3 months.";
    case "LOW":
      return "No significant asymmetry. Continue routine screening schedule.";
  }
}
