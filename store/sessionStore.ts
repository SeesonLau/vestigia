// store/sessionStore.ts
import { create } from "zustand";
import { FootSide, ScreeningSession, SessionStatus } from "../types";

interface SessionState {
  activeSession: ScreeningSession | null;
  setActiveSession: (s: ScreeningSession | null) => void;
  updateStatus: (status: SessionStatus) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,
  setActiveSession: (s) => set({ activeSession: s }),
  updateStatus: (status) =>
    set((state) => ({
      activeSession: state.activeSession
        ? { ...state.activeSession, status }
        : null,
    })),
}));

// store/deviceStore.ts
import { BLEDevice, ConnectionStatus } from "../types";

interface DeviceState {
  bleStatus: ConnectionStatus;
  wifiStatus: ConnectionStatus;
  pairedDevice: BLEDevice | null;
  setBleStatus: (s: ConnectionStatus) => void;
  setWifiStatus: (s: ConnectionStatus) => void;
  setPairedDevice: (d: BLEDevice | null) => void;
  disconnect: () => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  bleStatus: "disconnected",
  wifiStatus: "disconnected",
  pairedDevice: null,
  setBleStatus: (s) => set({ bleStatus: s }),
  setWifiStatus: (s) => set({ wifiStatus: s }),
  setPairedDevice: (d) => set({ pairedDevice: d }),
  disconnect: () =>
    set({
      bleStatus: "disconnected",
      wifiStatus: "disconnected",
      pairedDevice: null,
    }),
}));

// store/thermalStore.ts

interface ThermalState {
  liveMatrix: number[][] | null;
  capturedMatrix: number[][] | null;
  capturedFoot: FootSide | null;
  minTemp: number;
  maxTemp: number;
  meanTemp: number;
  fps: number;
  setLiveFrame: (
    matrix: number[][],
    min: number,
    max: number,
    mean: number,
  ) => void;
  capture: (foot: FootSide) => void;
  discardCapture: () => void;
  setFps: (fps: number) => void;
}

export const useThermalStore = create<ThermalState>((set, get) => ({
  liveMatrix: null,
  capturedMatrix: null,
  capturedFoot: null,
  minTemp: 28,
  maxTemp: 38,
  meanTemp: 33,
  fps: 0,
  setLiveFrame: (matrix, min, max, mean) =>
    set({ liveMatrix: matrix, minTemp: min, maxTemp: max, meanTemp: mean }),
  capture: (foot) => set((s) => ({ capturedMatrix: s.liveMatrix, capturedFoot: foot })),
  discardCapture: () => set({ capturedMatrix: null, capturedFoot: null }),
  setFps: (fps) => set({ fps }),
}));
