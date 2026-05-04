// components/thermal/FootAngiosomeDiagram.tsx
//Stylised plantar-foot diagram with the four angiosome regions colored
//by temperature. Two diagrams (left + right) sit side by side; per-region
//°C values appear in each polygon and a shared thermal scale below
//indicates the color mapping. Region borders go red when their
//|L − R| asymmetry exceeds the API's threshold.

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { useTheme } from "../../constants/ThemeContext";
import { Spacing, Typography } from "../../constants/theme";
import type { ThemeColors } from "../../constants/theme";
import type { AsymmetryResult, RegionMeans } from "../../lib/dpnApi";

interface Props {
  left:  RegionMeans | null | undefined;
  right: RegionMeans | null | undefined;
  asymmetry?: AsymmetryResult | null;
}

const VIEW_W = 110;
const VIEW_H = 240;

//Foot outline plus interior dividing lines. The toes are at the top, heel
//at the bottom. The lateral edge is on the OUTSIDE of each foot (so the
//left foot's lateral edge is on the screen-left, and vice versa). We draw
//one canonical "right foot" oriented this way and mirror it horizontally
//for the left foot via SVG transform.
//
//Polygon points are in canvas coords (origin top-left). The four
//angiosomes sit in the lower-3/4 of the foot; the toe pad is purely
//decorative outline.

const TOE_TOP    = 6;     //y where the foot starts (top of toe pad)
const FOREFOOT_Y = 64;    //y where toes meet plantar arch
const ARCH_Y     = 138;   //horizontal split between plantar (above) and calcaneal (below)
const HEEL_Y     = 226;   //y at heel bottom
const MEDIAL_X   = 55;    //x of the vertical medial/lateral split (canvas center)
const LAT_LEFT_X = 14;    //lateral foot edge (left side of canvas)
const MED_RIGHT_X= 96;    //medial foot edge (right side of canvas)

//Foot outline path -- toe pad rounded oval merged into a tapered sole.
const FOOT_OUTLINE = `
  M ${MEDIAL_X} ${TOE_TOP}
  C 25 ${TOE_TOP}, ${LAT_LEFT_X} ${FOREFOOT_Y - 14}, ${LAT_LEFT_X} ${FOREFOOT_Y}
  L 18 ${ARCH_Y}
  C 18 ${ARCH_Y + 30}, 22 ${HEEL_Y}, ${MEDIAL_X} ${HEEL_Y}
  C ${VIEW_W - 22} ${HEEL_Y}, ${VIEW_W - 18} ${ARCH_Y + 30}, ${VIEW_W - 18} ${ARCH_Y}
  L ${MED_RIGHT_X} ${FOREFOOT_Y}
  C ${MED_RIGHT_X} ${FOREFOOT_Y - 14}, ${VIEW_W - 25} ${TOE_TOP}, ${MEDIAL_X} ${TOE_TOP}
  Z
`;

//Polygon paths for each angiosome region. They tile the lower portion
//of the foot outline (forefoot + heel) without escaping it. Strokes use
//the same outline color so the regions read as parts of the foot.
const PATH_LPA = `
  M ${LAT_LEFT_X + 4} ${FOREFOOT_Y}
  L ${MEDIAL_X}       ${FOREFOOT_Y}
  L ${MEDIAL_X}       ${ARCH_Y}
  L ${LAT_LEFT_X + 1} ${ARCH_Y}
  Z
`;
const PATH_MPA = `
  M ${MEDIAL_X}        ${FOREFOOT_Y}
  L ${MED_RIGHT_X - 4} ${FOREFOOT_Y}
  L ${VIEW_W - 19}     ${ARCH_Y}
  L ${MEDIAL_X}        ${ARCH_Y}
  Z
`;
const PATH_LCA = `
  M ${LAT_LEFT_X + 1} ${ARCH_Y}
  L ${MEDIAL_X}       ${ARCH_Y}
  L ${MEDIAL_X}       ${HEEL_Y - 1}
  C 25 ${HEEL_Y - 1}, 19 ${ARCH_Y + 30}, ${LAT_LEFT_X + 4} ${ARCH_Y}
  Z
`;
const PATH_MCA = `
  M ${MEDIAL_X}    ${ARCH_Y}
  L ${VIEW_W - 19} ${ARCH_Y}
  C ${VIEW_W - 19} ${ARCH_Y + 30}, ${VIEW_W - 25} ${HEEL_Y - 1}, ${MEDIAL_X} ${HEEL_Y - 1}
  Z
`;

//Centroid for the °C label inside each region (eyeballed for legibility).
const LABEL_LPA = { x: (LAT_LEFT_X + MEDIAL_X) / 2 - 1, y: (FOREFOOT_Y + ARCH_Y) / 2 };
const LABEL_MPA = { x: (MEDIAL_X + MED_RIGHT_X) / 2,    y: (FOREFOOT_Y + ARCH_Y) / 2 };
const LABEL_LCA = { x: (LAT_LEFT_X + MEDIAL_X) / 2 - 1, y: (ARCH_Y + HEEL_Y) / 2 };
const LABEL_MCA = { x: (MEDIAL_X + MED_RIGHT_X) / 2,    y: (ARCH_Y + HEEL_Y) / 2 };

const REGION_KEYS = ["MPA", "LPA", "MCA", "LCA"] as const;
type RegionKey = typeof REGION_KEYS[number];

