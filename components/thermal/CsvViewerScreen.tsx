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

// Frame constants — FLIR Lepton 3.5
const FRAME_COLS = 160
const FRAME_ROWS = 120
// Cell size large enough to comfortably display a value like "32.45".
// The viewport uses device-width so cells open at 1:1 — no zoom needed to read values.
// The overall grid is FRAME_COLS × CELL_PX wide and FRAME_ROWS × CELL_PX tall,
// preserving the 4:3 thermal aspect ratio. The user scrolls to navigate.
const CELL_PX = 56

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

  const html = useMemo(() => csvContent ? buildHtml(csvContent) : null, [csvContent])

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

// ── HTML generation ───────────────────────────────────────────────────────────

// Ironbow palette — matches the Kotlin paletteRgb implementation exactly.
function ironbow(t: number): [number, number, number] {
  const n = Math.max(0, Math.min(1, t))
  if (n < 0.20) { const f = n / 0.20;         return [Math.round(80*f),        0,                   Math.round(120*f)]      }
  if (n < 0.45) { const f = (n-0.20)/0.25;    return [Math.round(80+120*f),    0,                   Math.round(120-60*f)]   }
  if (n < 0.65) { const f = (n-0.45)/0.20;    return [Math.round(200+55*f),    Math.round(100*f),   Math.round(60-60*f)]    }
  if (n < 0.85) { const f = (n-0.65)/0.20;    return [255,                     Math.round(100+120*f), 0]                    }
  const f = (n-0.85)/0.15;                    return [255,                     Math.round(220+35*f), Math.round(200*f)]
}

function hex2(v: number): string {
  return v.toString(16).padStart(2, "0")
}

function buildHtml(csvContent: string): string {
  const lines  = csvContent.trim().split("\n")
  const matrix = lines.map((l) => l.split(","))

  // Stats over non-zero (foot) pixels only
  let minV = Infinity, maxV = -Infinity
  for (const row of matrix) {
    for (const cell of row) {
      const v = parseFloat(cell)
      if (!isNaN(v) && v > 0.001) {
        if (v < minV) minV = v
        if (v > maxV) maxV = v
      }
    }
  }
  const range = (maxV - minV) > 0 ? maxV - minV : 1

  // 256 CSS color classes (ironbow palette) — avoids inline style per cell
  let colorCss = ""
  for (let i = 0; i < 256; i++) {
    const t        = i / 255
    const [r, g, b] = ironbow(t)
    const lum      = (0.299*r + 0.587*g + 0.114*b) / 255
    const textClr  = lum > 0.55 ? "#000" : "rgba(255,255,255,0.9)"
    colorCss += `.c${i}{background:#${hex2(r)}${hex2(g)}${hex2(b)};color:${textClr}}`
  }

  // Table rows — background cells get class "bg", foot cells get class "cN"
  let rows = ""
  for (let r = 0; r < matrix.length; r++) {
    rows += "<tr>"
    const row = matrix[r]
    for (let c = 0; c < row.length; c++) {
      const v   = parseFloat(row[c])
      const isBg = isNaN(v) || v <= 0.001
      if (isBg) {
        rows += "<td class='bg'>0.00</td>"
      } else {
        const bucket = Math.min(255, Math.round(((v - minV) / range) * 255))
        rows += `<td class='c${bucket}'>${v.toFixed(2)}</td>`
      }
    }
    rows += "</tr>"
  }

  const tableW = FRAME_COLS * CELL_PX  // 7040
  const tableH = FRAME_ROWS * CELL_PX  // 5280

  return `<!DOCTYPE html><html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${tableW},initial-scale=1,minimum-scale=0.01,maximum-scale=10,user-scalable=yes">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#111}
table{border-collapse:collapse;table-layout:fixed;width:${tableW}px}
td{width:${CELL_PX}px;height:${CELL_PX}px;font-size:11px;font-family:monospace;text-align:center;vertical-align:middle;white-space:nowrap;border:1px solid rgba(255,255,255,0.06)}
.bg{background:#1c1c1c;color:rgba(255,255,255,0.18)}
${colorCss}
</style>
</head>
<body><table>${rows}</table></body>
</html>`
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
  center:  { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md },
  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", paddingHorizontal: Spacing.lg },
  hint:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderTopWidth: 1 },
  hintText:{ fontSize: 10, fontFamily: Typography.fonts.body, flex: 1 },
})
