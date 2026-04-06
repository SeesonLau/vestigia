// constants/theme.ts

// ── Arctic Mint Theme Tokens ───────────────────────────────────
export interface ThemeColors {
  // Backgrounds
  bg: string;        // primary screen background
  card: string;      // card / modal / bottom sheet
  cardAlt: string;   // secondary surface, alternating rows
  surface: string;   // input field, search bar, recessed
  overlay: string;   // modal scrim

  // Text
  text: string;      // headings, body, all primary readable content
  textSec: string;   // subtitles, captions, helper text, placeholders
  textInverse: string; // white/light text used on accent backgrounds

  // Accent / Brand
  accent: string;    // primary CTA, active icons, links, progress bars
  accentSoft: string; // ghost button fill, chip bg, icon containers

  // Navigation
  navBg: string;
  navActive: string;
  navInactive: string;

  // Badges & Notifications
  badge: string;     // notification dot / count badge background
  badgeText: string; // text inside badge

  // Tags & Labels
  tagBg: string;
  tagText: string;

  // Borders & Dividers
  border: string;      // default card borders, list dividers
  borderFocus: string; // focused input outline

  // Highlights
  highlight: string; // selected rows, hover states, tooltip bg

  // Semantic
  error: string;   // destructive / DPN POSITIVE (danger)
  warning: string; // caution
  success: string; // = accent (teal = healthy / DPN NEGATIVE)
  info: string;    // informational blue

  // Shadow
  shadowColor: string;

  // Thermal colormap (cold → hot, same for both modes)
  thermal: {
    cold: string;
    cool: string;
    mid: string;
    warm: string;
    hot: string;
    peak: string;
  };
}

// ── Light Mode ─────────────────────────────────────────────────
export const lightColors: ThemeColors = {
  bg:        "#F0F8FA",
  card:      "#FFFFFF",
  cardAlt:   "#E4F3F7",
  surface:   "#DFF0F4",
  overlay:   "rgba(21, 37, 48, 0.6)",

  text:       "#152530",
  textSec:    "#4D7080",
  textInverse: "#FFFFFF",

  accent:     "#009DAE",
  accentSoft: "#B3E5EC",

  navBg:      "#FFFFFF",
  navActive:  "#009DAE",
  navInactive:"#93BBC6",

  badge:     "#7C4DFF",
  badgeText: "#FFFFFF",

  tagBg:  "#EDE7F6",
  tagText:"#5E35B1",

  border:      "#C4DDE4",
  borderFocus: "#009DAE",

  highlight: "#E8DEFF",

  error:   "#EF4444",
  warning: "#F59E0B",
  success: "#009DAE",
  info:    "#3B82F6",

  shadowColor: "rgba(0, 157, 174, 0.08)",

  thermal: {
    cold: "#1a1aff",
    cool: "#00aaff",
    mid:  "#00ff88",
    warm: "#ffcc00",
    hot:  "#ff4400",
    peak: "#ff0000",
  },
};

// ── Dark Mode ──────────────────────────────────────────────────
export const darkColors: ThemeColors = {
  bg:        "#090F14",
  card:      "#101C24",
  cardAlt:   "#14242E",
  surface:   "#10222C",
  overlay:   "rgba(9, 15, 20, 0.85)",

  text:       "#DFF0F4",
  textSec:    "#7AAAB8",
  textInverse: "#FFFFFF",

  accent:     "#26C6DA",
  accentSoft: "#0E2F38",

  navBg:      "#0C1820",
  navActive:  "#26C6DA",
  navInactive:"#2A5060",

  badge:     "#2E1A5E",
  badgeText: "#B388FF",

  tagBg:  "#1A1030",
  tagText:"#CE93D8",

  border:      "#1A3642",
  borderFocus: "#26C6DA",

  highlight: "#1A1030",

  error:   "#F87171",
  warning: "#FCD34D",
  success: "#26C6DA",
  info:    "#93C5FD",

  shadowColor: "rgba(0, 0, 0, 0.4)",

  thermal: {
    cold: "#1a1aff",
    cool: "#00aaff",
    mid:  "#00ff88",
    warm: "#ffcc00",
    hot:  "#ff4400",
    peak: "#ff0000",
  },
};

// ── Typography ─────────────────────────────────────────────────
export const Typography = {
  fonts: {
    heading:    "SpaceGrotesk_700Bold",
    subheading: "SpaceGrotesk_600SemiBold",
    body:       "SpaceGrotesk_400Regular",
    mono:       "SpaceMono_400Regular",
    label:      "SpaceGrotesk_500Medium",
  },
  sizes: {
    xs:   10,
    sm:   12,
    base: 14,
    md:   16,
    lg:   18,
    xl:   22,
    "2xl": 26,
    "3xl": 32,
    "4xl": 40,
  },
  lineHeights: {
    tight: 1.2,
    base:  1.5,
    loose: 1.8,
  },
};

// ── Spacing ────────────────────────────────────────────────────
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
};

// ── Radius ─────────────────────────────────────────────────────
export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
};
