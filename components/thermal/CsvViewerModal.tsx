// components/thermal/CsvViewerModal.tsx
// Renders a thermal CSV capture as a scrollable spreadsheet of temperature numbers.
// Background cells (0.00) are dimmed; foot cells show their °C value.

import { Ionicons } from "@expo/vector-icons"
import React, { useMemo } from "react"
import {
  Dimensions, Modal, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native"
import { useTheme } from "../../constants/ThemeContext"
import { Radius, Spacing, Typography } from "../../constants/theme"

const SCREEN_W = Dimensions.get("window").width
// Each cell is a fixed-width box. Thermal frames are 160 columns wide.
// We cap cell width so the grid scrolls horizontally.
const CELL_W = 38   // px — wide enough for "32.45"
const CELL_H = 22   // px — square-ish

interface Props {
  label:      string
  csvContent: string
  visible:    boolean
  onClose:    () => void
}

export default function CsvViewerModal({ label, csvContent, visible, onClose }: Props) {
  const { colors } = useTheme()

  const { rows, stats, error } = useMemo(() => {
    try {
      if (!csvContent.trim()) return { rows: [], stats: null, error: "No data" }
      const lines = csvContent.trim().split("\n")
      const rows = lines.map((line) => line.split(","))
      const flat: number[] = []
      for (const row of rows) {
        for (const cell of row) {
          const v = parseFloat(cell)
          if (!isNaN(v) && v !== 0) flat.push(v)
        }
      }
      if (flat.length === 0) return { rows, stats: null, error: null }
      const min  = Math.min(...flat)
      const max  = Math.max(...flat)
      const mean = flat.reduce((a, b) => a + b, 0) / flat.length
      return { rows, stats: { min, max, mean, cols: rows[0]?.length ?? 0, numRows: rows.length }, error: null }
    } catch (e) {
      return { rows: [], stats: null, error: e instanceof Error ? e.message : "Parse error" }
    }
  }, [csvContent])

  const gridW = (stats?.cols ?? 0) * CELL_W

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{label} · Temperature Grid</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Stats strip */}
        {stats && (
          <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <StatCell label="MIN"  value={`${stats.min.toFixed(2)}°C`}  colors={colors} />
            <StatCell label="MEAN" value={`${stats.mean.toFixed(2)}°C`} colors={colors} />
            <StatCell label="MAX"  value={`${stats.max.toFixed(2)}°C`}  colors={colors} />
            <StatCell label="GRID" value={`${stats.cols}×${stats.numRows}`} colors={colors} />
          </View>
        )}

        {/* Spreadsheet */}
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="warning-outline" size={24} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.tableScroll}
            showsVerticalScrollIndicator
          >
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ width: gridW }}>
                {rows.map((row, r) => (
                  <View key={r} style={styles.tableRow}>
                    {row.map((cell, c) => {
                      const val = parseFloat(cell)
                      const isBg = isNaN(val) || val === 0
                      return (
                        <View
                          key={c}
                          style={[
                            styles.cell,
                            { borderColor: colors.border },
                            isBg && { backgroundColor: colors.surface },
                          ]}
                        >
                          <Text
                            style={[
                              styles.cellText,
                              { color: isBg ? colors.textSec + "50" : colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            {cell.trim()}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        )}

        <Text style={[styles.hint, { color: colors.textSec }]}>
          Foot pixels show °C · background = 0.00 (dimmed)
        </Text>
      </View>
    </Modal>
  )
}

function StatCell({ label, value, colors }: {
  label: string; value: string
  colors: import("../../constants/theme").ThemeColors
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statLabel, { color: colors.textSec }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading },

  statsRow: {
    flexDirection: "row", borderWidth: 1, borderRadius: Radius.md,
    margin: Spacing.md, overflow: "hidden",
  },
  statCell:  { flex: 1, alignItems: "center", paddingVertical: Spacing.sm, gap: 2 },
  statLabel: { fontSize: 9,  fontFamily: Typography.fonts.label, letterSpacing: 1 },
  statValue: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono },

  tableScroll: { paddingBottom: 32 },
  tableRow:    { flexDirection: "row" },
  cell: {
    width: CELL_W, height: CELL_H,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 1,
  },
  cellText: { fontSize: 8, fontFamily: Typography.fonts.mono, textAlign: "center" },

  errorBox:  { margin: Spacing.lg, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.lg, alignItems: "center", gap: Spacing.sm },
  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center" },

  hint: { fontSize: 9, fontFamily: Typography.fonts.body, textAlign: "center", paddingVertical: Spacing.sm },
})
