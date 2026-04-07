// app/(clinic)/dpn-result.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { Card, Disclaimer } from "../../components/ui/index";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useDPNStore } from "../../store/dpnStore";
import { useSessionStore, useThermalStore } from "../../store/sessionStore";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - Spacing.lg * 2 - Spacing.md) / 2;

const DPN_NOTE =
  "This result indicates the presence or absence of Diabetic Peripheral Neuropathy (DPN) in a patient already diagnosed with diabetes.";

export default function DPNResultScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { status, result, error, clearScan } = useDPNStore();
  const { activeSession, clearSession } = useSessionStore();
  const discardCapture = useThermalStore((s) => s.discardCapture);
  const clearBilateral = useThermalStore((s) => s.clearBilateral);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  //Cleanup helper
  const cleanup = () => {
    clearScan();
    clearSession();
    discardCapture();
    clearBilateral();
  };

  const handleDiscard = () => {
    cleanup();
    router.replace("/(clinic)");
  };

  //Save result to Supabase classification_results + update session status
  const handleSave = async () => {
    if (!activeSession?.id || !result) {
      setSaveError("No active session found. Please restart the screening.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const { error: classErr } = await supabase.from("classification_results").insert({
        session_id:         activeSession.id,
        classification:     result.is_diabetic ? "POSITIVE" : "NEGATIVE",
        confidence_score:   result.combined_confidence,
        max_asymmetry_c:    result.asymmetry.mean_temp_difference,
        // Angiosome-level breakdown not provided by this API version — saved as null
        asymmetry_mpa_c:    null,
        asymmetry_lpa_c:    null,
        asymmetry_mca_c:    null,
        asymmetry_lca_c:    null,
        angiosomes_flagged: null,
        bilateral_tci:      null,
        model_version:      "dpn-api-v1",
        processing_time_ms: null,
        classified_at:      new Date().toISOString(),
      });
      if (classErr) throw new Error("Failed to save classification result.");

      const { error: sessErr } = await supabase
        .from("screening_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", activeSession.id);
      if (sessErr) throw new Error("Failed to update session status.");

      setSaved(true);
      cleanup();
      router.replace({
        pathname: "/(clinic)/live-feed",
        params: { lastSessionId: activeSession.id },
      } as any);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  //Loading states — should not normally land here (assessment handles them),
  //but guard just in case the user navigates directly
  if (status === "loading") {
    return (
      <ScreenWrapper>
        <Header title="AI Assessment" />
        <View style={styles.centered}>
          <Text style={[styles.statusText, { color: colors.text }]}>Analyzing...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (status === "server_waking") {
    return (
      <ScreenWrapper>
        <Header title="AI Assessment" />
        <View style={styles.centered}>
          <Text style={[styles.statusText, { color: colors.text }]}>Server Waking Up</Text>
          <Text style={[styles.statusSub, { color: colors.textSec }]}>
            The AI server is starting up. Please wait.
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  //Error state
  if (status === "error") {
    return (
      <ScreenWrapper>
        <Header title="AI Assessment" />
        <View style={styles.centered}>
          <View style={[styles.errorIcon, { backgroundColor: `${colors.error}1A` }]}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
          </View>
          <Text style={[styles.statusText, { color: colors.text }]}>Analysis Failed</Text>
          <Text style={[styles.statusSub, { color: colors.textSec }]}>{error}</Text>
          <Button
            label="Try Again"
            onPress={handleDiscard}
            variant="primary"
            size="md"
            style={styles.retryBtn}
          />
        </View>
      </ScreenWrapper>
    );
  }

  //No result (idle — shouldn't normally reach here)
  if (!result) {
    return (
      <ScreenWrapper>
        <Header title="AI Assessment" />
        <View style={styles.centered}>
          <Text style={[styles.statusSub, { color: colors.textSec }]}>No result available.</Text>
          <Button label="Go Back" onPress={() => router.back()} variant="ghost" size="md" style={styles.retryBtn} />
        </View>
      </ScreenWrapper>
    );
  }

  //Success — display full result
  const { is_diabetic, combined_prediction, combined_confidence, diagnosis_factors, left_foot, right_foot, asymmetry } = result;
  const bannerColor  = is_diabetic ? colors.error : colors.success;
  const bannerBg     = `${bannerColor}1A`;
  const bannerBorder = `${bannerColor}4D`;

  return (
    <ScreenWrapper>
      <Header
        title="AI Assessment"
        subtitle="DPN Classification Result"
        leftIcon={<Ionicons name="chevron-back" size={24} color={colors.text} />}
        onLeftPress={() => router.back()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Result banner */}
        <View style={[styles.banner, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
          <Ionicons
            name={is_diabetic ? "warning-outline" : "checkmark-circle-outline"}
            size={36}
            color={bannerColor}
          />
          <View style={styles.bannerText}>
            <Text style={[styles.bannerTitle, { color: bannerColor }]}>
              {is_diabetic ? "DPN Detected" : "No DPN Detected"}
            </Text>
            <Text style={[styles.bannerSub, { color: colors.textSec }]}>
              {combined_prediction} · {(combined_confidence * 100).toFixed(1)}% confidence
            </Text>
          </View>
        </View>

        {/* Per-foot cards */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Per-Foot Analysis</Text>
        <View style={styles.footRow}>
          <FootCard label="Left Foot"  foot={left_foot}  colors={colors} />
          <FootCard label="Right Foot" foot={right_foot} colors={colors} />
        </View>

        {/* Temperature asymmetry */}
        <Card style={styles.section}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Temperature Asymmetry</Text>
          <View style={styles.asymmetryRow}>
            <Text style={[styles.asymmetryValue, { color: colors.text }]}>
              {asymmetry.mean_temp_difference.toFixed(2)}°C
            </Text>
            {asymmetry.asymmetry_significant && (
              <View style={[styles.warningPill, { backgroundColor: `${colors.warning}26`, borderColor: `${colors.warning}66` }]}>
                <Ionicons name="warning-outline" size={12} color={colors.warning} style={styles.warningIcon} />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  Clinically significant asymmetry (&gt;{asymmetry.threshold_used}°C)
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Diagnosis factors */}
        {diagnosis_factors.length > 0 && (
          <Card style={styles.section}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Diagnosis Factors</Text>
            {diagnosis_factors.map((factor, i) => (
              <View key={i} style={styles.factorRow}>
                <View style={[styles.factorDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.factorText, { color: colors.textSec }]}>{factor}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Clinical note */}
        <Disclaimer text={DPN_NOTE} style={styles.section} />

        {/* Actions */}
        {!saved ? (
          <View style={styles.actions}>
            {saveError && (
              <Text style={[styles.saveError, { color: colors.error }]}>{saveError}</Text>
            )}
            <Button
              label="Discard Result"
              onPress={handleDiscard}
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
          <View style={[styles.savedBanner, { backgroundColor: `${colors.success}1A`, borderColor: `${colors.success}4D` }]}>
            <View style={styles.savedRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
              <Text style={[styles.savedText, { color: colors.success }]}> Session saved successfully</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

//FootCard sub-component
function FootCard({
  label,
  foot,
  colors,
}: {
  label: string;
  foot: import("../../lib/dpnApi").FootResult;
  colors: import("../../constants/theme").ThemeColors;
}) {
  const dotColor = foot.is_diabetic ? colors.error : colors.success;
  return (
    <View style={[footStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[footStyles.label, { color: colors.textSec }]}>{label.toUpperCase()}</Text>
      <View style={footStyles.predRow}>
        <View style={[footStyles.dot, { backgroundColor: dotColor }]} />
        <Text style={[footStyles.pred, { color: dotColor }]}>{foot.prediction}</Text>
      </View>
      <Text style={[footStyles.conf, { color: colors.textSec }]}>
        {(foot.confidence * 100).toFixed(1)}% confidence
      </Text>
    </View>
  );
}

const footStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  label: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, letterSpacing: 1.5 },
  predRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pred: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.subheading },
  conf: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
});

const styles = StyleSheet.create({
  //Loading / error
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  statusText: { fontSize: Typography.sizes.xl, fontFamily: Typography.fonts.heading, textAlign: "center" },
  statusSub: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", lineHeight: 20 },
  errorIcon: { padding: Spacing.lg, borderRadius: Radius.full, marginBottom: Spacing.sm },
  retryBtn: { marginTop: Spacing.md },

  //Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  section: { marginBottom: Spacing.lg },

  //Banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: Typography.sizes["2xl"], fontFamily: Typography.fonts.heading, marginBottom: 2 },
  bannerSub: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body },

  //Foot cards
  sectionTitle: { fontSize: Typography.sizes.md, fontFamily: Typography.fonts.heading, marginBottom: Spacing.sm },
  footRow: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.lg },

  //Asymmetry
  cardTitle: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.subheading, marginBottom: Spacing.sm },
  asymmetryRow: { gap: Spacing.sm },
  asymmetryValue: { fontSize: Typography.sizes["2xl"], fontFamily: Typography.fonts.heading },
  warningPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  warningIcon: { marginRight: 4 },
  warningText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label },

  //Factors
  factorRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, marginTop: Spacing.sm },
  factorDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  factorText: { flex: 1, fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, lineHeight: 20 },

  //Actions
  actions: { gap: Spacing.sm },
  saveError: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", marginBottom: Spacing.xs },
  savedRow: { flexDirection: "row", alignItems: "center" },
  savedBanner: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: "center" },
  savedText: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.subheading },
});
