// app/(clinic)/dpn-result.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import DpnResultView from "../../components/thermal/DpnResultView";
import Button from "../../components/ui/Button";
import { Disclaimer } from "../../components/ui/index";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useDPNStore } from "../../store/dpnStore";
import { useSessionStore, useThermalStore } from "../../store/sessionStore";

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
        session_id:               activeSession.id,
        classification:           result.is_diabetic ? "POSITIVE" : "NEGATIVE",
        confidence_score:         result.combined_confidence,
        max_asymmetry_c:          result.asymmetry?.max_asymmetry ?? null,
        per_angiosome_asymmetry:  result.asymmetry?.region_asymmetry ?? null,
        left_regions:             result.left_foot?.regions ?? null,
        right_regions:            result.right_foot?.regions ?? null,
        mean_asymmetry:           result.asymmetry?.mean_asymmetry ?? null,
        left_foot_mean_temp_c:    result.asymmetry?.left_foot_mean_temp ?? null,
        right_foot_mean_temp_c:   result.asymmetry?.right_foot_mean_temp ?? null,
        angiosomes_flagged:       null,
        left_tci:                 null,
        right_tci:                null,
        bilateral_tci:            null,
        model_version:            "dpn-api-v1.1",
        classified_at:            new Date().toISOString(),
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
        <DpnResultView result={result} />

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

const styles = StyleSheet.create({
  centered: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: Spacing.xl, gap: Spacing.md,
  },
  statusText: { fontSize: Typography.sizes.xl, fontFamily: Typography.fonts.heading, textAlign: "center" },
  statusSub:  { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body,    textAlign: "center", lineHeight: 20 },
  errorIcon:  { padding: Spacing.lg, borderRadius: Radius.full, marginBottom: Spacing.sm },
  retryBtn:   { marginTop: Spacing.md },

  scroll:        { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop:    Spacing.md,
    paddingBottom: Spacing["2xl"],
    gap:           Spacing.md,
  },
  section: { marginTop: Spacing.md },

  actions: { gap: Spacing.sm, marginTop: Spacing.md },
  saveError:   { fontSize: Typography.sizes.sm,  fontFamily: Typography.fonts.body,        textAlign: "center", marginBottom: Spacing.xs },
  savedRow:    { flexDirection: "row", alignItems: "center" },
  savedBanner: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: "center", marginTop: Spacing.md },
  savedText:   { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.subheading },
});
