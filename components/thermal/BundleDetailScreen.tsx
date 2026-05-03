// components/thermal/BundleDetailScreen.tsx
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native"
import ZoomableImage from "./ZoomableImage"
import Header from "../layout/Header"
import ScreenWrapper from "../layout/ScreenWrapper"
import { useTheme } from "../../constants/ThemeContext"
import { Radius, Spacing, Typography } from "../../constants/theme"
import type { ThemeColors } from "../../constants/theme"
import { getBundleByCode } from "../../lib/thermal/bundleStorage"
import type { ThermalBundle } from "../../lib/thermal/bundleStorage"
import { calculateAge, calculateBMI, bmiCategory } from "../../lib/thermal/bundleUtils"

interface Props {
  bundleCode:  string
  onViewCsv?:  (side: "left" | "right") => void
}

export default function BundleDetailScreen({ bundleCode, onViewCsv }: Props) {
  const router = useRouter()
  const { colors } = useTheme()
  const [bundle,  setBundle]  = useState<ThermalBundle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBundleByCode(bundleCode).then(setBundle).finally(() => setLoading(false))
  }, [bundleCode])

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="Bundle Detail" leftIcon={<BackBtn router={router} colors={colors} />} />
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      </ScreenWrapper>
    )
  }

  if (!bundle) {
    return (
      <ScreenWrapper>
        <Header title="Bundle Detail" leftIcon={<BackBtn router={router} colors={colors} />} />
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textSec }]}>Bundle not found.</Text>
        </View>
      </ScreenWrapper>
    )
  }

  const p    = bundle.patient
  const name = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ")
  const age  = calculateAge(p.birthdate)
  const bmi  = calculateBMI(p.weight_kg, p.height_cm)
  const cat  = bmiCategory(bmi)

  return (
    <ScreenWrapper>
      <Header
        title={bundle.bundle_code}
        leftIcon={<BackBtn router={router} colors={colors} />}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient card */}
        <Section title="Patient" colors={colors}>
          <Text style={[styles.patientName, { color: colors.text }]}>{name}</Text>
          <View style={styles.statsGrid}>
            <InfoCell label="Sex"       value={p.gender}                                 colors={colors} />
            <InfoCell label="Birthdate" value={new Date(p.birthdate).toLocaleDateString()} colors={colors} />
            <InfoCell label="Age"       value={`${age} yrs`}                             colors={colors} />
            <InfoCell label="Weight"    value={`${p.weight_kg} kg`}                      colors={colors} />
            <InfoCell label="Height"    value={`${p.height_cm} cm`}                      colors={colors} />
            <InfoCell label="BMI"       value={`${bmi.toFixed(1)} · ${cat}`}             colors={colors} />
          </View>
        </Section>

        {/* Sync status + timestamp */}
        <View style={[styles.metaRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {bundle.synced ? (
            <View style={styles.inlineRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
              <Text style={[styles.metaText, { color: colors.success }]}>Synced</Text>
            </View>
          ) : (
            <View style={styles.inlineRow}>
              <Ionicons name="cloud-offline-outline" size={14} color={colors.warning} />
              <Text style={[styles.metaText, { color: colors.warning }]}>Local only</Text>
            </View>
          )}
          <Text style={[styles.metaText, { color: colors.textSec }]}>
            {new Date(bundle.captured_at).toLocaleString()}
          </Text>
        </View>

        {/* Thermal images */}
        <Section title="Thermal Images" colors={colors}>
          <FootImageCard
            label="Left Foot"  foot={bundle.left}
            onViewCsv={onViewCsv ? () => onViewCsv("left")  : undefined}
            colors={colors}
          />
          <FootImageCard
            label="Right Foot" foot={bundle.right}
            onViewCsv={onViewCsv ? () => onViewCsv("right") : undefined}
            colors={colors}
          />
        </Section>

        {/* Saved files */}
        <Section title="Saved Files" colors={colors}>
          <FileRow icon="image-outline"         name={bundle.left.processed_filename}  colors={colors} />
          <FileRow icon="image-outline"         name={bundle.left.isolated_filename}   colors={colors} />
          <FileRow icon="document-text-outline" name={bundle.left.csv_filename}        colors={colors} />
          <FileRow icon="image-outline"         name={bundle.right.processed_filename} colors={colors} />
          <FileRow icon="image-outline"         name={bundle.right.isolated_filename}  colors={colors} />
          <FileRow icon="document-text-outline" name={bundle.right.csv_filename}       colors={colors} />
          <Text style={[styles.fileNote, { color: colors.textSec }]}>
            Files are stored on-device and can be synced when online.
          </Text>
        </Section>
      </ScrollView>

    </ScreenWrapper>
  )
}

function BackBtn({ router, colors }: { router: ReturnType<typeof useRouter>; colors: ThemeColors }) {
  return (
    <TouchableOpacity onPress={() => router.back()}>
      <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
    </TouchableOpacity>
  )
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ThemeColors }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSec }]}>{title.toUpperCase()}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  )
}

