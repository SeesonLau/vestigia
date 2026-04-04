// app/mode-select.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenWrapper from "../components/layout/ScreenWrapper";
import { Colors, Radius, Spacing, Typography } from "../constants/theme";

export default function ModeSelectScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Brand */}
        <View style={styles.brand}>
          <Ionicons name="pulse-outline" size={48} color={Colors.primary[400]} />
          <Text style={styles.title}>Vestigia</Text>
          <Text style={styles.subtitle}>Diabetic Peripheral Neuropathy Screening</Text>
        </View>

        {/* Mode cards */}
        <View style={styles.cards}>
          {/* Online */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.replace("/(auth)/login")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="cloud-outline" size={28} color={Colors.primary[400]} />
            </View>
            <Text style={styles.cardTitle}>Go Online</Text>
            <Text style={styles.cardDesc}>
              Sign in to your account. Access patient records, sync results, and view full history.
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardAction}>Sign In</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary[400]} />
            </View>
          </TouchableOpacity>

          {/* Offline */}
          <TouchableOpacity
            style={[styles.card, styles.cardOffline]}
            activeOpacity={0.8}
            onPress={() => router.replace("/(offline)/live-feed")}
          >
            <View style={[styles.cardIcon, styles.cardIconOffline]}>
              <Ionicons name="camera-outline" size={28} color={Colors.teal[400]} />
            </View>
            <Text style={styles.cardTitle}>Work Offline</Text>
            <Text style={styles.cardDesc}>
              Capture thermal scans without an account. Data is saved locally on this device and can be synced later.
            </Text>
            <View style={styles.cardFooter}>
              <Text style={[styles.cardAction, styles.cardActionOffline]}>Start Capture</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.teal[400]} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Offline data stays on this device until you sign in and sync it.
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
    color: Colors.text.primary,
    marginTop: Spacing.md,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  cards: {
    gap: Spacing.lg,
    flex: 1,
    justifyContent: "center",
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardOffline: {
    borderColor: Colors.teal[700],
    backgroundColor: "rgba(20,176,142,0.05)",
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: "rgba(0,128,200,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  cardIconOffline: {
    backgroundColor: "rgba(20,176,142,0.12)",
  },
  cardTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
  },
  cardDesc: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
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
    color: Colors.primary[400],
  },
  cardActionOffline: {
    color: Colors.teal[400],
  },
  hint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
});
