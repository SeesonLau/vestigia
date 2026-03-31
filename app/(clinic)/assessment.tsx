// app/(clinic)/assessment.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View
} from "react-native";
import {
  AngiosomeTable,
  ClassificationCard,
  TCIDisplay,
} from "../../components/assessment/index";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import ThermalMap, {
  generateMockThermalMatrix,
} from "../../components/thermal/ThermalMap";
import Button from "../../components/ui/Button";
import { Badge, Card, Disclaimer } from "../../components/ui/index";
import { DISCLAIMER_TEXT } from "../../constants/clinical";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useSessionStore, useThermalStore } from "../../store/sessionStore";

const { width: SCREEN_W } = Dimensions.get("window");
const THUMB_W = (SCREEN_W - Spacing.lg * 2 - Spacing.md) / 2;
const THUMB_H = Math.round(THUMB_W * (62 / 80));

// Mock result
const MOCK_RESULT = {
  classification: "POSITIVE" as const,
  confidence_score: 0.874,
  asymmetry_mpa_c: 2.8,
  asymmetry_lpa_c: 1.4,
  asymmetry_mca_c: 3.1,
  asymmetry_lca_c: 0.9,
  max_asymmetry_c: 3.1,
  angiosomes_flagged: ["MPA", "MCA"],
  bilateral_tci: 0.042,
  model_version: "dpn-v1.2.0",
  processing_time_ms: 1240,
  classified_at: new Date().toISOString(),
};

type ScreenState = "processing" | "result";

