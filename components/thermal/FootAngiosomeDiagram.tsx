// components/thermal/FootAngiosomeDiagram.tsx
//Bilateral plantar-foot diagram with the four angiosome regions colored
//by temperature. Geometry follows Hernandez-Contreras 2019:
//  - bounding box of the angiosome region
//  - W split at 35% (medial / "internal") and 65% (lateral)
//  - H split at 60% (upper / forefoot+midfoot) and 40% (lower / heel)
//Quadrants are colored rectangles clipped to the foot silhouette so the
//regions take the foot's natural shape. The medial side is drawn on the
//LEFT of the canvas (matching the reference figure); the LEFT foot is
//rendered by mirroring the canonical right-foot drawing.
//
//FOOT_PATH below is a hand-traced plantar-view silhouette (toes-up). To
//swap in a higher-fidelity asset later, replace just FOOT_PATH and the
//ANGIO_BOX constants -- everything else (clip, color, labels, asymmetry
//flags) is geometry-driven.

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  ClipPath,
  Defs,
  G,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { useTheme } from "../../constants/ThemeContext";
import { Spacing, Typography } from "../../constants/theme";
import type { ThemeColors } from "../../constants/theme";
import type { AsymmetryResult, RegionMeans } from "../../lib/dpnApi";

interface Props {
  left:  RegionMeans | null | undefined;
  right: RegionMeans | null | undefined;
  asymmetry?: AsymmetryResult | null;
}

//---- Geometry ---------------------------------------------------------
const VIEW_W = 110;
const VIEW_H = 280;

//Plantar-view silhouette of a right foot, toes at top. Medial (big-toe)
//side is on the LEFT of the canvas. Reasonably anatomical without going
//photoreal -- rounded toe pad on top with a slight medial bulge for the
//big toe, widest at the ball, narrows over the arch (more on lateral),
//rounded heel.
const FOOT_PATH = [
  "M 32 6",
  "C 12 8, 4 24, 8 44",
  "C 0 70, -2 100, 6 124",
  "C 12 150, 12 178, 8 198",
  "C 6 226, 18 252, 36 260",
  "C 50 268, 70 268, 84 260",
  "C 100 252, 106 226, 102 198",
  "C 100 178, 100 150, 104 124",
  "C 110 100, 108 70, 102 44",
  "C 104 22, 84 6, 60 4",
  "C 50 2, 38 4, 32 6",
  "Z",
].join(" ");

//Bounding box of the four-angiosome region inside the foot (excludes the
//toe pad above and the very base of the heel below). Tuned to FOOT_PATH.
const ANGIO_BOX = { x: 4, y: 46, w: 102, h: 210 } as const;

//Width split (Internal 35% / Lateral 65%) and height split (Upper 60% /
//Lower 40%) per the reference figure.
const W_SPLIT = 0.35;
const H_SPLIT = 0.60;

const REGION_KEYS = ["MPA", "LPA", "MCA", "LCA"] as const;
type RegionKey = typeof REGION_KEYS[number];

interface QuadRect { x: number; y: number; w: number; h: number }

const QUADS: Record<RegionKey, QuadRect> = (() => {
  const wMed = ANGIO_BOX.w * W_SPLIT;
  const wLat = ANGIO_BOX.w * (1 - W_SPLIT);
  const hUpr = ANGIO_BOX.h * H_SPLIT;
  const hLwr = ANGIO_BOX.h * (1 - H_SPLIT);
  const xMed = ANGIO_BOX.x;
  const xLat = ANGIO_BOX.x + wMed;
  const yUpr = ANGIO_BOX.y;
  const yLwr = ANGIO_BOX.y + hUpr;
  return {
    MPA: { x: xMed, y: yUpr, w: wMed, h: hUpr },
    LPA: { x: xLat, y: yUpr, w: wLat, h: hUpr },
    MCA: { x: xMed, y: yLwr, w: wMed, h: hLwr },
    LCA: { x: xLat, y: yLwr, w: wLat, h: hLwr },
  };
})();

