// components/thermal/DpnResultView.tsx
//Renders the full DPN scan result returned by the FastAPI endpoint
///predict/patient/mobile. Used by both the standalone bundle assessment
//screen and the import-capture screen.

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import type { ThemeColors } from "../../constants/theme";
import type {
  AsymmetryResult,
  DPNScanResponse,
  FootResult,
  RegionMeans,
} from "../../lib/dpnApi";
import FootAngiosomeDiagram from "./FootAngiosomeDiagram";

interface Props { result: DPNScanResponse }

const ANGIOSOMES: (keyof RegionMeans)[] = ["MPA", "LPA", "MCA", "LCA"];
const ANGIOSOME_LABELS: Record<keyof RegionMeans, string> = {
  MPA: "Medial Plantar",
  LPA: "Lateral Plantar",
  MCA: "Medial Calcaneal",
  LCA: "Lateral Calcaneal",
};

export default function DpnResultView({ result }: Props) {
  const { colors } = useTheme();

  //Rejection: API returns success=false and is_valid_foot=false with reason.
  if (result.success === false || result.is_valid_foot === false) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: `${colors.warning}66` }]}>
        <View style={[styles.iconBubble, { backgroundColor: `${colors.warning}1A` }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.warning} />
        </View>
        <Text style={[styles.verdictTitle, { color: colors.warning }]}>Scan Rejected</Text>
        <Text style={[styles.note, { color: colors.textSec }]}>
          {result.rejection_reason ?? "The image did not pass foot validation."}
        </Text>
        {result.diagnosis_factors?.length ? (
          <View style={styles.factors}>
            {result.diagnosis_factors.map((f, i) => (
              <Text key={i} style={[styles.factorItem, { color: colors.text }]}>• {f}</Text>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  const isPositive = result.is_diabetic;
  const verdictColor = isPositive ? colors.error : colors.success;

  return (
    <View style={{ gap: Spacing.md }}>
      {/* Verdict */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: `${verdictColor}66` }]}>
        <View style={[styles.iconBubble, { backgroundColor: `${verdictColor}1A` }]}>
          <Ionicons
            name={isPositive ? "alert-circle" : "checkmark-circle"}
            size={56}
            color={verdictColor}
          />
        </View>
        <Text style={[styles.verdictTitle, { color: verdictColor }]}>
          DPN {isPositive ? "POSITIVE" : "NEGATIVE"}
        </Text>
        <Text style={[styles.confidence, { color: colors.textSec }]}>
          {result.combined_confidence.toFixed(1)}% confidence · {result.combined_prediction}
        </Text>
      </View>

      {/* Bilateral angiosome diagram — visualizes the four regions of each
          foot colored by temperature so warm/cold differences are obvious
          at a glance. Renders even when only regions are available
          (older bundles without sub-model probabilities still light up). */}
      {(result.left_foot?.regions || result.right_foot?.regions) ? (
        <FootAngiosomeDiagram
          left={result.left_foot?.regions ?? null}
          right={result.right_foot?.regions ?? null}
          asymmetry={result.asymmetry}
        />
      ) : null}

      {/* Per-foot cards */}
      {result.left_foot ? <FootCard label="Left Foot"  foot={result.left_foot}  colors={colors} /> : null}
      {result.right_foot ? <FootCard label="Right Foot" foot={result.right_foot} colors={colors} /> : null}

      {/* Asymmetry */}
      {result.asymmetry ? <AsymmetryCard a={result.asymmetry} colors={colors} /> : null}

      {/* Diagnosis factors */}
      {result.diagnosis_factors?.length ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "stretch" }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSec }]}>Diagnosis Factors</Text>
          {result.diagnosis_factors.map((f, i) => (
            <Text key={i} style={[styles.factorItem, { color: colors.text }]}>• {f}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function FootCard({ label, foot, colors }: { label: string; foot: FootResult; colors: ThemeColors }) {
  const isPositive = foot.is_diabetic;
  const accent = isPositive ? colors.error : colors.success;
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "stretch" }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.textSec }]}>{label.toUpperCase()}</Text>
        <View style={[styles.pill, { backgroundColor: `${accent}1A` }]}>
          <Text style={[styles.pillText, { color: accent }]}>
            {isPositive ? "Positive" : "Negative"}
          </Text>
        </View>
      </View>

      <Text style={[styles.predLine, { color: colors.text }]}>
        {foot.prediction} <Text style={{ color: colors.textSec }}>· {foot.confidence.toFixed(1)}% confidence</Text>
      </Text>

      {/* Probability bar */}
      <ProbBar control={foot.probabilities.Control} diabetic={foot.probabilities.Diabetic} colors={colors} />

      {/* YOLO / sklearn breakdown */}
      {(foot.yolo_probabilities || foot.sklearn_probabilities) ? (
        <View style={styles.subRow}>
          {foot.yolo_probabilities ? (
            <SubModelChip label="Image (YOLO)" probs={foot.yolo_probabilities} colors={colors} />
          ) : null}
          {foot.sklearn_probabilities ? (
            <SubModelChip label="Temp (sklearn)" probs={foot.sklearn_probabilities} colors={colors} />
          ) : null}
        </View>
      ) : null}

      {foot.fusion_method ? (
        <Text style={[styles.metaLine, { color: colors.textSec }]}>
          Fusion: {foot.fusion_method}
        </Text>
      ) : null}

      {/* Region temps */}
      {foot.regions ? <RegionsTable regions={foot.regions} colors={colors} /> : null}
    </View>
  );
}

