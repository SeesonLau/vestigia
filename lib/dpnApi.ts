// lib/dpnApi.ts
const BASE_URL = "https://charlesgaid-dpn-classification-api.hf.space";

//Types — match the FastAPI server at api/main.py exactly.
//Confidences and probabilities are PERCENTAGES (0–100), not 0–1.

export interface DPNScanRequest {
  left_image_b64: string;
  right_image_b64: string;
  left_temperatures: number[][];
  right_temperatures: number[][];
}

export type Prediction = "DPN Positive" | "DPN Negative" | "Unknown";

export interface ProbDist { Control: number; Diabetic: number }

export type RegionMeans = { MPA: number; LPA: number; MCA: number; LCA: number };

export interface FootResult {
  prediction: Prediction;
  confidence: number;                       //percentage 0–100
  is_diabetic: boolean;
  probabilities: ProbDist;                  //percentages 0–100
  yolo_probabilities?: ProbDist | null;
  sklearn_probabilities?: ProbDist | null;
  fusion_method?: string | null;
  regions?: RegionMeans | null;             //per-angiosome mean degC
}

export interface AsymmetryResult {
  mean_asymmetry: number;
  max_asymmetry: number;
  left_foot_mean_temp: number;
  right_foot_mean_temp: number;
  mean_temp_difference: number;
  asymmetry_significant: boolean;
  threshold_used: number;
  region_asymmetry?: RegionMeans | null;    //per-angiosome |L-R| degC
}

export interface DPNScanResponse {
  success: boolean;
  is_valid_foot?: boolean;
  rejection_reason?: string | null;
  combined_prediction: Prediction;
  combined_confidence: number;              //percentage 0–100
  is_diabetic: boolean;
  left_foot: FootResult | null;
  right_foot: FootResult | null;
  asymmetry: AsymmetryResult | null;
  diagnosis_factors: string[];
}

export interface HealthResponse {
  status: string;
  image_model_loaded: boolean;
  image_model_type: string;
  sklearn_model_loaded: boolean;
  fusion_model_loaded: boolean;
  foot_detector_loaded: boolean;
}

//API
export async function checkServerHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json() as Promise<HealthResponse>;
}

export async function scanPatient(data: DPNScanRequest): Promise<DPNScanResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(`${BASE_URL}/predict/patient/mobile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (res.status === 400) {
      throw Object.assign(new Error("Invalid scan data, please retake the scan"), { status: 400 });
    }
    if (res.status === 422) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      throw Object.assign(
        new Error(body.message ?? "Image validation failed. Please submit a real thermal foot image."),
        { status: 422 },
      );
    }
    if (res.status === 503) {
      throw Object.assign(new Error("AI server is starting up, please retry in 30 seconds"), { status: 503 });
    }
    if (res.status === 500) {
      throw Object.assign(new Error("Analysis failed, please retake the scan"), { status: 500 });
    }
    if (!res.ok) {
      throw Object.assign(new Error(`Unexpected error: ${res.status}`), { status: res.status });
    }

    return res.json() as Promise<DPNScanResponse>;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw Object.assign(new Error("Request timed out"), { status: 408 });
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
