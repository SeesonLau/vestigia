// lib/thermal/tiffEncoder.ts
// Encodes a 16-bit grayscale TIFF from raw radiometric U16 data (Kelvin × 100).
// Output is uncompressed little-endian TIFF, readable by ImageJ, MATLAB, FLIR Tools.

export function encodeTiff(rawU16: Uint16Array, width: number, height: number): Uint8Array {
  // Layout (little-endian):
  //   0–7    : header (8 bytes)
  //   8–9    : IFD entry count = 11
  //   10–141 : 11 × 12-byte IFD entries
  //   142–145: next IFD offset = 0
  //   146–153: XResolution rational [72, 1]
  //   154–161: YResolution rational [72, 1]
  //   162+   : pixel data (width × height × 2 bytes)
  const NUM_TAGS = 11;
  const xresOff = 146;
  const yresOff = 154;
  const dataOff = 162;
  const fileSize = dataOff + rawU16.length * 2;

  const buf = new Uint8Array(fileSize);
  const dv = new DataView(buf.buffer);

  // Header
  dv.setUint16(0, 0x4949, true);  // II = little-endian
  dv.setUint16(2, 42, true);       // TIFF magic
  dv.setUint32(4, 8, true);        // offset to first IFD

  // IFD entry count
  dv.setUint16(8, NUM_TAGS, true);

  // Write one IFD entry: tag(2) type(2) count(4) value/offset(4)
  let e = 10;
  function tag(t: number, type: number, count: number, val: number): void {
    dv.setUint16(e, t, true);
    dv.setUint16(e + 2, type, true);
    dv.setUint32(e + 4, count, true);
    dv.setUint32(e + 8, val, true);
    e += 12;
  }

  // Types: 3=SHORT  4=LONG  5=RATIONAL
  // Tags must be in ascending tag-number order per TIFF spec
  tag(256, 4, 1, width);                    // ImageWidth
  tag(257, 4, 1, height);                   // ImageLength
  tag(258, 3, 1, 16);                       // BitsPerSample = 16
  tag(259, 3, 1, 1);                        // Compression = none
  tag(262, 3, 1, 1);                        // PhotometricInterpretation = BlackIsZero
  tag(273, 4, 1, dataOff);                  // StripOffsets
  tag(278, 4, 1, height);                   // RowsPerStrip = all rows
  tag(279, 4, 1, width * height * 2);       // StripByteCounts
  tag(282, 5, 1, xresOff);                  // XResolution → rational at 146
  tag(283, 5, 1, yresOff);                  // YResolution → rational at 154
  tag(296, 3, 1, 2);                        // ResolutionUnit = inch

  // Next IFD = 0 (no more IFDs)
  dv.setUint32(e, 0, true);

  // Rational values for XRes and YRes (72/1)
  dv.setUint32(xresOff, 72, true); dv.setUint32(xresOff + 4, 1, true);
  dv.setUint32(yresOff, 72, true); dv.setUint32(yresOff + 4, 1, true);

  // Pixel data — little-endian 16-bit rows
  for (let i = 0; i < rawU16.length; i++) {
    dv.setUint16(dataOff + i * 2, rawU16[i], true);
  }

  return buf;
}
