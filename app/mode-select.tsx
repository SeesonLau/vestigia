// app/mode-select.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenWrapper from "../components/layout/ScreenWrapper";
import { useTheme } from "../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../constants/theme";
import { S } from "../constants/strings";

export default function ModeSelectScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Brand */}
        <View style={styles.brand}>
          <Ionicons name="pulse-outline" size={48} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]}>{S.app.name}</Text>
          <Text style={[styles.subtitle, { color: colors.textSec }]}>{S.app.tagline}</Text>
        </View>

        {/* Mode cards */}
        <View style={styles.cards}>
          {/* Online */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => router.replace("/(auth)/login")}
          >
            <View style={[styles.cardIcon, { backgroundColor: `${colors.accent}1A` }]}>
              <Ionicons name="cloud-outline" size={28} color={colors.accent} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Go Online</Text>
            <Text style={[styles.cardDesc, { color: colors.textSec }]}>
              {S.modeSelect.onlineDesc}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={[styles.cardAction, { color: colors.accent }]}>{S.auth.signIn}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </View>
          </TouchableOpacity>

          {/* Offline */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: `${colors.success}0D`, borderColor: `${colors.success}40` }]}
            activeOpacity={0.8}
            onPress={() => router.replace("/(offline)/live-feed")}
          >
            <View style={[styles.cardIcon, { backgroundColor: `${colors.success}1F` }]}>
              <Ionicons name="camera-outline" size={28} color={colors.success} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Work Offline</Text>
            <Text style={[styles.cardDesc, { color: colors.textSec }]}>
              {S.modeSelect.offlineDesc}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={[styles.cardAction, { color: colors.success }]}>{S.modeSelect.startCapture}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.success} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.hint, { color: colors.textSec }]}>
          {S.modeSelect.hint}
        </Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing["2xl"],
    paddingBottom: Spacing.xl,
  },
  brand: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  title: {
    fontSize: 32,
    fontFamily: Typography.fonts.heading,
    marginTop: Spacing.md,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  cards: {
    gap: Spacing.lg,
    flex: 1,
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
  },
  cardDesc: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.xs,
  },
  cardAction: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
});
