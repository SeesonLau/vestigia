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
import { Image, StyleSheet, Text, View } from "react-native";
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
import { ANGIO_BOX_NORM, FOOT_PLANTAR_LEFT, FOOT_PLANTAR_RIGHT } from "./footAsset";

interface Props {
  left:  RegionMeans | null | undefined;
  right: RegionMeans | null | undefined;
  asymmetry?: AsymmetryResult | null;
}

//---- Geometry ---------------------------------------------------------
//SVG viewBox dimensions. The actual rendered size is driven by the
//parent's flex layout (each foot gets half the row, square aspect),
//but the viewBox stays fixed so all the quadrant / label coordinates
//below are stable regardless of the on-screen size.
const VIEW_W = 200;
const VIEW_H = 200;

//5 toes at the top of the canvas. Each toe is a tapered "tear-drop"
//path so it looks like a real toe (rounded tip, narrower base) rather
//than an ellipse. The big toe is largest and sits on the medial side
//(LEFT of canvas). Subsequent toes shrink and step down + outward.
//Each entry is the toe's path "d" attribute drawn relative to the
//canonical right-foot canvas (mirrored for the left foot).
const TOES: { d: string; labelXY: { x: number; y: number } }[] = [
  // Big toe — rounded oblong, slight medial bulge. Tip at top.
  { d: "M 14 6 C 4 6, 0 22, 4 36 C 6 46, 28 46, 30 36 C 32 22, 26 6, 14 6 Z",
    labelXY: { x: 16, y: 26 } },
  // 2nd toe — slightly tilted, tapered tip.
  { d: "M 38 12 C 30 12, 28 26, 32 38 C 34 46, 46 46, 46 38 C 48 26, 46 12, 38 12 Z",
    labelXY: { x: 38, y: 30 } },
  // 3rd toe.
  { d: "M 56 18 C 49 18, 48 30, 51 40 C 53 47, 62 47, 62 40 C 64 30, 62 18, 56 18 Z",
    labelXY: { x: 56, y: 33 } },
  // 4th toe.
  { d: "M 72 22 C 66 22, 66 32, 68 42 C 70 48, 77 48, 77 42 C 78 32, 77 22, 72 22 Z",
    labelXY: { x: 72, y: 36 } },
  // Pinky.
  { d: "M 86 26 C 81 26, 81 35, 82 44 C 84 50, 90 50, 90 44 C 91 35, 90 26, 86 26 Z",
    labelXY: { x: 86, y: 39 } },
];

//Main foot body — from just under the toes down through the ball, arch,
//and heel. Tuned for plausible plantar proportions: ball widest, arch
//narrower with medial bulge (the "foot print" indent on the lateral
//side), heel rounded.
const BODY_PATH = [
  // Top edge — gentle valleys lining up under each toe gap.
  "M 4 56",
  "Q 8 48, 18 50",     // under big toe
  "Q 24 54, 34 50",    // toe-1/2 gap
  "Q 42 56, 50 52",    // toe-2/3 gap
  "Q 58 58, 66 54",    // toe-3/4 gap
  "Q 76 60, 86 58",    // toe-4/pinky gap
  "Q 96 60, 102 64",
  "Q 110 72, 112 86",  // forefoot lateral upper
  // Lateral side down.
  "C 116 110, 118 138, 112 162",
  // Lateral arch indent (the classic footprint cut-in).
  "C 110 178, 108 188, 106 200",
  // Heel lateral side.
  "C 108 226, 108 262, 92 282",
  "C 80 296, 60 296, 56 296",
  "C 52 296, 30 296, 18 282",
  // Heel medial side back up.
  "C 2 262, 2 226, 4 200",
  // Medial arch — slight bulge inward, less indented than lateral.
  "C 6 188, 4 178, 2 162",
  "C -4 138, -2 110, 2 86",
  "Q 4 72, 4 56",
  "Z",
].join(" ");

//Subtle decorative arch line on the lateral side, gives the silhouette
//some "footprint" character without adding fake toe-print details.
const ARCH_LINE = "M 108 168 C 90 178, 80 192, 86 218";

