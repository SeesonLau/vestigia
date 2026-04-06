// lib/thermal/thermalPng.ts
// Pure-JS thermal matrix → base64 PNG encoder (no native dependencies).
// Uses the same Iron colormap as ThermalMap.tsx.

//Colormap (Iron — matches ThermalMap.tsx)
function tempToRgb(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const stops: [number, number, number][] = [
    [0, 0, 0],
    [80, 0, 120],
    [200, 0, 60],
    [255, 100, 0],
    [255, 220, 0],
    [255, 255, 200],
  ];
  const positions = [0, 0.2, 0.45, 0.65, 0.85, 1.0];
  let i = 0;
  while (i < positions.length - 1 && clamped > positions[i + 1]) i++;
  if (i >= stops.length - 1) i = stops.length - 2;
  const lo = positions[i];
  const hi = positions[i + 1];
  const f = hi === lo ? 0 : (clamped - lo) / (hi - lo);
  return [
    Math.round(stops[i][0] + f * (stops[i + 1][0] - stops[i][0])),
    Math.round(stops[i][1] + f * (stops[i + 1][1] - stops[i][1])),
    Math.round(stops[i][2] + f * (stops[i + 1][2] - stops[i][2])),
  ];
}

//CRC32 (PNG requires IEEE 802.3 polynomial)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Uint8Array, offset: number, length: number): number {
  let crc = 0xffffffff;
  for (let i = offset; i < offset + length; i++)
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

//Adler32 (zlib integrity checksum)
function adler32(buf: Uint8Array): number {
  let s1 = 1, s2 = 0;
  for (let i = 0; i < buf.length; i++) {
    s1 = (s1 + buf[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  return ((s2 << 16) | s1) >>> 0;
}

//Write helpers
function u32be(buf: Uint8Array, off: number, v: number): void {
  buf[off]     = (v >>> 24) & 0xff;
  buf[off + 1] = (v >>> 16) & 0xff;
  buf[off + 2] = (v >>>  8) & 0xff;
  buf[off + 3] =  v         & 0xff;
}

function u16le(buf: Uint8Array, off: number, v: number): void {
  buf[off]     =  v         & 0xff;
  buf[off + 1] = (v >>>  8) & 0xff;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  u32be(out, 0, data.length);
  out[4] = type.charCodeAt(0); out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2); out[7] = type.charCodeAt(3);
  out.set(data, 8);
  u32be(out, 8 + data.length, crc32(out, 4, 4 + data.length));
  return out;
}

//Encode
/**
 * Converts a thermal temperature matrix to a base64-encoded PNG string.
 * Uses the Iron colormap (matching ThermalMap.tsx). No native dependencies.
 * @param matrix  2D array of °C values ([rows][cols])
 * @param minTemp Minimum temperature for colormap normalization
 * @param maxTemp Maximum temperature for colormap normalization
 * @returns Base64 PNG string (no line breaks, no data: prefix)
 */
export function thermalMatrixToPngB64(
  matrix: number[][],
  minTemp: number,
  maxTemp: number,
): string {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return "";
  const range = maxTemp - minTemp || 1;

  //Build PNG filtered rows (filter type 0 = None)
  const rowBytes = 1 + cols * 3;
  const filtered = new Uint8Array(rows * rowBytes);
  for (let r = 0; r < rows; r++) {
    filtered[r * rowBytes] = 0; // filter type: None
    for (let c = 0; c < cols; c++) {
      const n = (matrix[r][c] - minTemp) / range;
      const [R, G, B] = tempToRgb(n);
      const idx = r * rowBytes + 1 + c * 3;
      filtered[idx] = R; filtered[idx + 1] = G; filtered[idx + 2] = B;
    }
  }

  //Build DEFLATE stored blocks (uncompressed) + zlib wrapper
  const MAX_BLOCK = 65535;
  const numBlocks = Math.max(1, Math.ceil(filtered.length / MAX_BLOCK));
  // zlib layout: CMF(1) + FLG(1) + n×(BTYPE(1)+LEN(2)+NLEN(2)+data) + Adler32(4)
  const idat = new Uint8Array(2 + numBlocks * 5 + filtered.length + 4);
  // zlib header: CMF=0x78 (deflate, 32k window), FLG=0x01 (check bits — 30721 % 31 = 0)
  idat[0] = 0x78; idat[1] = 0x01;
  let pos = 2, rem = filtered.length, doff = 0;
  for (let b = 0; b < numBlocks; b++) {
    const blen = Math.min(rem, MAX_BLOCK);
    idat[pos++] = b === numBlocks - 1 ? 1 : 0; // BFINAL | BTYPE=00 (stored)
    u16le(idat, pos, blen);           pos += 2;
    u16le(idat, pos, (~blen) & 0xffff); pos += 2; // NLEN = ones-complement of LEN
    idat.set(filtered.subarray(doff, doff + blen), pos);
    pos += blen; doff += blen; rem -= blen;
  }
  u32be(idat, pos, adler32(filtered)); // zlib Adler32 (big-endian)

  //Assemble PNG
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic
  const ihdrData = new Uint8Array(13);
  u32be(ihdrData, 0, cols); u32be(ihdrData, 4, rows);
  ihdrData[8] = 8; ihdrData[9] = 2; // bit depth=8, color type=RGB

  const ihdr = pngChunk("IHDR", ihdrData);
  const idatChunk = pngChunk("IDAT", idat);
  const iend = pngChunk("IEND", new Uint8Array(0));

  const png = new Uint8Array(sig.length + ihdr.length + idatChunk.length + iend.length);
  let off = 0;
  png.set(sig, off); off += sig.length;
  png.set(ihdr, off); off += ihdr.length;
  png.set(idatChunk, off); off += idatChunk.length;
  png.set(iend, off);

  //Base64 encode in chunks to avoid call stack overflow
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < png.length; i += CHUNK)
    binary += String.fromCharCode(...Array.from(png.subarray(i, i + CHUNK)));
  return btoa(binary);
}
