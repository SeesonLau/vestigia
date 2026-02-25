// components/assessment/index.tsx
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { AngiosomeLabels, ClinicalThresholds } from "../../constants/clinical";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";

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
  const isPositive = classification === "POSITIVE";

  return (
    <View
      style={[
        classStyles.container,
        isPositive
          ? classStyles.positiveContainer
          : classStyles.negativeContainer,
        style,
      ]}
    >
      <Text style={classStyles.icon}>{isPositive ? "⚠" : "✓"}</Text>
      <View style={classStyles.textGroup}>
        <Text
          style={[
            classStyles.label,
            isPositive ? classStyles.positiveLabel : classStyles.negativeLabel,
          ]}
        >
          DPN {classification}
        </Text>
        <Text style={classStyles.confidence}>
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
  const rows: { key: AngiosomeKey; label: string; abbr: string }[] = [
    { key: "mpa", abbr: "MPA", label: AngiosomeLabels.MPA },
    { key: "lpa", abbr: "LPA", label: AngiosomeLabels.LPA },
    { key: "mca", abbr: "MCA", label: AngiosomeLabels.MCA },
    { key: "lca", abbr: "LCA", label: AngiosomeLabels.LCA },
  ];

  return (
    <View style={[tableStyles.container, style]}>
      {/* Header */}
      <View style={tableStyles.header}>
        <Text style={[tableStyles.headerCell, { flex: 2 }]}>Angiosome</Text>
        <Text style={[tableStyles.headerCell, { flex: 1, textAlign: "right" }]}>
          ΔT (°C)
        </Text>
        <Text style={[tableStyles.headerCell, { flex: 1, textAlign: "right" }]}>
          Status
        </Text>
      </View>

      {rows.map(({ key, abbr, label }) => {
        const val = asymmetries[key];
        const isFlagged = flagged.includes(abbr);
        const exceeds =
          val != null && Math.abs(val) > ClinicalThresholds.asymmetry;

        return (
          <View
            key={key}
            style={[tableStyles.row, isFlagged && tableStyles.flaggedRow]}
          >
            <View style={{ flex: 2 }}>
              <Text style={tableStyles.abbr}>{abbr}</Text>
              <Text style={tableStyles.fullLabel}>{label}</Text>
            </View>
            <Text
              style={[
                tableStyles.value,
                { flex: 1, textAlign: "right" },
                exceeds && tableStyles.exceeds,
              ]}
            >
              {val != null ? `${val > 0 ? "+" : ""}${val.toFixed(2)}` : "—"}
            </Text>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              {val != null ? (
                <View
                  style={[
                    tableStyles.statusPill,
                    exceeds ? tableStyles.flagPill : tableStyles.okPill,
                  ]}
                >
                  <Text
                    style={[
                      tableStyles.statusText,
                      exceeds ? tableStyles.flagText : tableStyles.okText,
                    ]}
                  >
                    {exceeds ? "FLAG" : "OK"}
                  </Text>
                </View>
              ) : (
                <Text style={tableStyles.na}>N/A</Text>
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
  return (
    <View style={[tciStyles.container, style]}>
      <Text style={tciStyles.title}>Thermal Change Index (TCI)</Text>
      <View style={tciStyles.row}>
        <TCIItem label="Left Foot" value={leftTci} />
        <View style={tciStyles.sep} />
        <TCIItem label="Right Foot" value={rightTci} />
        <View style={tciStyles.sep} />
        <TCIItem label="Bilateral" value={bilateralTci} highlight />
      </View>
    </View>
  );
}

function TCIItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: number;
  highlight?: boolean;
}) {
  return (
    <View style={tciStyles.item}>
      <Text style={tciStyles.itemLabel}>{label}</Text>
      <Text style={[tciStyles.itemValue, highlight && tciStyles.highlighted]}>
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
  positiveContainer: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderColor: "rgba(239,68,68,0.5)",
  },
  negativeContainer: {
    backgroundColor: "rgba(20,176,142,0.1)",
    borderColor: "rgba(20,176,142,0.5)",
  },
  icon: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  textGroup: { flex: 1 },
  label: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1,
  },
  positiveLabel: { color: "#f87171" },
  negativeLabel: { color: Colors.teal[300] },
  confidence: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
    marginTop: 4,
  },
});

const tableStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    backgroundColor: "rgba(10, 22, 44, 0.8)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  headerCell: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  flaggedRow: {
    backgroundColor: "rgba(239,68,68,0.06)",
  },
  abbr: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    color: Colors.text.primary,
  },
  fullLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
  },
  value: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.primary,
  },
  exceeds: { color: "#f87171" },
  statusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  flagPill: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.4)",
  },
  okPill: {
    backgroundColor: "rgba(20,176,142,0.15)",
    borderColor: "rgba(20,176,142,0.4)",
  },
  statusText: {
    fontSize: 10,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
  flagText: { color: "#f87171" },
  okText: { color: Colors.teal[300] },
  na: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
  },
});

const tciStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg.glass,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
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
  sep: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border.subtle,
  },
  itemLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginBottom: 4,
  },
  itemValue: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.primary,
  },
  highlighted: {
    color: Colors.primary[300],
  },
});
