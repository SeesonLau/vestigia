// app/(patient)/save.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { generateLocalId } from "../../lib/db/localDb";
import { saveCapture } from "../../lib/db/offlineCaptures";
import { useAuthStore } from "../../store/authStore";

export default function PatientSaveScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const params = useLocalSearchParams<{
    b64: string;
    foot: string;
    minTemp: string;
    maxTemp: string;
    meanTemp: string;
  }>();

  //Form state — patient label pre-filled with their name
  const [patientLabel, setPatientLabel] = useState(user?.full_name ?? "");
  const [bloodGlucose, setBloodGlucose] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!patientLabel.trim()) {
      Alert.alert("Label Required", "Enter a name or ID to identify this capture.");
      return;
    }

    setSaving(true);
    try {
      await saveCapture({
        id: generateLocalId(),
        patient_label: patientLabel.trim(),
        foot_side: (params.foot as any) ?? "bilateral",
        thermal_matrix_b64: params.b64 ?? "",
        min_temp: parseFloat(params.minTemp ?? "0"),
        max_temp: parseFloat(params.maxTemp ?? "0"),
        mean_temp: parseFloat(params.meanTemp ?? "0"),
        blood_glucose_mgdl: bloodGlucose ? parseFloat(bloodGlucose) : undefined,
        systolic_bp_mmhg: systolic ? parseFloat(systolic) : undefined,
        diastolic_bp_mmhg: diastolic ? parseFloat(diastolic) : undefined,
        captured_at: new Date().toISOString(),
      });

      Alert.alert(
        "Saved",
        "Capture saved to this device. View it in your History.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch {
      Alert.alert("Save Failed", "Could not save the capture. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header
        title="Save Capture"
        leftIcon={
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back" accessibilityRole="button">
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Capture summary */}
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <Ionicons name="thermometer-outline" size={16} color={colors.success} />
              <Text style={[styles.summaryText, { color: colors.textSec }]}>
                {params.minTemp ? `${parseFloat(params.minTemp).toFixed(1)}°C` : "--"} — {params.maxTemp ? `${parseFloat(params.maxTemp).toFixed(1)}°C` : "--"}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="footsteps-outline" size={16} color={colors.success} />
              <Text style={[styles.summaryText, { color: colors.textSec }]}>
                {params.foot ? params.foot.charAt(0).toUpperCase() + params.foot.slice(1) : "Bilateral"} foot
              </Text>
            </View>
          </View>

          {/* Patient label */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Your Name / ID <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Juan Dela Cruz"
              placeholderTextColor={colors.textSec}
              value={patientLabel}
              onChangeText={setPatientLabel}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Vitals — optional */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Vitals <Text style={[styles.optional, { color: colors.textSec }]}>(optional)</Text>
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSec }]}>Blood Glucose (mg/dL)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 120"
              placeholderTextColor={colors.textSec}
              value={bloodGlucose}
              onChangeText={setBloodGlucose}
              keyboardType="numeric"
              returnKeyType="next"
            />

            <Text style={[styles.inputLabel, { color: colors.textSec }]}>Blood Pressure</Text>
            <View style={styles.bpRow}>
              <TextInput
                style={[styles.input, styles.bpInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Systolic"
                placeholderTextColor={colors.textSec}
                value={systolic}
                onChangeText={setSystolic}
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={[styles.bpSlash, { color: colors.textSec }]}>/</Text>
              <TextInput
                style={[styles.input, styles.bpInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Diastolic"
                placeholderTextColor={colors.textSec}
                value={diastolic}
                onChangeText={setDiastolic}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.success }, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save to Device</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.footerHint, { color: colors.textSec }]}>
            Saved captures are stored on this device and visible in your History.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing["3xl"] },
  summaryCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  summaryText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body },
  section: { gap: Spacing.sm },
  label: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading },
  optional: { fontFamily: Typography.fonts.body },
  inputLabel: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, letterSpacing: 0.5, marginTop: Spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
  },
  bpRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  bpInput: { flex: 1 },
  bpSlash: { fontSize: Typography.sizes.lg, fontFamily: Typography.fonts.body },
  saveBtn: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading, color: "#fff" },
  footerHint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    lineHeight: 18,
  },
});
