// components/thermal/PatientDetailsScreen.tsx
//Post-capture form. Two modes:
//  - mode='clinic'  → operator types the patient's global ID, the screen looks
//                     up profiles + ensures a patients row exists at this clinic.
//                     Identity is read-only after lookup; only weight/height
//                     are manual.
//  - mode='patient' → identity is read straight from authStore.user; only
//                     weight/height are manual.
//On submit it uploads raw/processed/isolated PNGs + CSV per foot and inserts
//the screening_sessions + thermal_captures rows. Clinic flow then routes to
//the DPN assessment screen; patient flow alerts and goes home.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert, Dimensions, Image, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import Header from "../layout/Header";
import ScreenWrapper from "../layout/ScreenWrapper";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import type { ThemeColors } from "../../constants/theme";
import { calculateAge, calculateBMI, bmiCategory } from "../../lib/thermal/bundleUtils";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { useSessionStore, useThermalStore } from "../../store/sessionStore";

const SCREEN_W = Dimensions.get("window").width;
const THUMB_W  = (SCREEN_W - Spacing.lg * 2 - Spacing.md) / 2;
const THUMB_H  = Math.round(THUMB_W * (120 / 160));

interface Identity {
  profile_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  sex: "male" | "female" | "other" | null;
  date_of_birth: string | null;
  patient_code: string;
}

interface Props {
  mode: "clinic" | "patient";
  headerLeft?: React.ReactNode;
}

