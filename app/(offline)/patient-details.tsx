// app/(offline)/patient-details.tsx
// Offline-guest post-capture form. Pulls the bilateral capture artifacts
// out of useThermalStore (set by app/(offline)/live-feed.tsx during
// capture), takes minimal patient info, and persists the result via
// lib/thermal/bundleStorage.saveBundle so it shows up in the offline
// history list and bundle detail viewer.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Input from "../../components/ui/Input";
import Picker from "../../components/ui/Picker";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { saveBundle } from "../../lib/thermal/bundleStorage";
import { useThermalStore } from "../../store/sessionStore";

const SEX_OPTIONS = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
  { value: "other",  label: "Other" },
];

interface FormState {
  firstName:  string;
  middleName: string;
  lastName:   string;
  sex:        string;
  birthdate:  string;   // YYYY-MM-DD
  weightKg:   string;
  heightCm:   string;
}

const EMPTY_FORM: FormState = {
  firstName: "", middleName: "", lastName: "",
  sex: "", birthdate: "",
  weightKg: "", heightCm: "",
};

export default function OfflinePatientDetailsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const {
    leftSlot1B64, rightSlot1B64,
    leftSlot2B64, rightSlot2B64,
    leftSlot3B64, rightSlot3B64,
    leftCsvContent, rightCsvContent,
    leftStats, rightStats,
    clearBilateral,
  } = useThermalStore();

  const [form, setForm]     = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  // Disable Save when no captures are present — the user came here without
  // completing both feet (shouldn't normally happen, but guard cleanly).
  const haveCaptures = !!(leftStats && rightStats && leftSlot1B64 && rightSlot1B64);

  // Input format="date" stores 8 raw digits (YYYYMMDD); reformat when
  // handing off and validate by digit count + a real-Date sanity check.
  const formatBirthdate = (digits: string): string =>
    digits.length === 8 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}` : "";

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName.trim())  next.firstName = "First name is required.";
    if (!form.lastName.trim())   next.lastName  = "Last name is required.";
    if (!form.sex)               next.sex       = "Select a sex.";
    if (!/^\d{8}$/.test(form.birthdate)) {
      next.birthdate = "Enter date as YYYYMMDD.";
    } else {
      const iso = formatBirthdate(form.birthdate);
      const parsed = new Date(iso + "T00:00:00");
      if (Number.isNaN(parsed.getTime()) || iso !== parsed.toISOString().slice(0, 10)) {
        next.birthdate = "Date is not valid.";
      }
    }
    const w = parseFloat(form.weightKg);
    const h = parseFloat(form.heightCm);
    if (!Number.isFinite(w) || w <= 0)   next.weightKg = "Enter weight in kg.";
    if (!Number.isFinite(h) || h <= 0)   next.heightCm = "Enter height in cm.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!haveCaptures) {
      Alert.alert("Missing Captures", "Both feet must be captured before saving.");
      return;
    }
    if (!validate()) return;
    setSaving(true);
    try {
      const capturedAt = new Date().toISOString();
      await saveBundle(
        {
          first_name:  form.firstName.trim(),
          middle_name: form.middleName.trim(),
          last_name:   form.lastName.trim(),
          gender:      form.sex,
          birthdate:   formatBirthdate(form.birthdate),
          weight_kg:   parseFloat(form.weightKg),
          height_cm:   parseFloat(form.heightCm),
        },
        {
          raw_image_b64:       leftSlot1B64  ?? "",
          processed_image_b64: leftSlot2B64  ?? "",
          isolated_image_b64:  leftSlot3B64  ?? "",
          csv_content:         leftCsvContent ?? "",
          stats:               leftStats!,
        },
        {
          raw_image_b64:       rightSlot1B64  ?? "",
          processed_image_b64: rightSlot2B64  ?? "",
          isolated_image_b64:  rightSlot3B64  ?? "",
          csv_content:         rightCsvContent ?? "",
          stats:               rightStats!,
        },
        capturedAt,
      );
      clearBilateral();
      Alert.alert(
        "Saved Locally",
        "Bundle saved to this device. Open it any time from Saved Bundles.",
        [{ text: "View Bundles", onPress: () => router.replace("/(offline)/history" as any) }],
      );
    } catch (e) {
      console.warn("[offline/patient-details] save failed:", e);
      Alert.alert("Save Failed", e instanceof Error ? e.message : "Could not save the bundle. Try again.");
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
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Patient form */}
          <Text style={[styles.section, { color: colors.textSec }]}>PATIENT</Text>

          <Input
            label="First name"
            value={form.firstName}
            onChangeText={(v) => setForm({ ...form, firstName: v })}
            autoCapitalize="words"
            error={errors.firstName}
          />
          <Input
            label="Middle name"
            optional
            value={form.middleName}
            onChangeText={(v) => setForm({ ...form, middleName: v })}
            autoCapitalize="words"
          />
          <Input
            label="Last name"
            value={form.lastName}
            onChangeText={(v) => setForm({ ...form, lastName: v })}
            autoCapitalize="words"
            error={errors.lastName}
          />

          <Picker
            label="Sex"
            value={form.sex || null}
            options={SEX_OPTIONS}
            onChange={(v) => setForm({ ...form, sex: v })}
            error={errors.sex}
          />

          <Input
            label="Date of birth"
            format="date"
            placeholder="YYYY-MM-DD"
            value={form.birthdate}
            onChangeText={(v) => setForm({ ...form, birthdate: v })}
            error={errors.birthdate}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="Weight (kg)"
                value={form.weightKg}
                onChangeText={(v) => setForm({ ...form, weightKg: v.replace(/[^0-9.]/g, "") })}
                keyboardType="decimal-pad"
                error={errors.weightKg}
              />
            </View>
            <View style={{ width: Spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Input
                label="Height (cm)"
                value={form.heightCm}
                onChangeText={(v) => setForm({ ...form, heightCm: v.replace(/[^0-9.]/g, "") })}
                keyboardType="decimal-pad"
                error={errors.heightCm}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !haveCaptures}
            activeOpacity={0.85}
            style={[
              styles.saveBtn,
              { backgroundColor: colors.accent },
              (saving || !haveCaptures) && styles.saveBtnDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save to Device</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.footerHint, { color: colors.textSec }]}>
            Saved offline. Open from "Saved Bundles" any time. Sign in to sync to a clinic later.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing["2xl"], gap: Spacing.sm },

  section: {
    fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.heading,
    letterSpacing: 1.5, textTransform: "uppercase",
    marginTop: Spacing.sm, marginBottom: Spacing.xs, marginLeft: Spacing.xs,
  },

  row: { flexDirection: "row", alignItems: "flex-start" },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: Radius.lg, paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading, letterSpacing: 0.5 },
  footerHint: {
    fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body,
    textAlign: "center", marginTop: Spacing.md, lineHeight: 18,
  },
});
