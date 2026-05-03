// store/roiStore.ts
//Region-of-interest used by the foot-framing overlay on the live thermal
//feed. Coordinates are normalized to [0..1] over the sensor frame so they
//survive any display scaling.
//
//The DPN classifier was trained on roughly 65x168-pixel plantar crops, so
//the default ROI matches that aspect ratio (~0.39 wide on a portrait
//orientation). At capture time the CSV is sliced to this region before
//upload; the user can pinch / pan / lock / hide the box from the live
//feed UI.

import { create } from "zustand";

export interface RoiRect {
  x: number;  //top-left, normalized 0..1
  y: number;
  w: number;  //width / height, normalized 0..1
  h: number;
}

//Aspect ratio of the dataset crops used to train the DPN models.
// height / width = 168 / 65 ≈ 2.585
export const ROI_ASPECT = 168 / 65;

//Practical bounds: don't let the box collapse below ~30% of the frame
//(too few pixels for the YOLO image model after upscale) or expand past
//the frame entirely.
export const ROI_MIN_W = 0.30;
export const ROI_MAX_W = 0.95;

export const ROI_DEFAULT: RoiRect = (() => {
  const w = 0.40;
  const h = Math.min(0.95, w * ROI_ASPECT);
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
})();

interface RoiState {
  rect: RoiRect;
  locked: boolean;
  visible: boolean;
  setRect: (rect: RoiRect) => void;
  setLocked: (locked: boolean) => void;
  setVisible: (visible: boolean) => void;
  reset: () => void;
}

export const useRoiStore = create<RoiState>((set) => ({
  rect: ROI_DEFAULT,
  locked: false,
  visible: true,
  setRect: (rect) => set({ rect }),
  setLocked: (locked) => set({ locked }),
  setVisible: (visible) => set({ visible }),
  reset: () => set({ rect: ROI_DEFAULT, locked: false, visible: true }),
}));

//Slice a 2D temperature matrix to the rect region. Treats rect coordinates
//as fractions of (rows, cols).
export function cropMatrix(matrix: number[][], rect: RoiRect): number[][] {
  if (!matrix.length || !matrix[0]?.length) return matrix;
  const rows = matrix.length;
  const cols = matrix[0].length;
  const y0 = Math.max(0, Math.floor(rect.y * rows));
  const x0 = Math.max(0, Math.floor(rect.x * cols));
  const y1 = Math.min(rows, Math.ceil((rect.y + rect.h) * rows));
  const x1 = Math.min(cols, Math.ceil((rect.x + rect.w) * cols));
  return matrix.slice(y0, y1).map((row) => row.slice(x0, x1));
}

//Slice the raw CSV text. Cheaper than parse → crop → re-emit when we just
//need to write the cropped CSV to storage.
export function cropCsvText(csv: string, rect: RoiRect): string {
  const lines = csv.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return csv;
  const cols = lines[0].split(",").length;
  const rows = lines.length;
  const y0 = Math.max(0, Math.floor(rect.y * rows));
  const x0 = Math.max(0, Math.floor(rect.x * cols));
  const y1 = Math.min(rows, Math.ceil((rect.y + rect.h) * rows));
  const x1 = Math.min(cols, Math.ceil((rect.x + rect.w) * cols));
  return lines.slice(y0, y1).map((line) =>
    line.split(",").slice(x0, x1).join(","),
  ).join("\n");
}