export default function PatientDetailsScreen({ mode, headerLeft }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { setActiveSession } = useSessionStore();
  const {
    leftMatrix, rightMatrix,
    leftRawB64, rightRawB64,
    leftProcessedB64, rightProcessedB64,
    leftIsolatedB64, rightIsolatedB64,
    leftCsvContent, rightCsvContent,
    leftStats, rightStats,
    clearBilateral,
  } = useThermalStore();

  //Identity — for patient mode, derive from authStore on mount.
  const [identity, setIdentity] = useState<Identity | null>(() => {
    if (mode !== "patient" || !user || user.role !== "patient") return null;
    return {
      profile_id:    user.id,
      first_name:    user.first_name,
      middle_name:   user.middle_name ?? null,
      last_name:     user.last_name,
      full_name:     user.full_name,
      sex:           user.sex ?? null,
      date_of_birth: user.date_of_birth ?? null,
      patient_code:  user.patient_code ?? "",
    };
  });

  //Clinic-mode lookup state
  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  //Manual fields
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");

  //Submit state
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleLookup = async () => {
    const q = code.trim().toUpperCase();
    if (!q) {
      setLookupError("Enter the patient's ID.");
      return;
    }
    setSearching(true);
    setLookupError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, patient_code, full_name, first_name, middle_name, last_name, sex, date_of_birth, role")
      .eq("patient_code", q)
      .maybeSingle();
    setSearching(false);
    if (error) {
      setLookupError("Lookup failed. Check your connection.");
      return;
    }
    if (!data || data.role !== "patient") {
      setLookupError("No patient found with that ID.");
      return;
    }
    setIdentity({
      profile_id:    data.id,
      first_name:    data.first_name,
      middle_name:   data.middle_name ?? null,
      last_name:     data.last_name,
      full_name:     data.full_name,
      sex:           data.sex ?? null,
      date_of_birth: data.date_of_birth ?? null,
      patient_code:  data.patient_code,
    });
  };

  //Validate manual fields
  const weight = parseFloat(weightKg);
  const height = parseFloat(heightCm);
  const age = identity?.date_of_birth ? calculateAge(identity.date_of_birth) : null;
  const bmi = (!isNaN(weight) && !isNaN(height) && weight > 0 && height > 0)
    ? calculateBMI(weight, height) : null;

  function validate(): string | null {
    if (!identity) return mode === "clinic" ? "Look up the patient first." : "Patient identity not loaded.";
    if (isNaN(weight) || weight <= 0) return "Enter a valid weight (kg).";
    if (isNaN(height) || height <= 0) return "Enter a valid height (cm).";
    if (!leftProcessedB64 || !rightProcessedB64) return "Both foot captures are required.";
    if (!leftIsolatedB64 || !rightIsolatedB64)   return "Capture data is incomplete.";
    if (!leftCsvContent || !rightCsvContent)     return "Capture CSV is missing.";
    return null;
  }

  const uploadPng = async (b64: string | null, sessionId: string, foot: string, kind: string) => {
    if (!b64) return null;
    const path = `${sessionId}/${foot}/${kind}.png`;
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const { error } = await supabase.storage
      .from("thermal-images")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    return error ? null : path;
  };

  const uploadCsv = async (text: string | null, sessionId: string, foot: string) => {
    if (!text) return null;
    const path = `${sessionId}/${foot}.csv`;
    const { error } = await supabase.storage
      .from("thermal-csv")
      .upload(path, text, { contentType: "text/csv", upsert: true });
    return error ? null : path;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    if (!user) { setFormError("Not signed in."); return; }
    setFormError(null);
    setSaving(true);
    try {
      let clinicId: string | null = null;
      let patientId: string | null = null;
      let deviceId: string | null = null;

      if (mode === "clinic") {
        if (!user.clinic_id) throw new Error("Your account is not linked to a clinic.");
        clinicId = user.clinic_id;

        //Find an active device for this clinic
        const dev = await supabase
          .from("devices")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        deviceId = dev.data?.id ?? null;

        //Find or create the patients row at this clinic
        const existing = await supabase
          .from("patients")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("profile_id", identity!.profile_id)
          .maybeSingle();

        if (existing.data) {
          patientId = existing.data.id;
          //Refresh height/weight on the existing record
          await supabase.from("patients")
            .update({ height_cm: height, weight_kg: weight })
            .eq("id", patientId);
        } else {
          const inserted = await supabase
            .from("patients")
            .insert({
              clinic_id:    clinicId,
              profile_id:   identity!.profile_id,
              first_name:   identity!.first_name,
              middle_name:  identity!.middle_name,
              last_name:    identity!.last_name,
              sex:          identity!.sex,
              date_of_birth: identity!.date_of_birth,
              height_cm:    height,
              weight_kg:    weight,
            })
            .select("id")
            .single();
          if (inserted.error || !inserted.data) {
            throw new Error(inserted.error?.message ?? "Failed to create patient record.");
          }
          patientId = inserted.data.id;
        }
      }

      const startedAt = new Date().toISOString();
      const patientSnapshot = {
        first_name:    identity!.first_name,
        middle_name:   identity!.middle_name,
        last_name:     identity!.last_name,
        sex:           identity!.sex,
        date_of_birth: identity!.date_of_birth,
        height_cm:     height,
        weight_kg:     weight,
      };

      const { data: session, error: sessErr } = await supabase
        .from("screening_sessions")
        .insert({
          subject_profile_id: identity!.profile_id,
          patient_id:         patientId,
          clinic_id:          clinicId,
          operator_id:        user.id,
          device_id:          deviceId,
          capture_mode:       mode === "clinic" ? "clinical" : "patient_self",
          status:             "uploading",
          patient_snapshot:   patientSnapshot,
          started_at:         startedAt,
        })
        .select("id, bundle_code")
        .single();
      if (sessErr || !session) throw new Error(sessErr?.message ?? "Failed to create session.");

      type FootEntry = {
        foot: "left" | "right";
        matrix: number[][];
        rawB64: string | null;
        processedB64: string | null;
        isolatedB64: string | null;
        csv: string | null;
        stats: { min: number; max: number; mean: number } | null;
      };
      const entries: FootEntry[] = [
        { foot: "left",  matrix: leftMatrix  ?? [], rawB64: leftRawB64,  processedB64: leftProcessedB64,  isolatedB64: leftIsolatedB64,  csv: leftCsvContent,  stats: leftStats },
        { foot: "right", matrix: rightMatrix ?? [], rawB64: rightRawB64, processedB64: rightProcessedB64, isolatedB64: rightIsolatedB64, csv: rightCsvContent, stats: rightStats },
      ];

      for (const e of entries) {
        const [rawPath, processedPath, isolatedPath, csvPath] = await Promise.all([
          uploadPng(e.rawB64,       session.id, e.foot, "raw"),
          uploadPng(e.processedB64, session.id, e.foot, "processed"),
          uploadPng(e.isolatedB64,  session.id, e.foot, "isolated"),
          uploadCsv(e.csv,          session.id, e.foot),
        ]);
        if (!processedPath || !isolatedPath) {
          throw new Error(`Failed to upload ${e.foot} foot images.`);
        }

        const { error: capErr } = await supabase.from("thermal_captures").insert({
          session_id: session.id,
          foot:       e.foot,
          thermal_matrix: e.matrix,
          min_temp_c: e.stats?.min ?? 0,
          max_temp_c: e.stats?.max ?? 0,
          mean_temp_c: e.stats?.mean ?? 0,
          resolution_x: e.matrix[0]?.length ?? 160,
          resolution_y: e.matrix.length ?? 120,
          raw_image_path:       rawPath,
          processed_image_path: processedPath,
          isolated_image_path:  isolatedPath,
          csv_path:             csvPath,
          captured_at: startedAt,
        });
        if (capErr) throw new Error(`Failed to save ${e.foot} thermal capture.`);
      }

      setActiveSession({
        id:                  session.id,
        bundle_code:         session.bundle_code ?? null,
        subject_profile_id:  identity!.profile_id,
        patient_id:          patientId,
        clinic_id:           clinicId,
        operator_id:         user.id,
        device_id:           deviceId,
        capture_mode:        mode === "clinic" ? "clinical" : "patient_self",
        status:              "uploading",
        started_at:          startedAt,
      });
      clearBilateral();

      if (mode === "clinic") {
        router.replace("/(clinic)/assessment");
      } else {
        Alert.alert(
          "Capture Saved",
          "Your thermal capture has been saved to your account.",
          [{ text: "OK", onPress: () => router.replace("/(patient)") }],
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header
        title="Patient Details"
        leftIcon={headerLeft ?? (
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Capture thumbnails */}
          <View style={[styles.thumbRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <FootThumb label="Left Foot"  b64={leftProcessedB64}  stats={leftStats}  colors={colors} />
            <View style={[styles.thumbDivider, { backgroundColor: colors.border }]} />
            <FootThumb label="Right Foot" b64={rightProcessedB64} stats={rightStats} colors={colors} />
          </View>

          {/* Clinic-only: patient ID lookup */}
          {mode === "clinic" && !identity ? (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Patient ID</Text>
              <View style={styles.lookupRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Patient ID"
                    value={code}
                    onChangeText={(v) => { setCode(v); setLookupError(null); }}
                    autoCapitalize="characters"
                    error={lookupError ?? undefined}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleLookup}
                  disabled={searching}
                  style={[styles.lookupBtn, { backgroundColor: colors.accent }]}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={searching ? "ellipsis-horizontal" : "search"}
                    size={18}
                    color={colors.textInverse}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Identity card (read-only) */}
          {identity ? (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Patient</Text>
              <Text style={[styles.identityCode, { color: colors.textSec }]}>{identity.patient_code}</Text>
              <Text style={[styles.identityName, { color: colors.text }]}>{identity.full_name}</Text>
              <Text style={[styles.identityMeta, { color: colors.textSec }]}>
                {identity.sex ? identity.sex.charAt(0).toUpperCase() + identity.sex.slice(1) : "—"}
                {identity.date_of_birth ? ` · ${identity.date_of_birth}` : ""}
                {age !== null ? ` · ${age} yrs` : ""}
              </Text>
              {mode === "clinic" ? (
                <TouchableOpacity
                  onPress={() => { setIdentity(null); setCode(""); }}
                  style={styles.changeRow}
                >
                  <Ionicons name="swap-horizontal" size={14} color={colors.accent} />
                  <Text style={[styles.changeText, { color: colors.accent }]}>Change patient</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Manual fields */}
          {identity ? (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Vitals</Text>
              <Input
                label="Weight (kg)"
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
              />
              <Input
                label="Height (cm)"
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="decimal-pad"
              />

              {bmi !== null ? (
                <View style={[styles.bmiRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.bmiLabel, { color: colors.textSec }]}>BMI</Text>
                  <Text style={[styles.bmiValue, { color: colors.accent }]}>
                    {bmi.toFixed(1)} · {bmiCategory(bmi)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {formError ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{formError}</Text>
          ) : null}

          {identity ? (
            <Button
              label={mode === "clinic" ? "Continue to Assessment" : "Save Capture"}
              onPress={handleSubmit}
              loading={saving}
              variant="teal"
              size="lg"
              style={styles.saveBtn}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

function FootThumb({
  label, b64, stats, colors,
}: {
  label: string; b64: string | null;
  stats: { min: number; max: number; mean: number } | null; colors: ThemeColors;
}) {
  return (
    <View style={styles.thumbCell}>
      <Text style={[styles.thumbLabel, { color: colors.textSec }]}>{label.toUpperCase()}</Text>
      {b64 ? (
        <Image
          source={{ uri: "data:image/png;base64," + b64 }}
          style={[styles.thumbImg, { borderColor: colors.border }]}
          resizeMode="contain"
          fadeDuration={0}
        />
      ) : (
        <View style={[styles.thumbImg, { borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }]}>
          <Ionicons name="image-outline" size={24} color={colors.border} />
        </View>
      )}
      {stats ? (
        <Text style={[styles.thumbStats, { color: colors.textSec }]}>
          {stats.min.toFixed(1)}° – {stats.max.toFixed(1)}°  avg {stats.mean.toFixed(1)}°C
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing["3xl"], gap: Spacing.lg },

  thumbRow:     { flexDirection: "row", borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.sm },
  thumbCell:    { flex: 1, alignItems: "center", gap: 4 },
  thumbDivider: { width: 1, marginHorizontal: Spacing.xs },
  thumbLabel:   { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1.5 },
  thumbImg:     { width: THUMB_W, height: THUMB_H, borderRadius: Radius.md, borderWidth: 1 },
  thumbStats:   { fontSize: 9, fontFamily: Typography.fonts.mono, textAlign: "center" },

  section: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },

  lookupRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  lookupBtn: {
    width: 58,
    height: 58,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  identityCode: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    letterSpacing: 0.5,
  },
  identityName: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
    marginTop: 4,
  },
  identityMeta: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    marginTop: 4,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.sm,
  },
  changeText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
  },

  bmiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  bmiLabel: {
    fontSize: 11,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  bmiValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.heading,
  },

  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center" },
  saveBtn:   { marginTop: Spacing.xs },
});
