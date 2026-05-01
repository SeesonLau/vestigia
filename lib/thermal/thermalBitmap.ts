// lib/thermal/thermalBitmap.ts
// Encodes a thermal matrix as a PNG data URI for hardware-accelerated display.
// Using Image component instead of SVG rects eliminates React Native bridge overhead
// and gives Fresco (Android) bilinear scaling automatically — smooth like the reference.

//CRC32 — pre-computed table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Uint8Array, s: number, e: number): number {
  let c = 0xFFFFFFFF;
  for (let i = s; i < e; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

//Iron colormap — matches ThermalMap.tsx stops
function ironRGB(t: number): [number, number, number] {
  const n = Math.max(0, Math.min(1, t));
  if (n < 0.2)  { const f = n / 0.2;        return [Math.round(80 * f),         0,                   Math.round(120 * f)];     }
  if (n < 0.45) { const f = (n - 0.2) / 0.25; return [Math.round(80 + 120 * f),   0,                   Math.round(120 - 60 * f)]; }
  if (n < 0.65) { const f = (n - 0.45) / 0.2; return [Math.round(200 + 55 * f),   Math.round(100 * f),  Math.round(60 - 60 * f)]; }
  if (n < 0.85) { const f = (n - 0.65) / 0.2; return [255,                        Math.round(100 + 120 * f), 0];                  }
  const f = (n - 0.85) / 0.15;               return [255,                        Math.round(220 + 35 * f),  Math.round(200 * f)];
}

//PNG chunk helper
function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const buf = new Uint8Array(12 + data.length);
  const w32 = (b: Uint8Array, o: number, v: number) => {
    b[o] = (v >> 24) & 0xFF; b[o+1] = (v >> 16) & 0xFF; b[o+2] = (v >> 8) & 0xFF; b[o+3] = v & 0xFF;
  };
  w32(buf, 0, data.length);
  for (let i = 0; i < 4; i++) buf[4 + i] = type.charCodeAt(i);
  buf.set(data, 8);
  w32(buf, 8 + data.length, crc32(buf, 4, 8 + data.length));
  return buf;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodePng(
  rows: number, cols: number,
  fillScanline: (raw: Uint8Array, rowOffset: number, r: number) => void,
  bytesPerPixel: number,
  colorType: number,   // 2 = RGB, 6 = RGBA
): string {
  const SL = 1 + cols * bytesPerPixel
  const rawLen = rows * SL
  const raw = new Uint8Array(rawLen)

  for (let r = 0; r < rows; r++) {
    raw[r * SL] = 0 // filter = None
    fillScanline(raw, r * SL + 1, r)
  }

  let s1 = 1, s2 = 0
  for (let i = 0; i < rawLen; i++) {
    s1 = (s1 + raw[i]) % 65521
    s2 = (s2 + s1) % 65521
  }
  const adler = ((s2 << 16) | s1) >>> 0

  const zlib = new Uint8Array(2 + 5 + rawLen + 4)
  zlib[0] = 0x78; zlib[1] = 0x01
  zlib[2] = 0x01
  zlib[3] = rawLen & 0xFF; zlib[4] = (rawLen >> 8) & 0xFF
  zlib[5] = (~rawLen) & 0xFF; zlib[6] = (~rawLen >> 8) & 0xFF
  zlib.set(raw, 7)
  const ao = 7 + rawLen
  zlib[ao] = (adler >> 24) & 0xFF; zlib[ao+1] = (adler >> 16) & 0xFF
  zlib[ao+2] = (adler >> 8) & 0xFF; zlib[ao+3] = adler & 0xFF

  const ihdr = new Uint8Array(13)
  const w32i = (o: number, v: number) => { ihdr[o]=(v>>24)&0xFF; ihdr[o+1]=(v>>16)&0xFF; ihdr[o+2]=(v>>8)&0xFF; ihdr[o+3]=v&0xFF }
  w32i(0, cols); w32i(4, rows)
  ihdr[8] = 8; ihdr[9] = colorType

  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const c1 = makeChunk('IHDR', ihdr)
  const c2 = makeChunk('IDAT', zlib)
  const c3 = makeChunk('IEND', new Uint8Array(0))

  const png = new Uint8Array(sig.length + c1.length + c2.length + c3.length)
  let off = 0
  png.set(sig, off); off += sig.length
  png.set(c1, off); off += c1.length
  png.set(c2, off); off += c2.length
  png.set(c3, off)

  let b64 = ''
  for (let i = 0; i < png.length; i += 3) {
    const a = png[i], b = i+1 < png.length ? png[i+1] : 0, c = i+2 < png.length ? png[i+2] : 0
    b64 += B64[a >> 2]
    b64 += B64[((a & 3) << 4) | (b >> 4)]
    b64 += i+1 < png.length ? B64[((b & 15) << 2) | (c >> 6)] : '='
    b64 += i+2 < png.length ? B64[c & 63] : '='
  }
  return 'data:image/png;base64,' + b64
}

export function matrixToPngUri(matrix: number[][], minVal: number, maxVal: number): string {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  if (!rows || !cols) return ''
  const range = maxVal - minVal || 1
  return encodePng(rows, cols, (raw, offset, r) => {
    const row = matrix[r]
    for (let c = 0; c < cols; c++) {
      const [ri, gi, bi] = ironRGB((row[c] - minVal) / range)
      raw[offset + c * 3]     = ri
      raw[offset + c * 3 + 1] = gi
      raw[offset + c * 3 + 2] = bi
    }
  }, 3, 2)
}

// RGBA PNG — foot pixels keep palette colour (alpha=255), background is transparent (alpha=0).
export function matrixToRgbaPngUri(
  matrix: number[][],
  mask: boolean[][],
  minVal: number,
  maxVal: number,
): string {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  if (!rows || !cols) return ''
  const range = maxVal - minVal || 1
  return encodePng(rows, cols, (raw, offset, r) => {
    const row = matrix[r]
    const maskRow = mask[r] ?? []
    for (let c = 0; c < cols; c++) {
      const [ri, gi, bi] = ironRGB((row[c] - minVal) / range)
      const p = offset + c * 4
      raw[p]     = ri
      raw[p + 1] = gi
      raw[p + 2] = bi
      raw[p + 3] = maskRow[c] ? 255 : 0
    }
  }, 4, 6)
}
