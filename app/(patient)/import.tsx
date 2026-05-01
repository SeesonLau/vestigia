// app/(patient)/import.tsx
import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { StyleSheet, Text, View } from "react-native"
import Header from "../../components/layout/Header"
import ScreenWrapper from "../../components/layout/ScreenWrapper"
import { useTheme } from "../../constants/ThemeContext"
import { Spacing, Typography } from "../../constants/theme"

export default function PatientImportScreen() {
  const { colors } = useTheme()
  return (
    <ScreenWrapper>
      <Header title="Import Capture" />
      <View style={styles.center}>
        <Ionicons name="folder-open-outline" size={52} color={colors.border} />
        <Text style={[styles.title, { color: colors.text }]}>Import Thermal Captures</Text>
        <Text style={[styles.body, { color: colors.textSec }]}>
          Upload PNG and CSV files for each foot to create a bundle without a live capture.
        </Text>
        <Text style={[styles.soon, { color: colors.textSec }]}>Coming soon</Text>
      </View>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl, gap: Spacing.md },
  title:  { fontSize: Typography.sizes.md, fontFamily: Typography.fonts.heading, textAlign: "center" },
  body:   { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", lineHeight: 20 },
  soon:   { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, letterSpacing: 1.5, textTransform: "uppercase" },
})
