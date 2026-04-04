// app/(offline)/save.tsx
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
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { generateLocalId } from "../../lib/db/localDb";
import { saveCapture } from "../../lib/db/offlineCaptures";

export default function OfflineSaveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    b64: string;
    foot: string;
    minTemp: string;
    maxTemp: string;
    meanTemp: string;
  }>();

  //Form state
  const [patientLabel, setPatientLabel] = useState("");
  const [bloodGlucose, setBloodGlucose] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!patientLabel.trim()) {
      Alert.alert("Patient Label Required", "Enter a name or ID to identify this capture.");
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
        "Saved Locally",
        "Capture saved to this device. Sign in later to sync it to your account.",
        [{ text: "OK", onPress: () => router.replace("/(offline)/live-feed") }]
      );
    } catch (e) {
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
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={Colors.text.primary} />
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
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Ionicons name="thermometer-outline" size={16} color={Colors.teal[400]} />
              <Text style={styles.summaryText}>
                {params.minTemp ? `${parseFloat(params.minTemp).toFixed(1)}°C` : "--"} — {params.maxTemp ? `${parseFloat(params.maxTemp).toFixed(1)}°C` : "--"}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="footsteps-outline" size={16} color={Colors.teal[400]} />
              <Text style={styles.summaryText}>
                {params.foot ? params.foot.charAt(0).toUpperCase() + params.foot.slice(1) : "Bilateral"} foot
              </Text>
            </View>
          </View>

          {/* Patient label — required */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Patient Label <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.hint}>
              A name or ID to identify this capture. You can match it to a real patient account when you sync.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John D., Patient 001"
              placeholderTextColor={Colors.text.muted}
              value={patientLabel}
              onChangeText={setPatientLabel}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Vitals — optional */}
          <View style={styles.section}>
            <Text style={styles.label}>Vitals <Text style={styles.optional}>(optional)</Text></Text>

            <Text style={styles.inputLabel}>Blood Glucose (mg/dL)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 120"
              placeholderTextColor={Colors.text.muted}
              value={bloodGlucose}
              onChangeText={setBloodGlucose}
              keyboardType="numeric"
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Blood Pressure</Text>
            <View style={styles.bpRow}>
              <TextInput
                style={[styles.input, styles.bpInput]}
                placeholder="Systolic"
                placeholderTextColor={Colors.text.muted}
                value={systolic}
                onChangeText={setSystolic}
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.bpSlash}>/</Text>
              <TextInput
                style={[styles.input, styles.bpInput]}
                placeholder="Diastolic"
                placeholderTextColor={Colors.text.muted}
                value={diastolic}
                onChangeText={setDiastolic}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
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

          <Text style={styles.footerHint}>
            Saved captures can be synced to your account from the History screen after signing in.
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
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  summaryText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, color: Colors.text.secondary },
  section: { gap: Spacing.sm },
  label: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading, color: Colors.text.primary },
  required: { color: "#f87171" },
  optional: { color: Colors.text.muted, fontFamily: Typography.fonts.body },
  hint: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, color: Colors.text.muted, lineHeight: 18 },
  inputLabel: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, color: Colors.text.muted, letterSpacing: 0.5, marginTop: Spacing.xs },
  input: {
    backgroundColor: Colors.bg.glassLight,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.primary,
  },
  bpRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  bpInput: { flex: 1 },
  bpSlash: { fontSize: Typography.sizes.lg, color: Colors.text.muted, fontFamily: Typography.fonts.body },
  saveBtn: {
    backgroundColor: Colors.teal[600],
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
    color: Colors.text.muted,
    textAlign: "center",
    lineHeight: 18,
  },
});