//---- Color ------------------------------------------------------------
type Stop = readonly [number, readonly [number, number, number]];
const TEMP_STOPS: readonly Stop[] = [
  //Blue → cyan → yellow → red
  [0.00, [ 31,  78, 216]],
  [0.33, [ 32, 164, 214]],
  [0.66, [242, 201,  76]],
  [1.00, [224,  58,  58]],
] as const;

function tempColor(t: number): string {
  const v = Math.max(0, Math.min(1, t));
  let lo: Stop = TEMP_STOPS[0];
  let hi: Stop = TEMP_STOPS[TEMP_STOPS.length - 1];
  for (let i = 0; i < TEMP_STOPS.length - 1; i++) {
    if (v >= TEMP_STOPS[i][0] && v <= TEMP_STOPS[i + 1][0]) {
      lo = TEMP_STOPS[i]; hi = TEMP_STOPS[i + 1]; break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const k = (v - lo[0]) / span;
  const r = Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * k);
  const g = Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * k);
  const b = Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * k);
  return `rgb(${r},${g},${b})`;
}

//---- Component --------------------------------------------------------

export default function FootAngiosomeDiagram({ left, right, asymmetry }: Props) {
  const { colors } = useTheme();

  //Bilateral min/max for relative coloring.
  const { vmin, vmax } = useMemo(() => {
    const vals: number[] = [];
    for (const r of [left, right]) {
      if (!r) continue;
      for (const k of REGION_KEYS) {
        const v = Number(r[k]);
        if (Number.isFinite(v)) vals.push(v);
      }
    }
    if (vals.length === 0) return { vmin: 25, vmax: 35 };
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    return hi - lo < 0.1 ? { vmin: lo - 0.5, vmax: lo + 0.5 } : { vmin: lo, vmax: hi };
  }, [left, right]);

  const threshold = asymmetry?.threshold_used ?? 2.2;
  const flagged   = useMemo(() => {
    const s = new Set<RegionKey>();
    const ra = asymmetry?.region_asymmetry;
    if (!ra) return s;
    for (const k of REGION_KEYS) {
      if (Number(ra[k]) >= threshold) s.add(k);
    }
    return s;
  }, [asymmetry, threshold]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textSec }]}>ANGIOSOME MAP</Text>
        <Text style={[styles.range, { color: colors.textSec }]}>
          {vmin.toFixed(1)}–{vmax.toFixed(1)} °C
        </Text>
      </View>

      <View style={styles.feetRow}>
        <FootSvg
          id="left"
          label="LEFT"
          regions={left}
          flagged={flagged}
          mirrored
          vmin={vmin}
          vmax={vmax}
          colors={colors}
        />
        <FootSvg
          id="right"
          label="RIGHT"
          regions={right}
          flagged={flagged}
          vmin={vmin}
          vmax={vmax}
          colors={colors}
        />
      </View>

      {/* Color legend */}
      <View style={styles.legendBox}>
        <View style={styles.legendBar}>
          {Array.from({ length: 24 }).map((_, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: tempColor(i / 23) }} />
          ))}
        </View>
        <View style={styles.legendLabels}>
          <Text style={[styles.legendText, { color: colors.textSec }]}>{vmin.toFixed(1)}°C</Text>
          <Text style={[styles.legendText, { color: colors.textSec }]}>{vmax.toFixed(1)}°C</Text>
        </View>
      </View>

      {flagged.size > 0 ? (
        <Text style={[styles.flagHint, { color: colors.error }]}>
          ! marker = |L − R| ≥ {threshold.toFixed(1)} °C in that angiosome
        </Text>
      ) : null}
    </View>
  );
}

