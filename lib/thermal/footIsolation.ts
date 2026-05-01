// lib/thermal/footIsolation.ts
// Isolates the foot from a thermal background using temperature thresholding,
// largest-connected-component extraction, and morphological dilation.

import { matrixToRgbaPngUri } from './thermalBitmap'

// Returns a boolean mask: true = foot pixel, false = background.
// Algorithm:
//   1. Otsu's threshold — maximises between-class variance (background vs subject)
//   2. BFS flood fill to label connected components (4-connectivity)
//   3. Keep only the largest component (the foot)
//   4. Morphological closing: dilate 5px then erode 2px — fills finger gaps, ~3px net expansion
export function isolateFootMask(matrix: number[][]): boolean[][] {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  if (!rows || !cols) return []

  const flat: number[] = []
  for (const row of matrix) for (const v of row) flat.push(v)

  // Otsu's threshold
  const threshold = otsuThreshold(flat)

  // Initial binary mask
  const hot: boolean[][] = matrix.map(row => row.map(v => v >= threshold))

  // BFS flood fill — label connected components
  const labels = new Int32Array(rows * cols).fill(-1)
  const sizes: number[] = []
  const queue: number[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      if (!hot[r][c] || labels[i] >= 0) continue

      const label = sizes.length
      sizes.push(0)
      queue.length = 0
      queue.push(i)
      labels[i] = label

      let head = 0
      while (head < queue.length) {
        const cur = queue[head++]
        const cr = Math.floor(cur / cols)
        const cc = cur % cols
        sizes[label]++
        // 4-connectivity
        for (let d = 0; d < 4; d++) {
          const nr = cr + (d === 0 ? -1 : d === 1 ? 1 : 0)
          const nc = cc + (d === 2 ? -1 : d === 3 ? 1 : 0)
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
          const ni = nr * cols + nc
          if (!hot[nr][nc] || labels[ni] >= 0) continue
          labels[ni] = label
          queue.push(ni)
        }
      }
    }
  }

  if (sizes.length === 0) return hot

  // Largest component
  let best = 0
  for (let l = 1; l < sizes.length; l++) if (sizes[l] > sizes[best]) best = l

  const clean: boolean[][] = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false))
  for (let i = 0; i < rows * cols; i++) {
    if (labels[i] === best) clean[Math.floor(i / cols)][i % cols] = true
  }

  // Morphological closing: dilate 5px then erode 2px — fills finger gaps, ~3px net expansion
  const DILATE = 5
  const ERODE  = 2

  const dilated: boolean[][] = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!clean[r][c]) continue
      for (let dr = -DILATE; dr <= DILATE; dr++) {
        for (let dc = -DILATE; dc <= DILATE; dc++) {
          const nr = r + dr; const nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) dilated[nr][nc] = true
        }
      }
    }
  }

  const closed: boolean[][] = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!dilated[r][c]) continue
      let keep = true
      outer: for (let dr = -ERODE; dr <= ERODE; dr++) {
        for (let dc = -ERODE; dc <= ERODE; dc++) {
          const nr = r + dr; const nc = c + dc
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || !dilated[nr][nc]) { keep = false; break outer }
        }
      }
      closed[r][c] = keep
    }
  }

  return closed
}

// Otsu's threshold — finds the value that maximises between-class variance over 256 bins.
function otsuThreshold(flat: number[]): number {
  let minV = Infinity, maxV = -Infinity
  for (const v of flat) { if (v < minV) minV = v; if (v > maxV) maxV = v }
  const range = maxV - minV
  if (range <= 0) return minV

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
  return minV + (bestBin / (BINS - 1)) * range
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
