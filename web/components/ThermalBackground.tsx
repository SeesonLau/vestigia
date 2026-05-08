// web/components/ThermalBackground.tsx
// Ambient backdrop for the admin console. Pure SVG / CSS — no images.
//
// The motifs reference what the app actually does:
//   - Two large soft "thermal blobs" (cool teal + warm amber/rose) reminiscent
//     of an iron / inferno thermal palette (cool body, hot extremity).
//   - Faint concentric isotherm rings centred on the warm blob — the visual
//     vocabulary of a heat map.
//   - A pair of low-opacity foot silhouettes anchored to the bottom-right —
//     a quiet nod to plantar-foot screening without dominating the page.
//   - A subtle dot/scan grid overlay at very low opacity for the "instrument
//     panel" feel.
//
// The whole thing is `fixed inset-0 -z-10 pointer-events-none` so it covers
// the viewport behind any layout, never intercepts clicks, and stays put
// while the admin content scrolls.

export function ThermalBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base wash — light/dark aware */}
      <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-950" />

      {/* Cool thermal blob (top-left). Teal → cyan, soft. */}
      <div
        className="absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl dark:opacity-30"
        style={{
          background:
            "radial-gradient(closest-side, rgba(20,184,166,0.55), rgba(14,116,144,0.25) 55%, transparent 75%)",
        }}
      />

      {/* Warm thermal blob (mid-right). Amber → rose, simulates a hot spot. */}
      <div
        className="absolute -right-24 top-1/3 h-[560px] w-[560px] rounded-full opacity-40 blur-3xl dark:opacity-25"
        style={{
          background:
            "radial-gradient(closest-side, rgba(251,146,60,0.55), rgba(244,63,94,0.30) 50%, transparent 75%)",
        }}
      />

      {/* A second cool tone (bottom-left) to balance the composition. */}
      <div
        className="absolute -left-20 bottom-[-180px] h-[480px] w-[480px] rounded-full opacity-35 blur-3xl dark:opacity-20"
        style={{
          background:
            "radial-gradient(closest-side, rgba(56,189,248,0.45), rgba(14,116,144,0.20) 55%, transparent 75%)",
        }}
      />

      {/* Isotherm rings — concentric heat-map contours over the warm blob. */}
      <svg
        className="absolute right-[-160px] top-[28%] h-[640px] w-[640px] opacity-[0.18] dark:opacity-[0.10]"
        viewBox="0 0 600 600"
        fill="none"
      >
        {[60, 110, 160, 210, 260].map((r, i) => (
          <circle
            key={r}
            cx={300}
            cy={300}
            r={r}
            stroke="currentColor"
            strokeWidth={1 + i * 0.25}
            className="text-amber-600 dark:text-amber-400"
          />
        ))}
      </svg>

      {/* Plantar-foot silhouettes — bottom-right corner, quiet domain cue. */}
      <svg
        className="absolute -right-20 -bottom-16 h-[300px] w-[420px] text-teal-700 opacity-[0.07] dark:text-teal-400 dark:opacity-[0.10]"
        viewBox="0 0 420 300"
        fill="currentColor"
        aria-hidden
      >
        {/* Left foot (mirrored) */}
        <g transform="translate(40,30)">
          <FootPath />
        </g>
        {/* Right foot */}
        <g transform="translate(220,30)">
          <FootPath />
        </g>
      </svg>

      {/* Faint dot grid — instrument-panel texture. */}
      <div
        className="absolute inset-0 opacity-[0.07] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          color: "rgb(63 63 70)", // zinc-700
        }}
      />
    </div>
  );
}

// Stylised plantar foot outline — sole + five toe pads.
function FootPath() {
  return (
    <>
      {/* Sole */}
      <path
        d="M 60 220
           C 30 220, 10 180, 14 130
           C 18 80, 50 50, 90 52
           C 130 54, 150 80, 152 130
           C 154 180, 130 220, 100 220
           Z"
      />
      {/* Big toe */}
      <ellipse cx="40" cy="36" rx="14" ry="20" />
      {/* Other toes */}
      <ellipse cx="68"  cy="22" rx="9"  ry="14" />
      <ellipse cx="90"  cy="18" rx="8"  ry="12" />
      <ellipse cx="110" cy="22" rx="7"  ry="11" />
      <ellipse cx="128" cy="30" rx="6"  ry="10" />
    </>
  );
}