function ProbBar({ control, diabetic, colors }: { control: number; diabetic: number; colors: ThemeColors }) {
  const total = Math.max(control + diabetic, 1);
  const dPct = (diabetic / total) * 100;
  return (
    <View style={{ gap: 4 }}>
      <View style={[styles.barTrack, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.barFill, { backgroundColor: colors.error, width: `${dPct}%` }]} />
      </View>
      <View style={styles.headerRow}>
        <Text style={[styles.metaLine, { color: colors.success }]}>Control {control.toFixed(1)}%</Text>
        <Text style={[styles.metaLine, { color: colors.error }]}>Diabetic {diabetic.toFixed(1)}%</Text>
      </View>
    </View>
  );
}

function SubModelChip({ label, probs, colors }: {
  label: string;
  probs: { Control: number; Diabetic: number };
  colors: ThemeColors;
}) {
  const winner = probs.Diabetic >= probs.Control ? "Diabetic" : "Control";
  const winnerVal = probs[winner];
  return (
    <View style={[styles.subChip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.subChipLabel, { color: colors.textSec }]}>{label}</Text>
      <Text style={[styles.subChipValue, { color: colors.text }]}>
        {winner} {winnerVal.toFixed(1)}%
      </Text>
    </View>
  );
}

function RegionsTable({ regions, colors }: { regions: RegionMeans; colors: ThemeColors }) {
  return (
    <View style={[styles.regionTable, { borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSec, marginBottom: 4 }]}>Angiosome Mean (°C)</Text>
      <View style={styles.regionRow}>
        {ANGIOSOMES.map((k) => (
          <View key={k} style={styles.regionCell}>
            <Text style={[styles.regionLabel, { color: colors.textSec }]}>{k}</Text>
            <Text style={[styles.regionValue, { color: colors.text }]}>
              {Number(regions[k]).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function AsymmetryCard({ a, colors }: { a: AsymmetryResult; colors: ThemeColors }) {
  const sigColor = a.asymmetry_significant ? colors.error : colors.success;
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "stretch" }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.textSec }]}>Asymmetry</Text>
        <View style={[styles.pill, { backgroundColor: `${sigColor}1A` }]}>
          <Text style={[styles.pillText, { color: sigColor }]}>
            {a.asymmetry_significant ? "Significant" : "Within Range"}
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <Stat label="Mean Δ°C"    value={a.mean_asymmetry.toFixed(2)}        colors={colors} />
        <Stat label="Max Δ°C"     value={a.max_asymmetry.toFixed(2)}         colors={colors} />
        <Stat label="Threshold"   value={`${a.threshold_used.toFixed(2)} °C`} colors={colors} />
        <Stat label="Δ Mean"      value={a.mean_temp_difference.toFixed(2)}  colors={colors} />
        <Stat label="L Mean Temp" value={`${a.left_foot_mean_temp.toFixed(2)} °C`}  colors={colors} />
        <Stat label="R Mean Temp" value={`${a.right_foot_mean_temp.toFixed(2)} °C`} colors={colors} />
      </View>

      {a.region_asymmetry ? (
        <View style={[styles.regionTable, { borderColor: colors.border, marginTop: Spacing.sm }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSec, marginBottom: 4 }]}>
            Per-angiosome |L − R| (°C)
          </Text>
          {ANGIOSOMES.map((k) => {
            const v = a.region_asymmetry?.[k] ?? 0;
            const pct = Math.min((v / Math.max(a.threshold_used, 0.5)) * 100, 100);
            const barColor = v >= a.threshold_used ? colors.error : colors.success;
            return (
              <View key={k} style={styles.regionAsymRow}>
                <Text style={[styles.regionAsymKey, { color: colors.text }]}>{k}</Text>
                <Text style={[styles.regionAsymSub, { color: colors.textSec }]}>{ANGIOSOME_LABELS[k]}</Text>
                <View style={[styles.barTrack, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1, marginHorizontal: Spacing.sm }]}>
                  <View style={[styles.barFill, { backgroundColor: barColor, width: `${pct}%` }]} />
                </View>
                <Text style={[styles.regionAsymVal, { color: colors.text }]}>{Number(v).toFixed(2)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statLabel, { color: colors.textSec }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1, borderRadius: Radius.xl,
    padding: Spacing.lg, alignItems: "center", gap: Spacing.sm,
  },
  iconBubble: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  verdictTitle: { fontSize: Typography.sizes.xl, fontFamily: Typography.fonts.heading, letterSpacing: 1 },
  confidence:   { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.mono },
  note:         { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", lineHeight: 20 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: {
    fontSize: 10, fontFamily: Typography.fonts.label,
    letterSpacing: 1.5, textTransform: "uppercase",
  },
  pill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },

  predLine: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading },
  metaLine: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono },

  barTrack: { height: 8, borderRadius: 4, borderWidth: 1, overflow: "hidden" },
  barFill:  { height: "100%" },

  subRow: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap" },
  subChip: {
    flex: 1, minWidth: 130,
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  subChipLabel: { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1, textTransform: "uppercase" },
  subChipValue: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.mono, marginTop: 2 },

  regionTable: {
    borderWidth: 1, borderRadius: Radius.md,
    padding: Spacing.sm, marginTop: 4,
  },
  regionRow: { flexDirection: "row", justifyContent: "space-between" },
  regionCell: { alignItems: "center", flex: 1, gap: 2 },
  regionLabel: { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1 },
  regionValue: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.mono },

  regionAsymRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 4,
  },
  regionAsymKey: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.heading, width: 32 },
  regionAsymSub: { fontSize: 10, fontFamily: Typography.fonts.body, width: 110 },
  regionAsymVal: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono, width: 44, textAlign: "right" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap" },
  statCell:  { width: "33.33%", paddingVertical: 6, paddingHorizontal: 4 },
  statLabel: { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1, textTransform: "uppercase" },
  statValue: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.mono, marginTop: 2 },

  factors:    { alignSelf: "stretch", gap: 2, marginTop: Spacing.xs },
  factorItem: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, paddingVertical: 1 },
});
