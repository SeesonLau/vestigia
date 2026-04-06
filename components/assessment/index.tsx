// components/assessment/index.tsx
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { AngiosomeLabels, ClinicalThresholds } from "../../constants/clinical";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";

// ── ClassificationCard ─────────────────────────────────────────
interface ClassificationCardProps {
  classification: "POSITIVE" | "NEGATIVE";
  confidence: number;
  style?: ViewStyle;
}

export function ClassificationCard({
  classification,
  confidence,
  style,
}: ClassificationCardProps) {
  const { colors } = useTheme();
  const isPositive = classification === "POSITIVE";

  return (
    <View
      style={[
        classStyles.container,
        isPositive
          ? { backgroundColor: `${colors.error}1A`, borderColor: `${colors.error}80` }
          : { backgroundColor: `${colors.success}1A`, borderColor: `${colors.success}80` },
        style,
      ]}
    >
      <Text style={classStyles.icon}>{isPositive ? "⚠" : "✓"}</Text>
      <View style={classStyles.textGroup}>
        <Text style={[classStyles.label, { color: isPositive ? colors.error : colors.success }]}>
          DPN {classification}
        </Text>
        <Text style={[classStyles.confidence, { color: colors.textSec }]}>
          {(confidence * 100).toFixed(1)}% confidence
        </Text>
      </View>
    </View>
  );
}

// ── AngiosomeTable ─────────────────────────────────────────────
type AngiosomeKey = "mpa" | "lpa" | "mca" | "lca";

interface AngiosomeTableProps {
  asymmetries: {
    mpa?: number;
    lpa?: number;
    mca?: number;
    lca?: number;
  };
  flagged?: string[];
  style?: ViewStyle;
}

export function AngiosomeTable({
  asymmetries,
  flagged = [],
  style,
}: AngiosomeTableProps) {
  const { colors } = useTheme();
  const rows: { key: AngiosomeKey; label: string; abbr: string }[] = [
    { key: "mpa", abbr: "MPA", label: AngiosomeLabels.MPA },
    { key: "lpa", abbr: "LPA", label: AngiosomeLabels.LPA },
    { key: "mca", abbr: "MCA", label: AngiosomeLabels.MCA },
    { key: "lca", abbr: "LCA", label: AngiosomeLabels.LCA },
  ];

  return (
    <View style={[tableStyles.container, { borderColor: colors.border }, style]}>
      {/* Header */}
      <View style={[tableStyles.header, { borderBottomColor: colors.border }]}>
        <Text style={[tableStyles.headerCell, { flex: 2, color: colors.textSec }]}>Angiosome</Text>
        <Text style={[tableStyles.headerCell, { flex: 1, textAlign: "right", color: colors.textSec }]}>ΔT (°C)</Text>
        <Text style={[tableStyles.headerCell, { flex: 1, textAlign: "right", color: colors.textSec }]}>Status</Text>
      </View>

      {rows.map(({ key, abbr, label }) => {
        const val = asymmetries[key];
        const isFlagged = flagged.includes(abbr);
        const exceeds = val != null && Math.abs(val) > ClinicalThresholds.asymmetry;

        return (
          <View
            key={key}
            style={[
              tableStyles.row,
              { borderBottomColor: colors.border },
              isFlagged && { backgroundColor: `${colors.error}0F` },
            ]}
          >
            <View style={{ flex: 2 }}>
              <Text style={[tableStyles.abbr, { color: colors.text }]}>{abbr}</Text>
              <Text style={[tableStyles.fullLabel, { color: colors.textSec }]}>{label}</Text>
            </View>
            <Text
              style={[
                tableStyles.value,
                { flex: 1, textAlign: "right", color: exceeds ? colors.error : colors.text },
              ]}
            >
              {val != null ? `${val > 0 ? "+" : ""}${val.toFixed(2)}` : "—"}
            </Text>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              {val != null ? (
                <View
                  style={[
                    tableStyles.statusPill,
                    exceeds
                      ? { backgroundColor: `${colors.error}26`, borderColor: `${colors.error}66` }
                      : { backgroundColor: `${colors.success}26`, borderColor: `${colors.success}66` },
                  ]}
                >
                  <Text style={[tableStyles.statusText, { color: exceeds ? colors.error : colors.success }]}>
                    {exceeds ? "FLAG" : "OK"}
                  </Text>
                </View>
              ) : (
                <Text style={[tableStyles.na, { color: colors.textSec }]}>N/A</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── TCIDisplay ─────────────────────────────────────────────────
interface TCIDisplayProps {
  leftTci?: number;
  rightTci?: number;
  bilateralTci?: number;
  style?: ViewStyle;
}

export function TCIDisplay({
  leftTci,
  rightTci,
  bilateralTci,
  style,
}: TCIDisplayProps) {
  const { colors } = useTheme();
  return (
    <View style={[tciStyles.container, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <Text style={[tciStyles.title, { color: colors.textSec }]}>Thermal Change Index (TCI)</Text>
      <View style={tciStyles.row}>
        <TCIItem label="Left Foot" value={leftTci} textColor={colors.text} labelColor={colors.textSec} accentColor={colors.accent} />
        <View style={[tciStyles.sep, { backgroundColor: colors.border }]} />
        <TCIItem label="Right Foot" value={rightTci} textColor={colors.text} labelColor={colors.textSec} accentColor={colors.accent} />
        <View style={[tciStyles.sep, { backgroundColor: colors.border }]} />
        <TCIItem label="Bilateral" value={bilateralTci} highlight textColor={colors.text} labelColor={colors.textSec} accentColor={colors.accent} />
      </View>
    </View>
  );
}

function TCIItem({
  label,
  value,
  highlight,
  textColor,
  labelColor,
  accentColor,
}: {
  label: string;
  value?: number;
  highlight?: boolean;
  textColor: string;
  labelColor: string;
  accentColor: string;
}) {
  return (
    <View style={tciStyles.item}>
      <Text style={[tciStyles.itemLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[tciStyles.itemValue, { color: highlight ? accentColor : textColor }]}>
        {value != null ? value.toFixed(3) : "—"}
      </Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const classStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  icon: { fontSize: 32, marginRight: Spacing.md },
  textGroup: { flex: 1 },
  label: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1,
  },
  confidence: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    marginTop: 4,
  },
});

const tableStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    backgroundColor: "rgba(10, 22, 44, 0.8)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerCell: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  abbr: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
  fullLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
  },
  value: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.mono,
  },
  statusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
  na: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
  },
});

const tciStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  item: { alignItems: "center" },
  sep: { width: 1, height: 36 },
  itemLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginBottom: 4,
  },
  itemValue: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.mono,
  },
});
