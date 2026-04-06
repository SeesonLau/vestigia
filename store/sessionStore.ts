// store/sessionStore.ts
import { create } from "zustand";
import { FootSide, Patient, ScreeningSession, SessionStatus } from "../types";

interface SessionState {
  activeSession: ScreeningSession | null;
  selectedPatient: Patient | null;
  setActiveSession: (s: ScreeningSession | null) => void;
  setSelectedPatient: (p: Patient | null) => void;
  updateStatus: (status: SessionStatus) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,
  selectedPatient: null,
  setActiveSession: (s) => set({ activeSession: s }),
  setSelectedPatient: (p) => set({ selectedPatient: p }),
  updateStatus: (status) =>
    set((state) => ({
      activeSession: state.activeSession
        ? { ...state.activeSession, status }
        : null,
    })),
  clearSession: () => set({ activeSession: null, selectedPatient: null }),
}));

// store/deviceStore.ts
import { BLEDevice, CameraSource, ConnectionStatus } from "../types";

interface DeviceState {
  bleStatus: ConnectionStatus;
  wifiStatus: ConnectionStatus;
  pairedDevice: BLEDevice | null;
  cameraSource: CameraSource;
  wifiIp: string | null;
  wifiPort: number;
  setBleStatus: (s: ConnectionStatus) => void;
  setWifiStatus: (s: ConnectionStatus) => void;
  setPairedDevice: (d: BLEDevice | null) => void;
  setCameraSource: (s: CameraSource) => void;
  setWifiIp: (ip: string | null) => void;
  setWifiPort: (port: number) => void;
  disconnect: () => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  bleStatus: "disconnected",
  wifiStatus: "disconnected",
  pairedDevice: null,
  cameraSource: "uvc",
  wifiIp: null,
  wifiPort: 8080,
  setBleStatus: (s) => set({ bleStatus: s }),
  setWifiStatus: (s) => set({ wifiStatus: s }),
  setPairedDevice: (d) => set({ pairedDevice: d }),
  setCameraSource: (s) => set({ cameraSource: s }),
  setWifiIp: (ip) => set({ wifiIp: ip }),
  setWifiPort: (port) => set({ wifiPort: port }),
  disconnect: () =>
    set({
      bleStatus: "disconnected",
      wifiStatus: "disconnected",
      pairedDevice: null,
      cameraSource: "uvc",
      wifiIp: null,
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
  // Bilateral DPN capture — left + right stored separately for API
  leftMatrix: number[][] | null;
  rightMatrix: number[][] | null;
  leftImageB64: string | null;
  rightImageB64: string | null;
  setLiveFrame: (
    matrix: number[][],
    min: number,
    max: number,
    mean: number,
  ) => void;
  capture: (foot: FootSide) => void;
  discardCapture: () => void;
  setFps: (fps: number) => void;
  captureLeft: (matrix: number[][], imageB64: string) => void;
  captureRight: (matrix: number[][], imageB64: string) => void;
  clearBilateral: () => void;
}

export const useThermalStore = create<ThermalState>((set) => ({
  liveMatrix: null,
  capturedMatrix: null,
  capturedFoot: null,
  minTemp: 28,
  maxTemp: 38,
  meanTemp: 33,
  fps: 0,
  leftMatrix: null,
  rightMatrix: null,
  leftImageB64: null,
  rightImageB64: null,
  setLiveFrame: (matrix, min, max, mean) =>
    set({ liveMatrix: matrix, minTemp: min, maxTemp: max, meanTemp: mean }),
  capture: (foot) => set((s) => ({ capturedMatrix: s.liveMatrix, capturedFoot: foot })),
  discardCapture: () => set({ capturedMatrix: null, capturedFoot: null }),
  setFps: (fps) => set({ fps }),
  captureLeft: (matrix, imageB64) => set({ leftMatrix: matrix, leftImageB64: imageB64 }),
  captureRight: (matrix, imageB64) => set({ rightMatrix: matrix, rightImageB64: imageB64 }),
  clearBilateral: () => set({ leftMatrix: null, rightMatrix: null, leftImageB64: null, rightImageB64: null }),
}));
