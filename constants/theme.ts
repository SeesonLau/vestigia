//constants/theme.ts
export const Colors = {
  // Backgrounds
  bg: {
    primary: "#050d1a", // deepest navy
    secondary: "#0a1628", // dark navy
    card: "rgba(13, 25, 48, 0.7)",
    glass: "rgba(15, 30, 60, 0.5)",
    glassLight: "rgba(30, 60, 100, 0.25)",
    input: "rgba(10, 22, 44, 0.8)",
    overlay: "rgba(5, 13, 26, 0.85)",
  },

  // Borders
  border: {
    default: "rgba(56, 100, 160, 0.3)",
    strong: "rgba(56, 130, 200, 0.5)",
    focus: "rgba(56, 180, 240, 0.7)",
    subtle: "rgba(30, 60, 100, 0.2)",
  },

  // Primary blue-teal palette
  primary: {
    50: "#e0f4ff",
    100: "#b3e4ff",
    200: "#7dcfff",
    300: "#40b4f5",
    400: "#1a9ee0",
    500: "#0080c8", // main brand blue
    600: "#0066a8",
    700: "#004d85",
    800: "#003562",
    900: "#001e3d",
  },

  // Accent teal
  teal: {
    300: "#4dd9c0",
    400: "#2cc4a8",
    500: "#14b08e", // main teal
    600: "#0d9478",
  },

  // Semantic
  positive: "#ef4444", // red — DPN POSITIVE (danger)
  negative: "#14b08e", // teal — DPN NEGATIVE (safe)
  warning: "#f59e0b",
  info: "#3b82f6",

  // Text
  text: {
    primary: "#e8f0fe",
    secondary: "#94afd4",
    muted: "#4d6a96",
    inverse: "#050d1a",
  },

  // Thermal colormap stops (cold → hot)
  thermal: {
    cold: "#1a1aff",
    cool: "#00aaff",
    mid: "#00ff88",
    warm: "#ffcc00",
    hot: "#ff4400",
    peak: "#ff0000",
  },
};

export const Typography = {
  fonts: {
    heading: "SpaceGrotesk_700Bold",
    subheading: "SpaceGrotesk_600SemiBold",
    body: "SpaceGrotesk_400Regular",
    mono: "SpaceMono_400Regular",
    label: "SpaceGrotesk_500Medium",
  },
  sizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 22,
    "2xl": 26,
    "3xl": 32,
    "4xl": 40,
  },
  lineHeights: {
    tight: 1.2,
    base: 1.5,
    loose: 1.8,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadow = {
  glow: {
    shadowColor: "#0080c8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  subtle: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};