//Thermal-palette interpolation: maps t∈[0..1] to a blue→cyan→yellow→red ramp.
type Stop = readonly [number, readonly [number, number, number]];
const TEMP_STOPS: readonly Stop[] = [
  //Blue (cool) → cyan → yellow → red (warm)
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

export default function FootAngiosomeDiagram({ left, right, asymmetry }: Props) {
  const { colors } = useTheme();

  //Compute the bilateral min/max across all 8 region values so colors are
  //relative to the patient's own range (more useful than a fixed scale).
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
    //Avoid div-by-zero when all eight values are identical.
    return hi - lo < 0.1 ? { vmin: lo - 0.5, vmax: lo + 0.5 } : { vmin: lo, vmax: hi };
  }, [left, right]);

  //Asymmetry threshold for highlighting — uses the API value, fallback 2.2°C.
  const threshold  = asymmetry?.threshold_used ?? 2.2;
  const flagged    = useMemo(() => {
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
          label="LEFT"
          regions={left}
          flagged={flagged}
          mirrored
          vmin={vmin}
          vmax={vmax}
          colors={colors}
        />
        <FootSvg
          label="RIGHT"
          regions={right}
          flagged={flagged}
          vmin={vmin}
          vmax={vmax}
          colors={colors}
        />
      </View>

      {/* Legend strip — same gradient stops as tempColor(). */}
      <View style={styles.legendBox}>
        <View style={styles.legendBar}>
          {Array.from({ length: 24 }).map((_, i) => (
            <View
              key={i}
              style={{ flex: 1, backgroundColor: tempColor(i / 23) }}
            />
          ))}
        </View>
        <View style={styles.legendLabels}>
          <Text style={[styles.legendText, { color: colors.textSec }]}>{vmin.toFixed(1)}°C</Text>
          <Text style={[styles.legendText, { color: colors.textSec }]}>{vmax.toFixed(1)}°C</Text>
        </View>
      </View>

      {flagged.size > 0 ? (
        <Text style={[styles.flagHint, { color: colors.error }]}>
          Red border = |L − R| ≥ {threshold.toFixed(1)} °C in that angiosome
        </Text>
      ) : null}
    </View>
  );
}

function FootSvg({
  label, regions, flagged, mirrored, vmin, vmax, colors,
}: {
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

  const fill = (key: RegionKey) =>
    regions ? tempColor(t(Number(regions[key]))) : `${colors.textSec}30`;
  const stroke = (key: RegionKey) =>
    flagged.has(key) ? colors.error : colors.border;
  const strokeW = (key: RegionKey) => (flagged.has(key) ? 2 : 1);
  const valText = (key: RegionKey) =>
    regions && Number.isFinite(Number(regions[key]))
      ? `${Number(regions[key]).toFixed(1)}°`
      : "—";

  return (
    <View style={styles.footWrap}>
      <Text style={[styles.footLabel, { color: colors.text }]}>{label}</Text>
      <Svg width={VIEW_W} height={VIEW_H} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <G transform={mirrored ? `translate(${VIEW_W},0) scale(-1,1)` : undefined}>
          {/* Foot outline */}
          <Path d={FOOT_OUTLINE} fill={`${colors.surface}`} stroke={colors.border} strokeWidth={1.2} />

          {/* Region polygons */}
          <Path d={PATH_LPA} fill={fill("LPA")} stroke={stroke("LPA")} strokeWidth={strokeW("LPA")} />
          <Path d={PATH_MPA} fill={fill("MPA")} stroke={stroke("MPA")} strokeWidth={strokeW("MPA")} />
          <Path d={PATH_LCA} fill={fill("LCA")} stroke={stroke("LCA")} strokeWidth={strokeW("LCA")} />
          <Path d={PATH_MCA} fill={fill("MCA")} stroke={stroke("MCA")} strokeWidth={strokeW("MCA")} />

          {/* Region codes (small) */}
          <SvgText x={LABEL_LPA.x} y={LABEL_LPA.y - 6} fontSize={8}  fontWeight="bold" fill="#fff" textAnchor="middle">LPA</SvgText>
          <SvgText x={LABEL_MPA.x} y={LABEL_MPA.y - 6} fontSize={8}  fontWeight="bold" fill="#fff" textAnchor="middle">MPA</SvgText>
          <SvgText x={LABEL_LCA.x} y={LABEL_LCA.y - 6} fontSize={8}  fontWeight="bold" fill="#fff" textAnchor="middle">LCA</SvgText>
          <SvgText x={LABEL_MCA.x} y={LABEL_MCA.y - 6} fontSize={8}  fontWeight="bold" fill="#fff" textAnchor="middle">MCA</SvgText>

          {/* °C value (larger) */}
          <SvgText x={LABEL_LPA.x} y={LABEL_LPA.y + 7} fontSize={11} fontWeight="bold" fill="#fff" textAnchor="middle">{valText("LPA")}</SvgText>
          <SvgText x={LABEL_MPA.x} y={LABEL_MPA.y + 7} fontSize={11} fontWeight="bold" fill="#fff" textAnchor="middle">{valText("MPA")}</SvgText>
          <SvgText x={LABEL_LCA.x} y={LABEL_LCA.y + 7} fontSize={11} fontWeight="bold" fill="#fff" textAnchor="middle">{valText("LCA")}</SvgText>
          <SvgText x={LABEL_MCA.x} y={LABEL_MCA.y + 7} fontSize={11} fontWeight="bold" fill="#fff" textAnchor="middle">{valText("MCA")}</SvgText>
        </G>
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