function FootSvg({
  id, label, regions, flagged, mirrored, vmin, vmax, colors,
}: {
  id: string;
  label: "LEFT" | "RIGHT";
  regions: RegionMeans | null | undefined;
  flagged: Set<RegionKey>;
  mirrored?: boolean;
  vmin: number;
  vmax: number;
  colors: ThemeColors;
}) {
  const t = (v: number | undefined) =>
    v == null || vmax === vmin ? 0.5 : (v - vmin) / (vmax - vmin);

  const fill = (key: RegionKey): string =>
    regions ? tempColor(t(Number(regions[key]))) : `${colors.textSec}30`;

  const valText = (key: RegionKey): string =>
    regions && Number.isFinite(Number(regions[key]))
      ? `${Number(regions[key]).toFixed(1)}°`
      : "—";

  //Centroid of each quadrant (local SVG coords). Used for label placement.
  const labelXY = (key: RegionKey) => {
    const q = QUADS[key];
    return { x: q.x + q.w / 2, y: q.y + q.h / 2 };
  };

  //Mirroring is applied to the entire <G> so labels remain readable
  //(otherwise text would render flipped). We render the SVG twice when
  //mirrored: once for the clipped colored shape (mirrored), once for the
  //labels (un-mirrored, but at mirrored coordinates).
  const mirrorTransform = mirrored ? `translate(${VIEW_W},0) scale(-1,1)` : undefined;

  //Compute label coords as they appear AFTER mirroring (so text stays
  //right-side-up and lands in the same visual position as the polygon).
  const labelPos = (key: RegionKey) => {
    const c = labelXY(key);
    return mirrored ? { x: VIEW_W - c.x, y: c.y } : c;
  };

  const clipId = `foot-clip-${id}`;

  return (
    <View style={styles.footWrap}>
      <Text style={[styles.footLabel, { color: colors.text }]}>{label}</Text>
      <Svg width={VIEW_W} height={VIEW_H} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={FOOT_PATH} />
          </ClipPath>
        </Defs>

        {/* Colored angiosome quadrants, clipped to the foot silhouette. */}
        <G transform={mirrorTransform} clipPath={`url(#${clipId})`}>
          <Rect {...QUADS.MPA} fill={fill("MPA")} />
          <Rect {...QUADS.LPA} fill={fill("LPA")} />
          <Rect {...QUADS.MCA} fill={fill("MCA")} />
          <Rect {...QUADS.LCA} fill={fill("LCA")} />

          {/* Region division lines + box border. */}
          <Path
            d={`M ${ANGIO_BOX.x + ANGIO_BOX.w * W_SPLIT} ${ANGIO_BOX.y} V ${ANGIO_BOX.y + ANGIO_BOX.h}`}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={0.8}
            strokeDasharray="3 3"
          />
          <Path
            d={`M ${ANGIO_BOX.x} ${ANGIO_BOX.y + ANGIO_BOX.h * H_SPLIT} H ${ANGIO_BOX.x + ANGIO_BOX.w}`}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={0.8}
            strokeDasharray="3 3"
          />
        </G>

        {/* Foot outline drawn on top, also under mirror so the silhouette flips. */}
        <G transform={mirrorTransform}>
          <Path d={FOOT_PATH} fill="none" stroke={colors.text} strokeWidth={1.5} />
        </G>

        {/* Labels — drawn AFTER mirroring (in screen coords) so text stays upright. */}
        {REGION_KEYS.map((key) => {
          const p = labelPos(key);
          const isFlagged = flagged.has(key);
          return (
            <G key={key}>
              <SvgText
                x={p.x}
                y={p.y - 4}
                fontSize={9}
                fontWeight="bold"
                fill="#fff"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={0.5}
                textAnchor="middle"
              >
                {key}{isFlagged ? " !" : ""}
              </SvgText>
              <SvgText
                x={p.x}
                y={p.y + 9}
                fontSize={11}
                fontWeight="bold"
                fill="#fff"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth={0.5}
                textAnchor="middle"
              >
                {valText(key)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: {
    fontSize: 10, fontFamily: Typography.fonts.label,
    letterSpacing: 1.5, textTransform: "uppercase",
  },
  range: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono },

  feetRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  footWrap:  { alignItems: "center", gap: 4 },
  footLabel: {
    fontSize: 10, fontFamily: Typography.fonts.label,
    letterSpacing: 1.5, textTransform: "uppercase",
  },

  legendBox: { gap: 2, marginTop: 4 },
  legendBar: {
    flexDirection: "row", height: 8,
    borderRadius: 4, overflow: "hidden",
  },
  legendLabels: { flexDirection: "row", justifyContent: "space-between" },
  legendText:   { fontSize: 9, fontFamily: Typography.fonts.mono },

  flagHint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
  },
});
