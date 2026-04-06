// store/dpnStore.ts
import { create } from "zustand";
import {
  checkServerHealth,
  DPNScanRequest,
  DPNScanResponse,
  scanPatient,
} from "../lib/dpnApi";

type DPNStatus = "idle" | "loading" | "success" | "error" | "server_waking";

interface DPNState {
  status: DPNStatus;
  result: DPNScanResponse | null;
  error: string | null;
  startScan: (data: DPNScanRequest) => Promise<void>;
  clearScan: () => void;
}

//Helpers
async function waitForServer(maxWaitMs = 60_000, intervalMs = 5_000): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const health = await checkServerHealth();
      if (
        health.image_model_loaded &&
        health.sklearn_model_loaded &&
        health.fusion_model_loaded
      ) {
        return true;
      }
    } catch {
      // server not reachable yet — keep retrying
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

export const useDPNStore = create<DPNState>((set) => ({
  status: "idle",
  result: null,
  error: null,

  startScan: async (data: DPNScanRequest) => {
    set({ status: "loading", result: null, error: null });

    //Health check — wait for all models to be loaded
    try {
      const health = await checkServerHealth();
      const allLoaded =
        health.image_model_loaded &&
        health.sklearn_model_loaded &&
        health.fusion_model_loaded;

      if (!allLoaded) {
        set({ status: "server_waking" });
        const ready = await waitForServer();
        if (!ready) {
          set({
            status: "error",
            error: "AI server is starting up, please retry in 30 seconds",
          });
          return;
        }
        set({ status: "loading" });
      }
    } catch {
      // If health check itself fails, server may be cold — attempt waking
      set({ status: "server_waking" });
      const ready = await waitForServer();
      if (!ready) {
        set({
          status: "error",
          error: "AI server is starting up, please retry in 30 seconds",
        });
        return;
      }
      set({ status: "loading" });
    }

    //Run scan
    try {
      const result = await scanPatient(data);
      set({ status: "success", result });
    } catch (err: unknown) {
      if (err instanceof Error) {
        const status = (err as Error & { status?: number }).status;
        if (status === 408) {
          set({ status: "server_waking", error: null });
          return;
        }
        set({ status: "error", error: err.message });
      } else {
        set({ status: "error", error: "Analysis failed, please retake the scan" });
      }
    }
  },

  clearScan: () => set({ status: "idle", result: null, error: null }),
}));