export default function AssessmentScreen() {
  const router = useRouter();
  const { activeSession, clearSession } = useSessionStore();
  const discardCapture = useThermalStore((s) => s.discardCapture);
  const [state, setState] = useState<ScreenState>("processing");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleExit = () => {
    clearSession();
    discardCapture();
    router.replace("/(clinic)");
  };

  const handleSave = async () => {
    if (!activeSession?.id) {
      setSaveError("No active session found. Please restart the screening.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const { error: classErr } = await supabase.from("classification_results").insert({
        session_id: activeSession.id,
        classification: MOCK_RESULT.classification,
        confidence_score: MOCK_RESULT.confidence_score,
        asymmetry_mpa_c: MOCK_RESULT.asymmetry_mpa_c,
        asymmetry_lpa_c: MOCK_RESULT.asymmetry_lpa_c,
        asymmetry_mca_c: MOCK_RESULT.asymmetry_mca_c,
        asymmetry_lca_c: MOCK_RESULT.asymmetry_lca_c,
        max_asymmetry_c: MOCK_RESULT.max_asymmetry_c,
        angiosomes_flagged: MOCK_RESULT.angiosomes_flagged,
        bilateral_tci: MOCK_RESULT.bilateral_tci,
        model_version: MOCK_RESULT.model_version,
        processing_time_ms: MOCK_RESULT.processing_time_ms,
        classified_at: MOCK_RESULT.classified_at,
      });
      if (classErr) throw new Error("Failed to save classification result.");

      const { error: sessErr } = await supabase
        .from("screening_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", activeSession.id);
      if (sessErr) throw new Error("Failed to update session status.");

      setSaved(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  // Clear session on unmount (guards stale state if user leaves without saving)
  useEffect(() => {
    return () => {
      if (!saved) {
        clearSession();
        discardCapture();
      }
    };
  }, [saved]);

  // Simulate cloud processing
  useEffect(() => {
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3500,
      useNativeDriver: false,
    });
    anim.start(() => {
      setState("result");
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });
    return () => anim.stop();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const leftMatrix = useRef(generateMockThermalMatrix()).current;
  const rightMatrix = useRef(generateMockThermalMatrix()).current;

  return (
    <ScreenWrapper>
      <Header
        title="AI Assessment"
        subtitle={state === "processing" ? "Processing..." : undefined}
      />

      {state === "processing" ? (
        <View style={styles.processingContainer}>
          <View style={styles.processingCard}>
            <Ionicons name="analytics-outline" size={48} color={Colors.primary[400]} style={styles.processingIcon} />
            <Text style={styles.processingTitle}>Analyzing Thermal Data</Text>
            <Text style={styles.processingSubtitle}>
              Uploading and processing through the AI classification model...
            </Text>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, { width: progressWidth }]}
              />
            </View>

            {/* Step indicators */}
            <View style={styles.steps}>
              {["Uploading", "Processing", "Classifying"].map((step) => (
                <View key={step} style={styles.step}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeIn }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Classification result */}
          <ClassificationCard
            classification={MOCK_RESULT.classification}
            confidence={MOCK_RESULT.confidence_score}
            style={styles.section}
          />

          {/* Metadata row */}
          <View style={styles.metaRow}>
            <Badge label={MOCK_RESULT.model_version} variant="muted" />
            <View style={styles.processingTimeRow}>
              <Ionicons name="timer-outline" size={12} color={Colors.text.muted} />
              <Text style={styles.processingTime}> {MOCK_RESULT.processing_time_ms}ms</Text>
            </View>
          </View>

          {/* Thermal thumbnails */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Captured Frames</Text>
            <View style={styles.thumbRow}>
              <View style={styles.thumbContainer}>
                <ThermalMap
                  matrix={leftMatrix}
                  minTemp={29}
                  maxTemp={37}
                  width={THUMB_W}
                  height={THUMB_H}
                />
                <Text style={styles.thumbLabel}>LEFT FOOT</Text>
              </View>
              <View style={styles.thumbContainer}>
                <ThermalMap
                  matrix={rightMatrix}
                  minTemp={29}
                  maxTemp={37}
                  width={THUMB_W}
                  height={THUMB_H}
                />
                <Text style={styles.thumbLabel}>RIGHT FOOT</Text>
              </View>
            </View>
          </Card>

          {/* Angiosome asymmetry table */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Bilateral Asymmetry Analysis
            </Text>
            <Text style={styles.sectionSubtitle}>
              Values exceeding 2.2°C threshold are flagged
            </Text>
            <AngiosomeTable
              asymmetries={{
                mpa: MOCK_RESULT.asymmetry_mpa_c,
                lpa: MOCK_RESULT.asymmetry_lpa_c,
                mca: MOCK_RESULT.asymmetry_mca_c,
                lca: MOCK_RESULT.asymmetry_lca_c,
              }}
              flagged={MOCK_RESULT.angiosomes_flagged}
              style={styles.table}
            />
          </View>

          {/* TCI */}
          <TCIDisplay
            leftTci={0.038}
            rightTci={0.046}
            bilateralTci={MOCK_RESULT.bilateral_tci}
            style={styles.section}
          />

          {/* Disclaimer */}
          <Disclaimer text={DISCLAIMER_TEXT} style={styles.section} />

          {/* Actions */}
          {!saved ? (
            <View style={styles.actions}>
              {saveError && (
                <Text style={styles.saveError}>{saveError}</Text>
              )}
              <Button
                label="Discard Result"
                onPress={handleExit}
                variant="ghost"
                size="md"
              />
              <Button
                label="Save to Cloud"
                onPress={handleSave}
                loading={saving}
                variant="teal"
                size="lg"
              />
            </View>
          ) : (
            <View style={styles.savedBanner}>
              <View style={styles.savedRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.teal[300]} />
                <Text style={styles.savedText}> Session saved successfully</Text>
              </View>
              <Button
                label="New Session"
                onPress={handleExit}
                variant="primary"
                size="md"
              />
            </View>
          )}
        </Animated.ScrollView>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Processing state
  processingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  processingCard: {
    width: "100%",
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  processingIcon: { marginBottom: Spacing.lg },
  processingTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  processingSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: Colors.bg.glassLight,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary[400],
    borderRadius: 2,
  },
  steps: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  step: { alignItems: "center", gap: 4 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary[400],
  },
  stepText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },

  // Result state
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  processingTimeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  processingTime: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
  },

  // Thermal thumbs
  thumbRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  thumbContainer: { flex: 1 },
  thumbLabel: {
    fontSize: 9,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.muted,
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: Spacing.xs,
  },

  table: { marginTop: Spacing.sm },

  // Actions
  actions: {
    gap: Spacing.sm,
  },
  saveError: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: "#f87171",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  savedRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  savedBanner: {
    backgroundColor: "rgba(20,176,142,0.1)",
    borderWidth: 1,
    borderColor: "rgba(20,176,142,0.3)",
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.md,
  },
  savedText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    color: Colors.teal[300],
  },
});
