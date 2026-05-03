// app/(offline)/patient-details.tsx
//Offline-guest capture path is not yet ported to the new post-capture form.
//The thermal store still receives the captured frames; this screen will
//eventually save them locally + queue for sync. For now it renders a
//placeholder so the route stays addressable without breaking the build.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";

export default function OfflinePatientDetailsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <ScreenWrapper>
      <Header
        title="Offline Capture"
        leftIcon={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="construct-outline" size={32} color={colors.warning} />
          <Text style={[styles.title, { color: colors.text }]}>Offline guest path is being rebuilt</Text>
          <Text style={[styles.body, { color: colors.textSec }]}>
            The offline-without-an-account flow will be re-wired in a follow-up round. For now, sign in
            as a clinic operator or patient and use those capture flows.
          </Text>
          <Button
            label="Back to mode select"
            onPress={() => router.replace("/mode-select")}
            variant="secondary"
            size="lg"
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    textAlign: "center",
  },
  body: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
});
