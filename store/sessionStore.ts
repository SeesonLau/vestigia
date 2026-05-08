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
export type ThermalFeedMode = 'unprocessed' | 'processed'

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
  // Slot-keyed base64 PNGs. Symmetric across feedMode — only the underlying
  // matrix differs (unenhanced 160x120 vs enhanced 320x240):
  //   *Slot1B64  = palette full frame (always present)
  //   *Slot2B64  = palette cropped to ROI (null when no ROI was drawn)
  //   *Slot3B64  = isolated foot, cropped to ROI when one is set
  leftSlot1B64: string | null
  rightSlot1B64: string | null
  leftSlot2B64: string | null
  rightSlot2B64: string | null
  leftSlot3B64: string | null
  rightSlot3B64: string | null
  leftCsvContent: string | null
  rightCsvContent: string | null
  leftStats: FootStats | null
  rightStats: FootStats | null
  feedMode: ThermalFeedMode
  capturedAt: string | null
  setLiveFrame: (matrix: number[][], min: number, max: number, mean: number) => void
  capture: (foot: FootSide) => void
  discardCapture: () => void
  setFps: (fps: number) => void
  captureLeft:  (matrix: number[][], slot1: string, slot2: string | null, slot3: string, csvContent: string, stats: FootStats, feedMode: ThermalFeedMode) => void
  captureRight: (matrix: number[][], slot1: string, slot2: string | null, slot3: string, csvContent: string, stats: FootStats, feedMode: ThermalFeedMode) => void
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
  leftSlot1B64: null,
  rightSlot1B64: null,
  leftSlot2B64: null,
  rightSlot2B64: null,
  leftSlot3B64: null,
  rightSlot3B64: null,
  leftCsvContent: null,
  rightCsvContent: null,
  leftStats: null,
  rightStats: null,
  feedMode: 'unprocessed',
  capturedAt: null,
  setLiveFrame: (matrix, min, max, mean) =>
    set({ liveMatrix: matrix, minTemp: min, maxTemp: max, meanTemp: mean }),
  capture: (foot) => set((s) => ({ capturedMatrix: s.liveMatrix, capturedFoot: foot })),
  discardCapture: () => set({ capturedMatrix: null, capturedFoot: null }),
  setFps: (fps) => set({ fps }),
  captureLeft: (matrix, slot1, slot2, slot3, csvContent, stats, feedMode) =>
    set((s) => ({
      leftMatrix: matrix,
      leftSlot1B64: slot1, leftSlot2B64: slot2, leftSlot3B64: slot3,
      leftCsvContent: csvContent, leftStats: stats,
      feedMode,
      capturedAt: s.capturedAt ?? new Date().toISOString(),
    })),
  captureRight: (matrix, slot1, slot2, slot3, csvContent, stats, feedMode) =>
    set({
      rightMatrix: matrix,
      rightSlot1B64: slot1, rightSlot2B64: slot2, rightSlot3B64: slot3,
      rightCsvContent: csvContent, rightStats: stats,
      feedMode,
    }),
  clearBilateral: () => set({
    leftMatrix: null, rightMatrix: null,
    leftSlot1B64: null, rightSlot1B64: null,
    leftSlot2B64: null, rightSlot2B64: null,
    leftSlot3B64: null, rightSlot3B64: null,
    leftCsvContent: null, rightCsvContent: null,
    leftStats: null, rightStats: null,
    feedMode: 'unprocessed',
    capturedAt: null,
  }),
}));