//Bounding box of the four-angiosome region inside the body.
const ANGIO_BOX = { x: 4, y: 66, w: 108, h: 220 } as const;

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
          image={FOOT_PLANTAR_LEFT}
          vmin={vmin} vmax={vmax} colors={colors}
        />
        <FootSvg
          id="right" label="RIGHT" regions={right} flagged={flagged}
          image={FOOT_PLANTAR_RIGHT}
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
  id, label, regions, flagged, mirrored, image, vmin, vmax, colors,
}: {
  id: string;
  label: "LEFT" | "RIGHT";
  regions: RegionMeans | null | undefined;
  flagged: Set<RegionKey>;
  /** Mirror the SVG quadrants + labels (canvas-internal medial/lateral
   *  flip). Does NOT mirror the image — supply already-correct L/R
   *  illustrations via `image` instead. */
  mirrored?: boolean;
  image?: import("react-native").ImageSourcePropType | null;
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

  //---- Image-backed mode -----------------------------------------------
  //If a foot illustration was supplied via the `image` prop, render it
  //as the background and overlay the four colored quadrants (translucent)
  //plus labels. Quadrant coordinates come from ANGIO_BOX_NORM in
  //image-relative [0..1] space and are mapped onto the canvas size.
  //
  //Image is NOT mirrored -- callers pass per-side drawings (L vs R), so
  //each foot's image already has the correct medial/lateral orientation.
  //The SVG overlay still respects the `mirrored` flag because the
  //quadrant labels need to flip so MPA always lands on the medial side.
  if (image) {
    const boxX = ANGIO_BOX_NORM.x * VIEW_W;
    const boxY = ANGIO_BOX_NORM.y * VIEW_H;
    const boxW = ANGIO_BOX_NORM.w * VIEW_W;
    const boxH = ANGIO_BOX_NORM.h * VIEW_H;

    const imgQuads: Record<RegionKey, QuadRect> = {
      MPA: { x: boxX,                           y: boxY,                          w: boxW * W_SPLIT,       h: boxH * H_SPLIT       },
      LPA: { x: boxX + boxW * W_SPLIT,          y: boxY,                          w: boxW * (1 - W_SPLIT), h: boxH * H_SPLIT       },
      MCA: { x: boxX,                           y: boxY + boxH * H_SPLIT,         w: boxW * W_SPLIT,       h: boxH * (1 - H_SPLIT) },
      LCA: { x: boxX + boxW * W_SPLIT,          y: boxY + boxH * H_SPLIT,         w: boxW * (1 - W_SPLIT), h: boxH * (1 - H_SPLIT) },
    };

    const imgLabel = (key: RegionKey) => {
      const q = imgQuads[key];
      const c = { x: q.x + q.w / 2, y: q.y + q.h / 2 };
      return mirrored ? { x: VIEW_W - c.x, y: c.y } : c;
    };

    return (
      <View style={styles.footWrap}>
        <Text style={[styles.footLabel, { color: colors.text }]}>{label}</Text>
        <FootImageBox
          image={image}
          mirrorTransform={mirrorTransform}
          imgQuads={imgQuads}
          boxX={boxX} boxY={boxY} boxW={boxW} boxH={boxH}
          flagged={flagged}
          fill={fill}
          valText={valText}
          imgLabel={imgLabel}
        />
      </View>
    );
  }

  //---- SVG-only fallback ----------------------------------------------
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
            <Path
              key={i}
              d={toe.d}
              fill={toeFill}
              stroke={stroke}
              strokeWidth={1.4}
            />
          ))}

          {/* Body base fill — guarantees the foot has presence even on
              platforms where the clipped quadrants render faintly. */}
          <Path d={BODY_PATH} fill={toeFill} opacity={0.35} />

          {/* Subtle arch indent line on the lateral side. */}
          <Path
            d={ARCH_LINE}
            fill="none"
            stroke="rgba(0,0,0,0.18)"
            strokeWidth={1}
          />


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

//Self-contained square box: image fills it edge-to-edge under
//resizeMode="contain", SVG overlay sits on top at full size with a
//fixed viewBox so the quadrant coordinates stay stable as the box
//resizes. Width comes from the parent's flex layout; height matches
//via aspectRatio: 1.
function FootImageBox({
  image, mirrorTransform, imgQuads,
  boxX, boxY, boxW, boxH, flagged, fill, valText, imgLabel,
}: {
  image: import("react-native").ImageSourcePropType;
  mirrorTransform: string | undefined;
  imgQuads: Record<RegionKey, QuadRect>;
  boxX: number; boxY: number; boxW: number; boxH: number;
  flagged: Set<RegionKey>;
  fill: (k: RegionKey) => string;
  valText: (k: RegionKey) => string;
  imgLabel: (k: RegionKey) => { x: number; y: number };
}) {
  return (
    <View style={styles.imageBox}>
      <Image
        source={image}
        resizeMode="contain"
        style={StyleSheet.absoluteFillObject}
      />
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={StyleSheet.absoluteFillObject}
      >
        {/* Translucent colored quadrants over the image. */}
        <G transform={mirrorTransform} opacity={0.55}>
          <Rect {...imgQuads.MPA} fill={fill("MPA")} />
          <Rect {...imgQuads.LPA} fill={fill("LPA")} />
          <Rect {...imgQuads.MCA} fill={fill("MCA")} />
          <Rect {...imgQuads.LCA} fill={fill("LCA")} />

          {/* Dashed division lines. */}
          <Path
            d={`M ${boxX + boxW * W_SPLIT} ${boxY} V ${boxY + boxH}`}
            stroke="rgba(0,0,0,0.55)" strokeWidth={1} strokeDasharray="3 3"
          />
          <Path
            d={`M ${boxX} ${boxY + boxH * H_SPLIT} H ${boxX + boxW}`}
            stroke="rgba(0,0,0,0.55)" strokeWidth={1} strokeDasharray="3 3"
          />
        </G>

        {/* Labels — outside the mirror transform so text stays upright. */}
        {REGION_KEYS.map((key) => {
          const p = imgLabel(key);
          const isFlagged = flagged.has(key);
          return (
            <G key={key}>
              <SvgText
                x={p.x} y={p.y - 5}
                fontSize={9} fontWeight="bold"
                fill="#fff" stroke="rgba(0,0,0,0.7)" strokeWidth={0.6}
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
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  footWrap: {
    flex: 1,
    alignItems: "stretch",
    gap: 4,
  },
  footLabel: {
    fontSize: 10, fontFamily: Typography.fonts.label,
    letterSpacing: 1.5, textTransform: "uppercase",
    textAlign: "center",
  },
  imageBox: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
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
