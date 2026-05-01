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

// store/deviceStore.ts — UVC-only, WiFi/BLE removed
interface DeviceState {
  disconnect: () => void;
}

export const useDeviceStore = create<DeviceState>(() => ({
  disconnect: () => {},
}));

// store/thermalStore.ts

type FootStats = { min: number; max: number; mean: number }

interface ThermalState {
  liveMatrix: number[][] | null
  capturedMatrix: number[][] | null
  capturedFoot: FootSide | null
  minTemp: number
  maxTemp: number
  meanTemp: number
  fps: number
  leftMatrix: number[][] | null
  rightMatrix: number[][] | null
  leftRawB64: string | null
  rightRawB64: string | null
  leftProcessedB64: string | null
  rightProcessedB64: string | null
  leftIsolatedB64: string | null
  rightIsolatedB64: string | null
  leftCsvContent: string | null
  rightCsvContent: string | null
  leftStats: FootStats | null
  rightStats: FootStats | null
  capturedAt: string | null
  setLiveFrame: (matrix: number[][], min: number, max: number, mean: number) => void
  capture: (foot: FootSide) => void
  discardCapture: () => void
  setFps: (fps: number) => void
  captureLeft:  (matrix: number[][], rawB64: string, processedB64: string, isolatedB64: string, csvContent: string, stats: FootStats) => void
  captureRight: (matrix: number[][], rawB64: string, processedB64: string, isolatedB64: string, csvContent: string, stats: FootStats) => void
  clearBilateral: () => void
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
  leftRawB64: null,
  rightRawB64: null,
  leftProcessedB64: null,
  rightProcessedB64: null,
  leftIsolatedB64: null,
  rightIsolatedB64: null,
  leftCsvContent: null,
  rightCsvContent: null,
  leftStats: null,
  rightStats: null,
  capturedAt: null,
  setLiveFrame: (matrix, min, max, mean) =>
    set({ liveMatrix: matrix, minTemp: min, maxTemp: max, meanTemp: mean }),
  capture: (foot) => set((s) => ({ capturedMatrix: s.liveMatrix, capturedFoot: foot })),
  discardCapture: () => set({ capturedMatrix: null, capturedFoot: null }),
  setFps: (fps) => set({ fps }),
  captureLeft: (matrix, rawB64, processedB64, isolatedB64, csvContent, stats) =>
    set((s) => ({
      leftMatrix: matrix,
      leftRawB64: rawB64, leftProcessedB64: processedB64, leftIsolatedB64: isolatedB64,
      leftCsvContent: csvContent, leftStats: stats,
      capturedAt: s.capturedAt ?? new Date().toISOString(),
    })),
  captureRight: (matrix, rawB64, processedB64, isolatedB64, csvContent, stats) =>
    set({
      rightMatrix: matrix,
      rightRawB64: rawB64, rightProcessedB64: processedB64, rightIsolatedB64: isolatedB64,
      rightCsvContent: csvContent, rightStats: stats,
    }),
  clearBilateral: () => set({
    leftMatrix: null, rightMatrix: null,
    leftRawB64: null, rightRawB64: null,
    leftProcessedB64: null, rightProcessedB64: null,
    leftIsolatedB64: null, rightIsolatedB64: null,
    leftCsvContent: null, rightCsvContent: null,
    leftStats: null, rightStats: null,
    capturedAt: null,
  }),
}));
