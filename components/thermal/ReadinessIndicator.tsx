// components/thermal/ReadinessIndicator.tsx
// Shows four independent capture-readiness checks as a compact horizontal bar.
// Collapses to a single green "Ready" pill when all checks pass.

import React from "react"
import { StyleSheet, Text, View } from "react-native"
import { Radius, Spacing, Typography } from "../../constants/theme"
import type { ThemeColors } from "../../constants/theme"

// Thresholds — tuned for FLIR Lepton 3.5 at 9 fps in a clinical environment
const FFC_VARIANCE_MAX    = 1.5   // °C²  — below this = FFC / uniform frame
const LOW_SIGNAL_MIN      = 2.5   // °C²  — below this (and not FFC) = no subject / too far
const MOTION_DIFF_MAX     = 0.35  // °C   — above this = patient moved
const STABILIZE_FRAMES    = 14    // ~1.5 s at 9 fps

export interface ReadinessState {
  variance:   number
  frameDiff:  number
  frameIndex: number
}

interface Check {
  key:   string
  label: string
  pass:  boolean
  warn:  string   // label when failing
}

function getChecks(s: ReadinessState): Check[] {
  const isFfc        = s.variance   < FFC_VARIANCE_MAX
  const isLowSignal  = !isFfc && s.variance < LOW_SIGNAL_MIN
  const isMotion     = s.frameDiff  > MOTION_DIFF_MAX
  const isStabilized = s.frameIndex >= STABILIZE_FRAMES

  return [
    { key: "ffc",     label: "Shutter OK",  pass: !isFfc,       warn: "FFC Active"   },
    { key: "signal",  label: "Signal OK",   pass: !isLowSignal, warn: "No Subject"   },
    { key: "motion",  label: "Stable",      pass: !isMotion,    warn: "Motion"       },
    { key: "warmup",  label: "Ready",       pass: isStabilized, warn: "Warming Up"   },
  ]
}

interface Props {
  readiness: ReadinessState
  colors:    ThemeColors
}

export default function ReadinessIndicator({ readiness, colors }: Props) {
  const checks  = getChecks(readiness)
  const allPass = checks.every(c => c.pass)

  if (allPass) {
    return (
      <View style={[styles.container, { borderColor: colors.success + "50" }]}>
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
        <Text style={[styles.readyText, { color: colors.success }]}>Capture Ready</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      {checks.map((c, i) => (
        <React.Fragment key={c.key}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          <CheckChip check={c} colors={colors} />
        </React.Fragment>
      ))}
    </View>
  )
}

function CheckChip({ check, colors }: { check: Check; colors: ThemeColors }) {
  const color = check.pass ? colors.success : colors.error
  return (
    <View style={styles.chip}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.chipText, { color }]}>
        {check.pass ? check.label : check.warn}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderRadius: Radius.md,
    paddingVertical: 6, paddingHorizontal: Spacing.sm,
    gap: Spacing.xs, marginBottom: Spacing.sm,
  },
  chip:      { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, justifyContent: "center" },
  dot:       { width: 6, height: 6, borderRadius: 3 },
  divider:   { width: 1, height: 14, borderRadius: 1 },
  readyText: { fontSize: 11, fontFamily: Typography.fonts.heading, letterSpacing: 0.5 },
  chipText:  { fontSize: 9,  fontFamily: Typography.fonts.label,   letterSpacing: 0.5 },
})
