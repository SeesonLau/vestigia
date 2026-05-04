// components/thermal/FootAngiosomeDiagram.tsx
//Bilateral plantar-foot diagram with the four angiosome regions colored
//by temperature. Geometry follows Hernandez-Contreras 2019:
//  - bounding box of the angiosome region (foot body excluding the toes)
//  - W split 35% medial / 65% lateral
//  - H split 60% upper (forefoot+midfoot) / 40% lower (heel)
//
//The foot is composed as
//   5 toe ellipses (big toe largest, sized down toward pinky)
// + a main-body path (forefoot ball, arch, heel)
//and the four angiosome quadrants are drawn as filled rectangles clipped
//to the body path so each region takes the foot's natural silhouette.
//Medial side renders on the LEFT of the canvas; the LEFT foot mirrors
//the canonical right-foot drawing.

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
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
const VIEW_W = 120;
const VIEW_H = 300;

//5 toes at the top of the canvas. Big toe is largest and sits on the
//medial side (LEFT of the canvas). Each subsequent toe gets smaller and
//is shifted right + down to follow the natural toe-line curve.
interface Toe { cx: number; cy: number; rx: number; ry: number }
const TOES: Toe[] = [
  { cx: 16, cy: 22, rx: 13, ry: 19 }, // big toe
  { cx: 38, cy: 28, rx:  9, ry: 16 }, // 2nd
  { cx: 56, cy: 34, rx:  8, ry: 14 }, // 3rd
  { cx: 72, cy: 38, rx:  7, ry: 12 }, // 4th
  { cx: 86, cy: 42, rx:  6, ry: 11 }, // pinky
];

//Main foot body, from just under the toes (y ~ 50) to the heel (y ~ 285).
//Subtle scalloping along the top so the toes attach naturally; widest at
//the ball, narrowed arch with a medial bulge, rounded heel.
const BODY_PATH = [
  // Top edge — five gentle valleys lining up roughly with toe gaps.
  "M 6 60",
  "Q 12 52, 22 56",   // under big toe
  "Q 30 60, 38 56",   // under 2nd toe
  "Q 46 62, 54 58",   // under 3rd toe
  "Q 62 64, 70 60",   // under 4th toe
  "Q 80 66, 90 62",   // under pinky
  "Q 102 60, 106 70",
  // Lateral side down to heel.
  "C 114 92, 116 124, 110 152",
  "C 106 178, 106 208, 110 234",
  "C 110 274, 84 296, 60 294",
  // Medial side back up.
  "C 36 296, 10 274, 10 234",
  "C 14 208, 14 178, 10 152",
  "C 4 124, 6 92, 6 60",
  "Z",
].join(" ");

