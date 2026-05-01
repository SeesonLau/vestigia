// app/(offline)/history.tsx
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React, { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator, FlatList, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native"
import Header from "../../components/layout/Header"
import ScreenWrapper from "../../components/layout/ScreenWrapper"
import { useTheme } from "../../constants/ThemeContext"
import { Radius, Spacing, Typography } from "../../constants/theme"
import { getAllBundles } from "../../lib/thermal/bundleStorage"
import type { ThermalBundle } from "../../lib/thermal/bundleStorage"
import { calculateAge, calculateBMI, bmiCategory } from "../../lib/thermal/bundleUtils"

export default function OfflineHistoryScreen() {
  const router = useRouter()
  const { colors } = useTheme()

  const [bundles, setBundles] = useState<ThermalBundle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllBundles().then(setBundles).finally(() => setLoading(false))
  }, [])

  const renderItem = useCallback(({ item }: { item: ThermalBundle }) => {
    const p    = item.patient
    const age  = calculateAge(p.birthdate)
    const bmi  = calculateBMI(p.weight_kg, p.height_cm)
    const name = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ")

    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/(offline)/bundle-detail" as any, params: { code: item.bundle_code } })}
        activeOpacity={0.75}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* Header row */}
        <View style={styles.cardHeader}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          {item.synced ? (
            <View style={styles.syncRow}>
              <Ionicons name="checkmark-circle-outline" size={12} color={colors.success} />
              <Text style={[styles.syncText, { color: colors.success }]}>Synced</Text>
            </View>
          ) : (
            <View style={[styles.unsyncedBadge, { backgroundColor: `${colors.warning}26`, borderColor: `${colors.warning}4D` }]}>
              <Text style={[styles.unsyncedText, { color: colors.warning }]}>Local only</Text>
            </View>
          )}
        </View>

        {/* Bundle code + date */}
        <Text style={[styles.code, { color: colors.accent }]}>{item.bundle_code}</Text>
        <Text style={[styles.date, { color: colors.textSec }]}>
          {new Date(item.captured_at).toLocaleString()}
        </Text>

        {/* Stats row: sex · age · BMI */}
        <View style={styles.statsRow}>
          <StatChip icon="male-female-outline" value={p.gender} colors={colors} />
          <StatChip icon="calendar-outline" value={`${age} yrs`} colors={colors} />
          <StatChip icon="fitness-outline" value={`BMI ${bmi.toFixed(1)} · ${bmiCategory(bmi)}`} colors={colors} />
        </View>

        {/* Temp range */}
        <View style={styles.tempRow}>
          <TempChip label="L" stats={item.left.stats} colors={colors} />
          <TempChip label="R" stats={item.right.stats} colors={colors} />
        </View>
      </TouchableOpacity>
    )
  }, [colors, router])

  return (
    <ScreenWrapper>
      <Header
        title="Saved Bundles"
        leftIcon={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : bundles.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="albums-outline" size={48} color={colors.textSec} style={{ marginBottom: Spacing.md }} />
            <Text style={[styles.emptyText, { color: colors.textSec }]}>No saved bundles yet</Text>
            <Text style={[styles.emptyHint, { color: colors.textSec }]}>
              Bundles you save from Thermal Live Capture will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={bundles}
            keyExtractor={(b) => b.bundle_code}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </ScreenWrapper>
  )
}

function StatChip({ icon, value, colors }: {
  icon: string; value: string
  colors: import("../../constants/theme").ThemeColors
}) {
  return (
    <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon as any} size={11} color={colors.textSec} />
      <Text style={[styles.chipText, { color: colors.textSec }]}>{value}</Text>
    </View>
  )
}

function TempChip({ label, stats, colors }: {
  label: string
  stats: { min: number; max: number; mean: number }
  colors: import("../../constants/theme").ThemeColors
}) {
  return (
    <View style={[styles.tempChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.tempLabel, { color: colors.textSec }]}>{label}</Text>
      <Text style={[styles.tempValue, { color: colors.success }]}>
        {stats.min.toFixed(1)}–{stats.max.toFixed(1)}°C
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center" },
  list:      { paddingBottom: Spacing["2xl"] },

  card: {
    borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, gap: Spacing.sm,
  },
  cardHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name:         { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading, flex: 1, marginRight: Spacing.sm },
  code:         { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono, letterSpacing: 0.5 },
  date:         { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },

  syncRow:       { flexDirection: "row", alignItems: "center", gap: 4 },
  syncText:      { fontSize: 10, fontFamily: Typography.fonts.label },
  unsyncedBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  unsyncedText:  { fontSize: 10, fontFamily: Typography.fonts.label },

  statsRow:  { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  chip:      { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  chipText:  { fontSize: 10, fontFamily: Typography.fonts.body },

  tempRow:   { flexDirection: "row", gap: Spacing.sm },
  tempChip:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 5 },
  tempLabel: { fontSize: 10, fontFamily: Typography.fonts.heading, letterSpacing: 1 },
  tempValue: { fontSize: 10, fontFamily: Typography.fonts.mono },

  emptyText: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.body },
  emptyHint: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", marginTop: Spacing.sm, lineHeight: 20 },
})
