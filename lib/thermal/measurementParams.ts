// lib/thermal/measurementParams.ts
// Per-device persistence for radiometric correction parameters.
// Defaults match a diabetic-foot-screening setup: skin emissivity ~0.98
// against typical clinic ambient ~22°C.
//
// On capture-screen mount, JS loads the stored values and pushes them to
// the native UVC module via setMeasurementParams. Edits in the camera
// settings sheet write back here AND push to native immediately so the
// next frame reflects the change.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  setMeasurementParams as setMeasurementParamsNative,
  type MeasurementParams,
} from "./uvcCamera";

const STORAGE_KEY = "vestigia_measurement_params";

export const MEASUREMENT_PARAM_DEFAULTS: MeasurementParams = {
  emissivity:     0.98,
  reflectedTempC: 22.0,
};

export const EMISSIVITY_MIN = 0.10;
export const EMISSIVITY_MAX = 1.00;
export const REFLECTED_MIN  = -50;
export const REFLECTED_MAX  = 150;

export function clampMeasurementParams(p: MeasurementParams): MeasurementParams {
  return {
    emissivity:     Math.max(EMISSIVITY_MIN, Math.min(EMISSIVITY_MAX, Number.isFinite(p.emissivity) ? p.emissivity : MEASUREMENT_PARAM_DEFAULTS.emissivity)),
    reflectedTempC: Math.max(REFLECTED_MIN,  Math.min(REFLECTED_MAX,  Number.isFinite(p.reflectedTempC) ? p.reflectedTempC : MEASUREMENT_PARAM_DEFAULTS.reflectedTempC)),
  };
}

export async function loadMeasurementParams(): Promise<MeasurementParams> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return MEASUREMENT_PARAM_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<MeasurementParams>;
    return clampMeasurementParams({ ...MEASUREMENT_PARAM_DEFAULTS, ...parsed });
  } catch {
    return MEASUREMENT_PARAM_DEFAULTS;
  }
}

export async function saveMeasurementParams(params: MeasurementParams): Promise<MeasurementParams> {
  const clamped = clampMeasurementParams(params);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
  } catch {
    // Storage failures are non-fatal — the values still apply for the
    // current session via the native push below.
  }
  await setMeasurementParamsNative(clamped);
  return clamped;
}
