// app/(clinic)/assessment.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { useDPNStore } from "../../store/dpnStore";
import { useSessionStore, useThermalStore } from "../../store/sessionStore";

export default function AssessmentScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { clearSession } = useSessionStore();
  const leftMatrix    = useThermalStore((s) => s.leftMatrix);
  const rightMatrix   = useThermalStore((s) => s.rightMatrix);
  const leftImageB64  = useThermalStore((s) => s.leftImageB64);
  const rightImageB64 = useThermalStore((s) => s.rightImageB64);
  const discardCapture  = useThermalStore((s) => s.discardCapture);
  const clearBilateral  = useThermalStore((s) => s.clearBilateral);

  const { status, error: dpnError, startScan, clearScan } = useDPNStore();

  //Breathing progress animation (indeterminate — honest UX, no fake timing)
  const breathAnim = useRef(new Animated.Value(0.1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 0.82, duration: 2200, useNativeDriver: false }),
        Animated.timing(breathAnim, { toValue: 0.25, duration: 1100, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const progressWidth = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  //Start scan once on mount
  useEffect(() => {
    if (!leftMatrix || !rightMatrix || !leftImageB64 || !rightImageB64) return;
    startScan({
      left_image_b64:    leftImageB64,
      right_image_b64:   rightImageB64,
      left_temperatures:  leftMatrix,
      right_temperatures: rightMatrix,
    });
  }, []);

  //Navigate to result screen on success
  useEffect(() => {
    if (status === "success") {
      router.replace("/(clinic)/dpn-result");
    }
  }, [status]);

  const handleCancel = () => {
    clearScan();
    clearSession();
    discardCapture();
    clearBilateral();
    router.replace("/(clinic)");
  };

  const handleRetry = () => {
    if (!leftMatrix || !rightMatrix || !leftImageB64 || !rightImageB64) {
      handleCancel();
      return;
    }
    startScan({
      left_image_b64:    leftImageB64,
      right_image_b64:   rightImageB64,
      left_temperatures:  leftMatrix,
      right_temperatures: rightMatrix,
    });
  };

  //Missing bilateral captures — shouldn't normally happen
  const missingCaptures = !leftMatrix || !rightMatrix || !leftImageB64 || !rightImageB64;

  if (missingCaptures) {
    return (
      <ScreenWrapper>
        <Header title="AI Assessment" />
        <View style={styles.processingContainer}>
          <View style={[styles.processingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} style={styles.processingIcon} />
            <Text style={[styles.processingTitle, { color: colors.text }]}>Missing Captures</Text>
            <Text style={[styles.processingSubtitle, { color: colors.textSec }]}>
              Both left and right foot captures are required. Return to the camera screen and capture both feet.
            </Text>
            <Button
              label="Go Back"
              onPress={handleCancel}
              variant="primary"
              size="md"
              style={styles.actionBtn}
            />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  if (status === "error") {
    return (
      <ScreenWrapper>
        <Header title="AI Assessment" />
        <View style={styles.processingContainer}>
          <View style={[styles.processingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} style={styles.processingIcon} />
            <Text style={[styles.processingTitle, { color: colors.text }]}>Analysis Failed</Text>
            <Text style={[styles.processingSubtitle, { color: colors.textSec }]}>{dpnError}</Text>
            <View style={styles.errorActions}>
              <Button label="Retry" onPress={handleRetry} variant="primary" size="md" />
              <Button label="Cancel Session" onPress={handleCancel} variant="ghost" size="md" />
            </View>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  //Loading / server_waking states
  const isWaking = status === "server_waking";
  const accentColor = isWaking ? colors.warning : colors.accent;
  const steps = isWaking
    ? ["Server Waking", "Models Loading", "Ready"]
    : ["Uploading", "Processing", "Classifying"];

  return (
    <ScreenWrapper>
      <Header
        title="AI Assessment"
        subtitle={isWaking ? "Server Starting Up" : "Processing..."}
      />

      <View style={styles.processingContainer}>
        <View style={[styles.processingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons
            name="analytics-outline"
            size={48}
            color={accentColor}
            style={styles.processingIcon}
          />
          <Text style={[styles.processingTitle, { color: colors.text }]}>
            {isWaking ? "Server Starting Up" : "Analyzing Thermal Data"}
          </Text>
          <Text style={[styles.processingSubtitle, { color: colors.textSec }]}>
            {isWaking
              ? "The AI server is warming up. This can take up to 30 seconds on first use."
              : "Uploading and processing both feet through the DPN classification model..."}
          </Text>

          {/* Breathing progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
            <Animated.View
              style={[styles.progressFill, { width: progressWidth, backgroundColor: accentColor }]}
            />
          </View>

          {/* Step indicators */}
          <View style={styles.steps}>
            {steps.map((step) => (
              <View key={step} style={styles.step}>
                <View style={[styles.stepDot, { backgroundColor: accentColor }]} />
                <Text style={[styles.stepText, { color: colors.textSec }]}>{step}</Text>
              </View>
            ))}
          </View>

          <Button
            label="Cancel"
            onPress={handleCancel}
            variant="ghost"
            size="sm"
            style={styles.cancelBtn}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  processingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  processingCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  processingIcon: { marginBottom: Spacing.lg },
  processingTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  processingSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  steps: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: Spacing.xl,
  },
  step: { alignItems: "center", gap: 4 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
  errorActions: { gap: Spacing.sm, width: "100%", marginTop: Spacing.lg },
  actionBtn: { marginTop: Spacing.lg, width: "100%" },
  cancelBtn: { marginTop: Spacing.sm, width: "100%" },
});
