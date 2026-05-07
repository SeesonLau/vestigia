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

export const PALETTES: readonly PaletteMeta[] = [
  { id: "ironbow",    label: "Ironbow",    swatch: "#FF4500", desc: "Heated metal: black→red→orange→white" },
  { id: "rainbow",    label: "Rainbow",    swatch: "#00BFFF", desc: "Full spectrum: blue (cold) → red (hot)" },
  { id: "rainbow_hc", label: "Rainbow HC", swatch: "#FF00FF", desc: "High-contrast 6-band · fine Δ°C" },
  { id: "rainbow3",   label: "Rainbow 3",  swatch: "#9500B5", desc: "8-step LUT: purple → blue → cyan → green → yellow → orange → red → white" },
  { id: "lepton",     label: "Lepton",     swatch: "#00B4FF", desc: "Wide spectrum: purple → blue → cyan → green → yellow → orange → red → pink" },
  { id: "white_hot",  label: "White Hot",  swatch: "#FFFFFF", desc: "Grayscale · white = warmest" },
  { id: "black_hot",  label: "Black Hot",  swatch: "#444444", desc: "Inverted grayscale · black = warmest" },
  { id: "arctic",     label: "Arctic",     swatch: "#4488FF", desc: "Cold=blue, warm=golden yellow" },
  { id: "sepia",      label: "Sepia",      swatch: "#C4933F", desc: "Warm brown tones · low eye fatigue" },
] as const;
