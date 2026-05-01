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
  leftImageB64: string | null
  rightImageB64: string | null
  leftCsvContent: string | null
  rightCsvContent: string | null
  leftStats: FootStats | null
  rightStats: FootStats | null
  capturedAt: string | null
  setLiveFrame: (matrix: number[][], min: number, max: number, mean: number) => void
  capture: (foot: FootSide) => void
  discardCapture: () => void
  setFps: (fps: number) => void
  captureLeft: (matrix: number[][], imageB64: string, csvContent: string, stats: FootStats) => void
  captureRight: (matrix: number[][], imageB64: string, csvContent: string, stats: FootStats) => void
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
  leftImageB64: null,
  rightImageB64: null,
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
  captureLeft: (matrix, imageB64, csvContent, stats) =>
    set((s) => ({
      leftMatrix: matrix, leftImageB64: imageB64,
      leftCsvContent: csvContent, leftStats: stats,
      capturedAt: s.capturedAt ?? new Date().toISOString(),
    })),
  captureRight: (matrix, imageB64, csvContent, stats) =>
    set({ rightMatrix: matrix, rightImageB64: imageB64, rightCsvContent: csvContent, rightStats: stats }),
  clearBilateral: () => set({
    leftMatrix: null, rightMatrix: null,
    leftImageB64: null, rightImageB64: null,
    leftCsvContent: null, rightCsvContent: null,
    leftStats: null, rightStats: null,
    capturedAt: null,
  }),
}));
