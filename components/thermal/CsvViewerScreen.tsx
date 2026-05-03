// components/thermal/CsvViewerScreen.tsx
// Renders a thermal CSV as a 160×120 colour-coded temperature grid inside a WebView.
// Same 4:3 aspect ratio as the live thermal display — each cell maps 1:1 to a frame pixel.
// Pinch-to-zoom to read individual temperature values; overview shows the spatial heat pattern.

import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React, { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native"
import WebView from "react-native-webview"
import Header from "../layout/Header"
import ScreenWrapper from "../layout/ScreenWrapper"
import { useTheme } from "../../constants/ThemeContext"
import { Spacing, Typography } from "../../constants/theme"
import type { ThemeColors } from "../../constants/theme"
import { getBundleByCode } from "../../lib/thermal/bundleStorage"
import { buildCsvGridHtml } from "../../lib/thermal/csvGridHtml"

interface Props {
  bundleCode: string
  side:       "left" | "right"
}

export default function CsvViewerScreen({ bundleCode, side }: Props) {
  const router   = useRouter()
  const { colors } = useTheme()
  const [csvContent, setCsvContent] = useState<string | null>(null)
  const [label,      setLabel]      = useState("")
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    getBundleByCode(bundleCode).then((bundle) => {
      if (!bundle) { setError("Bundle not found."); setLoading(false); return }
      const foot = side === "left" ? bundle.left : bundle.right
      setCsvContent(foot.csv_content)
      setLabel(`${bundle.bundle_code} · ${side === "left" ? "Left" : "Right"} Foot`)
      setLoading(false)
    }).catch(() => { setError("Failed to load bundle."); setLoading(false) })
  }, [bundleCode, side])

  const html = useMemo(() => csvContent ? buildCsvGridHtml(csvContent) : null, [csvContent])

  return (
    <ScreenWrapper>
      <Header
        title="Temperature Grid"
        subtitle={label}
        leftIcon={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : error ? (
        <ErrorView message={error} colors={colors} />
      ) : html ? (
        <>
          <WebView
            source={{ html }}
            style={styles.webview}
            originWhitelist={["*"]}
            scalesPageToFit
            scrollEnabled
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
          <View style={[styles.hint, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Ionicons name="expand-outline" size={12} color={colors.textSec} />
            <Text style={[styles.hintText, { color: colors.textSec }]}>
              Scroll to navigate · foot pixels show °C · background = 0.00 (dimmed)
            </Text>
          </View>
        </>
      ) : null}
    </ScreenWrapper>
  )
}

function ErrorView({ message, colors }: { message: string; colors: ThemeColors }) {
  return (
    <View style={styles.center}>
      <Ionicons name="warning-outline" size={32} color={colors.error} />
      <Text style={[styles.errorText, { color: colors.error }]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
  center:  { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md },
  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", paddingHorizontal: Spacing.lg },
  hint:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderTopWidth: 1 },
  hintText:{ fontSize: 10, fontFamily: Typography.fonts.body, flex: 1 },
})
