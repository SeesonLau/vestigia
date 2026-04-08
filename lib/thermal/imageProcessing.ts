// lib/thermal/imageProcessing.ts
// Thermal image processing algorithms for plantar thermogram analysis.
// All functions operate on ThermalMatrix (number[][]) in °C.
// Designed for FLIR Lepton 3.5 output: 160×120 pixels.

import { ThermalMatrix } from "./preprocessing";

export type BinaryMatrix = boolean[][];   // true = foreground (foot), false = background
export type GrayscaleMatrix = number[][]; // 0–255

//Helpers
function normalizeToGray(matrix: ThermalMatrix): GrayscaleMatrix {
  const flat = matrix.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const range = max - min || 1;
  return matrix.map(row => row.map(v => Math.round(((v - min) / range) * 255)));
}

function normalizeToFloat(matrix: ThermalMatrix): number[][] {
  const flat = matrix.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const range = max - min || 1;
  return matrix.map(row => row.map(v => (v - min) / range));
}

// ── Otsu Thresholding ──────────────────────────────────────────────────────────
// Finds the optimal threshold that maximizes between-class variance (foreground vs background).
// Returns a binary mask: true = above threshold (foot/warm), false = below (background/cool).
export function otsuThreshold(matrix: ThermalMatrix): BinaryMatrix {
  const gray = normalizeToGray(matrix);
  const flat = gray.flat();
  const total = flat.length;
  const bins = 256;

  //Build histogram
  const hist = new Array(bins).fill(0);
  for (const v of flat) hist[v]++;

  //Compute total weighted sum
  let sum = 0;
  for (let i = 0; i < bins; i++) sum += i * hist[i];

  let sumB = 0, wB = 0, maxVariance = 0, threshold = 0;

  for (let t = 0; t < bins; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) ** 2;
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return gray.map(row => row.map(v => v >= threshold));
}

// ── Chan-Vese Segmentation ─────────────────────────────────────────────────────
// Piecewise-constant active contour model (Chan & Vese, 2001).
// Segments the image into two regions by minimizing energy:
//   E = λ1∫(I - c1)²H(φ) + λ2∫(I - c2)²(1 - H(φ))
// where c1/c2 are mean intensities inside/outside the contour.
// No curvature regularization for speed — works well on thermal foot images
// where the foot is a clearly distinct temperature region.
export function chanVese(matrix: ThermalMatrix, iterations = 50): BinaryMatrix {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return [];

  const norm = normalizeToFloat(matrix);

  //Initialize level set as checkerboard (5×5 blocks)
  let phi: BinaryMatrix = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) =>
      Math.floor(r / 5) % 2 === Math.floor(c / 5) % 2
    )
  );

  for (let iter = 0; iter < iterations; iter++) {
    //Compute region means c1 (inside) and c2 (outside)
    let s1 = 0, n1 = 0, s2 = 0, n2 = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (phi[r][c]) { s1 += norm[r][c]; n1++; }
        else            { s2 += norm[r][c]; n2++; }
      }
    }
    const c1 = n1 > 0 ? s1 / n1 : 0.7; // inside mean (foot — warmer)
    const c2 = n2 > 0 ? s2 / n2 : 0.3; // outside mean (background — cooler)

    //Assign each pixel to the closer region
    phi = norm.map(row =>
      row.map(v => (v - c1) ** 2 < (v - c2) ** 2)
    );
  }

  return phi;
}

// ── Canny Edge Detector ────────────────────────────────────────────────────────
// Classic multi-stage edge detection:
//   1. Gaussian blur (5×5) — noise reduction
//   2. Sobel gradients — compute magnitude + direction
//   3. Non-maximum suppression — thin edges to 1px width
//   4. Double-threshold hysteresis — keep strong + connected weak edges
export function cannyEdges(
  matrix: ThermalMatrix,
  lowRatio  = 0.05,
  highRatio = 0.15
): BinaryMatrix {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return [];

  const gray = normalizeToGray(matrix);

  //Step 1: Gaussian blur (5×5 kernel, σ≈1.4)
  const gKernel = [
    [2,  4,  5,  4,  2],
    [4,  9, 12,  9,  4],
    [5, 12, 15, 12,  5],
    [4,  9, 12,  9,  4],
    [2,  4,  5,  4,  2],
  ];
  const gSum = 159;
  const blurred: number[][] = gray.map(r => [...r]);
  for (let r = 2; r < rows - 2; r++) {
    for (let c = 2; c < cols - 2; c++) {
      let s = 0;
      for (let kr = 0; kr < 5; kr++)
        for (let kc = 0; kc < 5; kc++)
          s += gray[r + kr - 2][c + kc - 2] * gKernel[kr][kc];
      blurred[r][c] = s / gSum;
    }
  }

  //Step 2: Sobel gradients
  const Gx = [[-1,0,1],[-2,0,2],[-1,0,1]];
  const Gy = [[-1,-2,-1],[0,0,0],[1,2,1]];
  const mag: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const dir: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  let maxMag = 0;

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      let gx = 0, gy = 0;
      for (let kr = 0; kr < 3; kr++)
        for (let kc = 0; kc < 3; kc++) {
          gx += blurred[r + kr - 1][c + kc - 1] * Gx[kr][kc];
          gy += blurred[r + kr - 1][c + kc - 1] * Gy[kr][kc];
        }
      mag[r][c] = Math.sqrt(gx * gx + gy * gy);
      dir[r][c] = Math.atan2(gy, gx);
      if (mag[r][c] > maxMag) maxMag = mag[r][c];
    }
  }

  //Step 3: Non-maximum suppression
  const nms: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const angle = ((dir[r][c] * 180) / Math.PI + 180) % 180;
      let n1 = 0, n2 = 0;
      if      (angle < 22.5  || angle >= 157.5) { n1 = mag[r][c-1];   n2 = mag[r][c+1]; }
      else if (angle < 67.5)                    { n1 = mag[r-1][c+1]; n2 = mag[r+1][c-1]; }
      else if (angle < 112.5)                   { n1 = mag[r-1][c];   n2 = mag[r+1][c]; }
      else                                       { n1 = mag[r-1][c-1]; n2 = mag[r+1][c+1]; }
      nms[r][c] = mag[r][c] >= n1 && mag[r][c] >= n2 ? mag[r][c] : 0;
    }
  }

  //Step 4: Double threshold + hysteresis
  const high = maxMag * highRatio;
  const low  = maxMag * lowRatio;

  //Classify: 2 = strong, 1 = weak, 0 = none
  const classified: number[][] = nms.map(row =>
    row.map(v => v >= high ? 2 : v >= low ? 1 : 0)
  );

  //Hysteresis: keep weak edges connected to strong edges
  const result: BinaryMatrix = classified.map(row => row.map(v => v === 2));
  const stack: [number, number][] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (classified[r][c] === 2) stack.push([r, c]);

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
            classified[nr][nc] === 1 && !result[nr][nc]) {
          result[nr][nc] = true;
          stack.push([nr, nc]);
        }
      }
    }
  }

  return result;
}