function InfoCell({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
  return (
    <View style={styles.infoCell}>
      <Text style={[styles.infoCellLabel, { color: colors.textSec }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.infoCellValue, { color: colors.text }]}>{value}</Text>
    </View>
  )
}

function FootImageCard({
  label, foot, onViewCsv, colors,
}: {
  label: string
  foot: ThermalBundle["left"]
  onViewCsv?: () => void
  colors: ThemeColors
}) {
  const hasRaw      = !!foot.raw_image_b64
  const hasIsolated = !!foot.isolated_image_b64

  return (
    <View style={[styles.footCard, { borderColor: colors.border }]}>
      <View style={styles.footCardHeader}>
        <Text style={[styles.footCardLabel, { color: colors.textSec }]}>{label.toUpperCase()}</Text>
        {onViewCsv && (
          <TouchableOpacity
            onPress={onViewCsv}
            style={[styles.csvBtn, { borderColor: colors.accent }]}
            activeOpacity={0.7}
          >
            <Ionicons name="grid-outline" size={12} color={colors.accent} />
            <Text style={[styles.csvBtnText, { color: colors.accent }]}>View CSV</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Three images: Unprocessed | Post-Processed | Isolated */}
      <View style={styles.imageRow}>
        <View style={styles.imageCell}>
          <Text style={[styles.imageLabel, { color: colors.textSec }]}>UNPROCESSED</Text>
          {hasRaw ? (
            <ZoomableImage
              uri={"data:image/jpeg;base64," + foot.raw_image_b64}
              style={[styles.footImage, { borderColor: colors.border }]}
              resizeMode="contain"
              fadeDuration={0}
            />
          ) : (
            <View style={[styles.footImage, styles.noImage, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="camera-outline" size={16} color={colors.border} />
            </View>
          )}
        </View>
        <View style={styles.imageCell}>
          <Text style={[styles.imageLabel, { color: colors.textSec }]}>POST-PROCESSED</Text>
          <ZoomableImage
            uri={"data:image/png;base64," + foot.processed_image_b64}
            style={[styles.footImage, { borderColor: colors.border }]}
            resizeMode="contain"
            fadeDuration={0}
          />
        </View>
        <View style={styles.imageCell}>
          <Text style={[styles.imageLabel, { color: colors.textSec }]}>ISOLATED</Text>
          {hasIsolated ? (
            <ZoomableImage
              uri={"data:image/png;base64," + foot.isolated_image_b64}
              style={[styles.footImage, { borderColor: colors.border, backgroundColor: colors.surface }]}
              resizeMode="contain"
              fadeDuration={0}
            />
          ) : (
            <View style={[styles.footImage, styles.noImage, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="scan-outline" size={16} color={colors.border} />
            </View>
          )}
        </View>
      </View>

      {/* Temp stats */}
      <View style={styles.tempRow}>
        <TempStat label="MIN"  value={foot.stats.min.toFixed(1)}  colors={colors} />
        <TempStat label="MAX"  value={foot.stats.max.toFixed(1)}  colors={colors} />
        <TempStat label="MEAN" value={foot.stats.mean.toFixed(1)} colors={colors} />
      </View>
    </View>
  )
}

function TempStat({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
  return (
    <View style={styles.tempStat}>
      <Text style={[styles.tempLabel, { color: colors.textSec }]}>{label}</Text>
      <Text style={[styles.tempValue, { color: colors.success }]}>{value}°C</Text>
    </View>
  )
}

function FileRow({ icon, name, colors }: { icon: string; name: string; colors: ThemeColors }) {
  return (
    <View style={[styles.fileRow, { borderBottomColor: colors.border }]}>
      <Ionicons name={icon as any} size={15} color={colors.textSec} />
      <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  scroll:   { padding: Spacing.lg, paddingBottom: Spacing["3xl"], gap: Spacing.lg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText:{ fontSize: Typography.sizes.base, fontFamily: Typography.fonts.body },

  metaRow:   {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderRadius: Radius.md,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText:  { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },

  section:      { gap: Spacing.xs },
  sectionTitle: { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 1.5, paddingLeft: 2 },
  sectionCard:  { borderWidth: 1, borderRadius: Radius.lg, overflow: "hidden" },

  patientName:   { fontSize: Typography.sizes.lg, fontFamily: Typography.fonts.heading, padding: Spacing.md, paddingBottom: Spacing.xs },
  statsGrid:     { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm },
  infoCell:      { width: "50%", paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  infoCellLabel: { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1 },
  infoCellValue: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading, marginTop: 2 },

  footCard:       { padding: Spacing.md, gap: Spacing.sm, borderBottomWidth: 1 },
  footCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footCardLabel:  { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1.5 },
  csvBtn:         { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  csvBtnText:     { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },

  imageRow:   { flexDirection: "row", gap: Spacing.xs },
  imageCell:  { flex: 1, gap: 3 },
  imageLabel: { fontSize: 7, fontFamily: Typography.fonts.label, letterSpacing: 0.5, textAlign: "center" },
  footImage:  { width: "100%", aspectRatio: 160 / 120, borderRadius: Radius.sm, borderWidth: 1 },
  noImage:    { alignItems: "center", justifyContent: "center" },

  tempRow:    { flexDirection: "row", justifyContent: "space-around" },
  tempStat:   { alignItems: "center", gap: 2 },
  tempLabel:  { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1 },
  tempValue:  { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.mono },

  fileRow:    { flexDirection: "row", alignItems: "center", gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  fileName:   { flex: 1, fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono },
  fileNote:   { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, padding: Spacing.md, lineHeight: 18 },
})
