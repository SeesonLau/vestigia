// lib/thermal/palettes.ts
//Shared palette catalog for thermal screens (live capture + processed
//live view). Each entry mirrors the native Kotlin palette identifier
//so the chip selection round-trips through the JS bridge unchanged.

import type { PaletteType } from "./uvcCamera";

export interface PaletteMeta {
  id:     PaletteType;
  label:  string;
  swatch: string;   // hex chip swatch shown in the picker
  desc:   string;
}

// Order is the rendered chip order. "Medical" sits first so it lines up
// with the default selection on capture screens.
export const PALETTES: readonly PaletteMeta[] = [
  { id: "medical",   label: "Medical",   swatch: "#9500B5", desc: "8-step clinical LUT: purple → blue → cyan → green → yellow → orange → red → white" },
  { id: "ironbow",   label: "Ironbow",   swatch: "#FF4500", desc: "Heated metal: black → red → orange → white" },
  { id: "rainbow",   label: "Rainbow",   swatch: "#00BFFF", desc: "Full spectrum: blue (cold) → red (hot)" },
  { id: "white_hot", label: "White Hot", swatch: "#FFFFFF", desc: "Grayscale · white = warmest" },
] as const;