//Bounding box of the four-angiosome region inside the body. Tuned to
//BODY_PATH (excludes toes above; clips just inside the heel curve below).
const ANGIO_BOX = { x: 6, y: 64, w: 110, h: 218 } as const;

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
  //Punchier palette so subtle temperature differences read at a glance.
  [0.00, [ 30,  90, 220]],   // deep blue
  [0.25, [ 50, 180, 230]],   // cyan
  [0.50, [120, 210, 120]],   // green
  [0.75, [245, 200,  60]],   // amber
  [1.00, [220,  50,  40]],   // red
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
          id="left"  label="LEFT"  regions={left}  flagged={flagged} mirrored
          vmin={vmin} vmax={vmax} colors={colors}
        />
        <FootSvg
          id="right" label="RIGHT" regions={right} flagged={flagged}
          vmin={vmin} vmax={vmax} colors={colors}
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
    regions ? tempColor(t(Number(regions[key]))) : `${colors.textSec}40`;

  const valText = (key: RegionKey): string =>
    regions && Number.isFinite(Number(regions[key]))
      ? `${Number(regions[key]).toFixed(1)}°`
      : "—";

  //Toe color — use the average of the upper-region temps (MPA + LPA) so
  //the toe pads visually match the warmth of the forefoot below them.
  const toeFill = useMemo(() => {
    if (!regions) return `${colors.textSec}40`;
    const mpa = Number(regions.MPA);
    const lpa = Number(regions.LPA);
    const valid = [mpa, lpa].filter((n) => Number.isFinite(n));
    if (valid.length === 0) return `${colors.textSec}40`;
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    return tempColor(t(avg));
  }, [regions, colors.textSec, t]);

  //Centroid of each quadrant in canonical (right-foot) coords.
  const labelXY = (key: RegionKey) => {
    const q = QUADS[key];
    return { x: q.x + q.w / 2, y: q.y + q.h / 2 };
  };

  //Mirroring is applied to the full silhouette + clipped region; labels
  //are drawn AFTER mirroring (in screen coords) so text stays upright.
  const mirrorTransform = mirrored ? `translate(${VIEW_W},0) scale(-1,1)` : undefined;
  const labelPos = (key: RegionKey) => {
    const c = labelXY(key);
    return mirrored ? { x: VIEW_W - c.x, y: c.y } : c;
  };

  const clipId = `foot-clip-${id}`;
  const stroke = colors.text;

  return (
    <View style={styles.footWrap}>
      <Text style={[styles.footLabel, { color: colors.text }]}>{label}</Text>
      <Svg width={VIEW_W} height={VIEW_H} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={BODY_PATH} />
          </ClipPath>
        </Defs>

        <G transform={mirrorTransform}>
          {/* Toes — drawn first so the body overlaps their lower edge. */}
          {TOES.map((toe, i) => (
            <Ellipse
              key={i}
              cx={toe.cx}
              cy={toe.cy}
              rx={toe.rx}
              ry={toe.ry}
              fill={toeFill}
              stroke={stroke}
              strokeWidth={1.4}
            />
          ))}

          {/* Body base fill — guarantees the foot has presence even on
              platforms where the clipped quadrants render faintly. */}
          <Path d={BODY_PATH} fill={toeFill} opacity={0.35} />

          {/* Colored angiosome quadrants, clipped to the body silhouette. */}
          <G clipPath={`url(#${clipId})`}>
            <Rect {...QUADS.MPA} fill={fill("MPA")} />
            <Rect {...QUADS.LPA} fill={fill("LPA")} />
            <Rect {...QUADS.MCA} fill={fill("MCA")} />
            <Rect {...QUADS.LCA} fill={fill("LCA")} />

            {/* Subtle dashed division lines along the 35 / 60 splits. */}
            <Path
              d={`M ${ANGIO_BOX.x + ANGIO_BOX.w * W_SPLIT} ${ANGIO_BOX.y} V ${ANGIO_BOX.y + ANGIO_BOX.h}`}
              stroke="rgba(0,0,0,0.40)"
              strokeWidth={0.9}
              strokeDasharray="3 3"
            />
            <Path
              d={`M ${ANGIO_BOX.x} ${ANGIO_BOX.y + ANGIO_BOX.h * H_SPLIT} H ${ANGIO_BOX.x + ANGIO_BOX.w}`}
              stroke="rgba(0,0,0,0.40)"
              strokeWidth={0.9}
              strokeDasharray="3 3"
            />
          </G>

          {/* Body outline drawn on top of the colored fill. */}
          <Path d={BODY_PATH} fill="none" stroke={stroke} strokeWidth={1.6} />
        </G>

        {/* Labels — outside the mirror transform so they stay upright. */}
        {REGION_KEYS.map((key) => {
          const p = labelPos(key);
          const isFlagged = flagged.has(key);
          return (
            <G key={key}>
              <SvgText
                x={p.x} y={p.y - 5}
                fontSize={9} fontWeight="bold"
                fill="#fff" stroke="rgba(0,0,0,0.6)" strokeWidth={0.6}
                textAnchor="middle"
              >
                {key}{isFlagged ? " !" : ""}
              </SvgText>
              <SvgText
                x={p.x} y={p.y + 9}
                fontSize={11} fontWeight="bold"
                fill="#fff" stroke="rgba(0,0,0,0.7)" strokeWidth={0.6}
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
