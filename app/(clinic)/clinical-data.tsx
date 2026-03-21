// app/(clinic)/clinical-data.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { VitalsForm } from "../../components/session/index";
import Button from "../../components/ui/Button";
import { Card, Disclaimer } from "../../components/ui/index";
import { ClinicalThresholds, DISCLAIMER_TEXT } from "../../constants/clinical";
import { Colors, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { useSessionStore, useThermalStore } from "../../store/sessionStore";

// Mock angiosome temps from capture
const MOCK_ANGIOSOMES = {
  left: { mpa: 32.4, lpa: 31.8, mca: 30.9, lca: 31.2 },
  right: { mpa: 32.1, lpa: 31.5, mca: 30.6, lca: 31.4 },
};

function AngiosomePreview({
  side,
  data,
}: {
  side: "left" | "right";
  data: { mpa: number; lpa: number; mca: number; lca: number };
}) {
  return (
    <View style={previewStyles.container}>
      <Text style={previewStyles.sideLabel}>{side.toUpperCase()} FOOT</Text>
      {(["mpa", "lpa", "mca", "lca"] as const).map((key) => (
        <View key={key} style={previewStyles.row}>
          <Text style={previewStyles.key}>{key.toUpperCase()}</Text>
          <Text style={previewStyles.value}>{data[key].toFixed(1)}°C</Text>
        </View>
      ))}
    </View>
  );
}

export default function ClinicalDataScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { selectedPatient, setActiveSession, clearSession } = useSessionStore();
  const { capturedMatrix, capturedFoot, minTemp, maxTemp, meanTemp } = useThermalStore();

  const [vitals, setVitals] = useState({
    blood_glucose: "",
    systolic_bp: "",
    diastolic_bp: "",
    heart_rate: "",
    hba1c: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (key: keyof typeof vitals, value: string) => {
    setVitals((v) => ({ ...v, [key]: value }));
    if (errors[key]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const { glucose, systolic, diastolic } = ClinicalThresholds;

    if (!vitals.blood_glucose) {
      e.blood_glucose = "Blood glucose is required";
    } else {
      const v = parseFloat(vitals.blood_glucose);
      if (isNaN(v) || v < glucose.min || v > glucose.max)
        e.blood_glucose = `Must be between ${glucose.min}–${glucose.max} mg/dL`;
    }

    if (vitals.systolic_bp || vitals.diastolic_bp) {
      const s = parseInt(vitals.systolic_bp);
      const d = parseInt(vitals.diastolic_bp);
      if (
        vitals.systolic_bp &&
        (isNaN(s) || s < systolic.min || s > systolic.max)
      )
        e.systolic_bp = `${systolic.min}–${systolic.max} mmHg`;
      if (
        vitals.diastolic_bp &&
        (isNaN(d) || d < diastolic.min || d > diastolic.max)
      )
        e.diastolic_bp = `${diastolic.min}–${diastolic.max} mmHg`;
      if (!isNaN(s) && !isNaN(d) && d >= s)
        e.diastolic_bp = "Diastolic must be less than systolic";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!selectedPatient) {
      setErrors({ _form: "No patient selected. Go back and select a patient." });
      return;
    }
    if (!user?.clinic_id) {
      setErrors({ _form: "Your account is not linked to a clinic." });
      return;
    }

    setLoading(true);
    try {
      // 1. Look up active device for this clinic
      const { data: device, error: devErr } = await supabase
        .from("devices")
        .select("id")
        .eq("clinic_id", user.clinic_id)
        .eq("is_active", true)
        .limit(1)
        .single();
      if (devErr || !device) throw new Error("No active device found for your clinic.");

      // 2. Create screening session
      const { data: session, error: sessErr } = await supabase
        .from("screening_sessions")
        .insert({
          patient_id: selectedPatient.id,
          operator_id: user.id,
          device_id: device.id,
          clinic_id: user.clinic_id,
          status: "uploading",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (sessErr || !session) throw new Error("Failed to create session.");

      // 3. Save patient vitals
      const { error: vitalsErr } = await supabase.from("patient_vitals").insert({
        session_id: session.id,
        blood_glucose_mgdl: parseFloat(vitals.blood_glucose),
        systolic_bp_mmhg: vitals.systolic_bp ? parseInt(vitals.systolic_bp) : null,
        diastolic_bp_mmhg: vitals.diastolic_bp ? parseInt(vitals.diastolic_bp) : null,
        heart_rate_bpm: vitals.heart_rate ? parseInt(vitals.heart_rate) : null,
        hba1c_pct: vitals.hba1c ? parseFloat(vitals.hba1c) : null,
      });
      if (vitalsErr) throw new Error("Failed to save vitals.");

      // 4. Save thermal capture
      if (capturedMatrix) {
        const { error: captureErr } = await supabase.from("thermal_captures").insert({
          session_id: session.id,
          foot: capturedFoot ?? "bilateral",
          thermal_matrix: capturedMatrix,
          min_temp_c: minTemp,
          max_temp_c: maxTemp,
          mean_temp_c: meanTemp,
          captured_at: new Date().toISOString(),
        });
        if (captureErr) throw new Error("Failed to save thermal capture.");
      }

      // 5. Store session in store and navigate
      setActiveSession({
        id: session.id,
        patient_id: selectedPatient.id,
        operator_id: user.id,
        device_id: device.id,
        clinic_id: user.clinic_id,
        status: "uploading",
        started_at: new Date().toISOString(),
      });

      router.push("/(clinic)/assessment");
    } catch (err: any) {
      setErrors({ _form: err.message ?? "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Clinical Data" subtitle="UI-05" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Captured temperatures summary */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Captured Thermal Data</Text>
            <Text style={styles.sectionSubtitle}>
              Pre-computed angiosome temperatures from the captured frame
            </Text>
            <View style={styles.angiosomeRow}>
              <AngiosomePreview side="left" data={MOCK_ANGIOSOMES.left} />
              <View style={styles.angiosomeDivider} />
              <AngiosomePreview side="right" data={MOCK_ANGIOSOMES.right} />
            </View>
          </Card>

          {/* Vitals form */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Vitals</Text>
            <Text style={styles.sectionSubtitle}>
              Enter measured vitals for this session. Blood glucose is required.
            </Text>
            <VitalsForm
              values={vitals}
              onChange={handleChange}
              errors={errors}
            />
          </Card>

          {/* Disclaimer */}
          <Disclaimer text={DISCLAIMER_TEXT} style={styles.disclaimer} />

          {/* Form-level error */}
          {errors._form && (
            <Text style={styles.formError}>{errors._form}</Text>
          )}

          {/* Submit */}
          <View style={styles.actions}>
            <Button
              label="Cancel Session"
              onPress={() => { clearSession(); router.replace("/(clinic)"); }}
              variant="ghost"
              size="md"
              style={styles.cancelBtn}
            />
            <Button
              label="Submit for AI Analysis →"
              onPress={handleSubmit}
              loading={loading}
              variant="primary"
              size="lg"
              style={styles.submitBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  angiosomeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  angiosomeDivider: {
    width: 1,
    backgroundColor: Colors.border.subtle,
    alignSelf: "stretch",
    marginHorizontal: Spacing.md,
  },
  disclaimer: { marginBottom: Spacing.lg },
  actions: {
    gap: Spacing.sm,
  },
  cancelBtn: {},
  submitBtn: {},
  formError: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: "#f87171",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
});

const previewStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sideLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.muted,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  key: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.primary[300],
  },
});
