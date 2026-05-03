// lib/thermal/footIsolation.ts
// Isolates the foot from a thermal background using temperature thresholding,
// largest-connected-component extraction, and morphological dilation.

import { matrixToRgbaPngUri } from './thermalBitmap'

// Returns a boolean mask: true = subject pixel, false = background.
// Works for both hot subjects (warm foot on cold floor) and cold subjects (cold dumbbell on warm table).
// Algorithm:
//   1. Otsu threshold + variance guardrail — skip if histogram is essentially uniform (blank scene)
//   2. Close BOTH masks independently — closing fills holes in each class on its own mask;
//      closing only the hot mask would erase a cold subject (it appears as a hole in the hot region)
//   3. BFS on each closed mask — largest component + border pixel count + size
//   4. Border-to-area ratio polarity check — background hugs the perimeter (high ratio),
//      subject is compact (low ratio); pick the class with the lower ratio
//   5. Opening (erode 2, dilate 2) — trims ragged boundary fringe pixels on the chosen subject
export function isolateFootMask(matrix: number[][]): boolean[][] {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  if (!rows || !cols) return []

  const flat: number[] = []
  for (const row of matrix) for (const v of row) flat.push(v)

  const [threshold, bestVar] = otsuThresholdWithVariance(flat)
  // Guardrail kept very loose — only catches truly uniform frames; even mild bimodality passes.
  if (bestVar < 1.0) return Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false))

  const hotRaw:  boolean[] = flat.map(v => v >= threshold)
  const coldRaw: boolean[] = hotRaw.map(v => !v)

  const closedHot  = morphClose(hotRaw,  rows, cols, 5, 5)
  const closedCold = morphClose(coldRaw, rows, cols, 5, 5)

  const [hotMask,  hotBorder,  hotSize]  = largestComponentWithBorderCount(closedHot,  rows, cols)
  const [coldMask, coldBorder, coldSize] = largestComponentWithBorderCount(closedCold, rows, cols)

  const hotRatio  = hotSize  > 0 ? hotBorder  / hotSize  : Number.MAX_VALUE
  const coldRatio = coldSize > 0 ? coldBorder / coldSize : Number.MAX_VALUE

  const subjectFlat = hotRatio <= coldRatio ? hotMask : coldMask

  const trimmed = morphDilate(morphErode(subjectFlat, rows, cols, 2), rows, cols, 2)

  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => trimmed[r * cols + c])
  )
}

function morphDilate(src: boolean[], rows: number, cols: number, r: number): boolean[] {
  const dst = new Array<boolean>(rows * cols).fill(false)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!src[row * cols + col]) continue
      for (let dr = -r; dr <= r; dr++) {
        for (let dc = -r; dc <= r; dc++) {
          const nr = row + dr; const nc = col + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) dst[nr * cols + nc] = true
        }
      }
    }
  }
  return dst
}

function morphErode(src: boolean[], rows: number, cols: number, r: number): boolean[] {
  const dst = new Array<boolean>(rows * cols).fill(false)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!src[row * cols + col]) continue
      let keep = true
      outer: for (let dr = -r; dr <= r; dr++) {
        for (let dc = -r; dc <= r; dc++) {
          const nr = row + dr; const nc = col + dc
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || !src[nr * cols + nc]) { keep = false; break outer }
        }
      }
      dst[row * cols + col] = keep
    }
  }
  return dst
}

function morphClose(src: boolean[], rows: number, cols: number, dilateR: number, erodeR: number): boolean[] {
  return morphErode(morphDilate(src, rows, cols, dilateR), rows, cols, erodeR)
}

