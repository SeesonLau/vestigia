// lib/dpnApi.ts
const BASE_URL = "https://charlesgaid-dpn-classification-api.hf.space";

//Types
export interface DPNScanRequest {
  left_image_b64: string;
  right_image_b64: string;
  left_temperatures: number[][];
  right_temperatures: number[][];
}

export interface FootResult {
  prediction: "Diabetic" | "Control";
  confidence: number;
  is_diabetic: boolean;
  probabilities: { Control: number; Diabetic: number };
}

export interface AsymmetryResult {
  mean_temp_difference: number;
  asymmetry_significant: boolean;
  threshold_used: number;
}

export interface DPNScanResponse {
  success: boolean;
  is_diabetic: boolean;
  combined_prediction: "Diabetic" | "Control";
  combined_confidence: number;
  diagnosis_factors: string[];
  left_foot: FootResult;
  right_foot: FootResult;
  asymmetry: AsymmetryResult;
}

export interface HealthResponse {
  status: string;
  image_model_loaded: boolean;
  sklearn_model_loaded: boolean;
  fusion_model_loaded: boolean;
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