function largestComponentWithBorderCount(mask: boolean[], rows: number, cols: number): [boolean[], number, number] {
  const labels = new Int32Array(rows * cols).fill(-1)
  const sizes: number[] = []
  const borderCounts: number[] = []
  const queue: number[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      if (!mask[i] || labels[i] >= 0) continue
      const label = sizes.length
      sizes.push(0)
      borderCounts.push(0)
      queue.length = 0
      queue.push(i)
      labels[i] = label
      let head = 0
      while (head < queue.length) {
        const cur = queue[head++]
        const cr = Math.floor(cur / cols)
        const cc = cur % cols
        sizes[label]++
        if (cr === 0 || cr === rows - 1 || cc === 0 || cc === cols - 1) borderCounts[label]++
        for (let d = 0; d < 4; d++) {
          const nr = cr + (d === 0 ? -1 : d === 1 ? 1 : 0)
          const nc = cc + (d === 2 ? -1 : d === 3 ? 1 : 0)
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
          const ni = nr * cols + nc
          if (!mask[ni] || labels[ni] >= 0) continue
          labels[ni] = label
          queue.push(ni)
        }
      }
    }
  }

  if (sizes.length === 0) return [new Array<boolean>(rows * cols).fill(false), 0, 0]
  let best = 0
  for (let l = 1; l < sizes.length; l++) if (sizes[l] > sizes[best]) best = l
  return [Array.from({ length: rows * cols }, (_, i) => labels[i] === best), borderCounts[best], sizes[best]]
}

function otsuThresholdWithVariance(flat: number[]): [number, number] {
  let minV = Infinity, maxV = -Infinity
  for (const v of flat) { if (v < minV) minV = v; if (v > maxV) maxV = v }
  const range = maxV - minV
  if (range <= 0) return [minV, 0]

  const BINS = 256
  const hist = new Float64Array(BINS)
  for (const v of flat) {
    const bin = Math.min(BINS - 1, Math.floor(((v - minV) / range) * (BINS - 1)))
    hist[bin]++
  }

  const n = flat.length
  let totalSum = 0
  for (let i = 0; i < BINS; i++) totalSum += i * hist[i]

  let w0 = 0, sum0 = 0, bestVar = 0, bestBin = 0
  for (let t = 0; t < BINS - 1; t++) {
    w0 += hist[t]; const w1 = n - w0
    if (w0 === 0 || w1 === 0) continue
    sum0 += t * hist[t]
    const mu0 = sum0 / w0
    const mu1 = (totalSum - sum0) / w1
    const bv  = (w0 / n) * (w1 / n) * (mu0 - mu1) ** 2
    if (bv > bestVar) { bestVar = bv; bestBin = t }
  }
  return [minV + (bestBin / (BINS - 1)) * range, bestVar]
}

// Returns a data:image/png;base64,... URI with transparent background.
// Foot pixels keep their palette colour; background pixels are alpha=0.
export function isolatedFootPngUri(
  matrix: number[][],
  minVal: number,
  maxVal: number,
): string {
  const mask = isolateFootMask(matrix)
  return matrixToRgbaPngUri(matrix, mask, minVal, maxVal)
}

// Returns { png, csv, mask } together so the caller only runs isolation once.
export function isolateAll(
  matrix: number[][],
  minVal: number,
  maxVal: number,
): { pngUri: string; maskedCsv: string; mask: boolean[][] } {
  const mask       = isolateFootMask(matrix)
  const pngUri     = matrixToRgbaPngUri(matrix, mask, minVal, maxVal)
  const maskedCsv  = applyMaskToCsv(matrix, mask)
  return { pngUri, maskedCsv, mask }
}

// Rewrites a temperature matrix to CSV, setting background pixels to "0.00".
// Foot pixels retain their original °C value; background becomes 0.
export function applyMaskToCsv(matrix: number[][], mask: boolean[][]): string {
  const rows = matrix.length
  const sb: string[] = []
  for (let r = 0; r < rows; r++) {
    const row     = matrix[r]
    const maskRow = mask[r] ?? []
    const cells: string[] = []
    for (let c = 0; c < row.length; c++) {
      cells.push(maskRow[c] ? row[c].toFixed(2) : '0.00')
    }
    sb.push(cells.join(','))
  }
  return sb.join('\n')
}
