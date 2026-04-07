// app/(clinic)/register-patient.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { useSessionStore } from "../../store/sessionStore";
import { Patient } from "../../types";

type SexOption = "male" | "female" | "other";
type DiabetesType = "type1" | "type2" | "gestational" | "unknown";

const SEX_OPTIONS: { value: SexOption; label: string }[] = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
  { value: "other",  label: "Other" },
];

const DIABETES_OPTIONS: { value: DiabetesType; label: string }[] = [
  { value: "type1",       label: "Type 1" },
  { value: "type2",       label: "Type 2" },
  { value: "gestational", label: "Gestational" },
  { value: "unknown",     label: "Unknown" },
];

//SegmentedGroup
function SegmentedGroup<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={seg.wrap}>
      {options.map((opt, i) => {
        const active = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.75}
            style={[
              seg.btn,
              { borderColor: colors.border, backgroundColor: active ? colors.accent : colors.surface },
              i === 0 && seg.first,
              i === options.length - 1 && seg.last,
            ]}
          >
            <Text style={[seg.label, { color: active ? colors.textInverse : colors.textSec }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

//FieldLabel
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.fieldLabel, { color: colors.textSec }]}>
      {label}
      {required && <Text style={{ color: colors.error }}> *</Text>}
    </Text>
  );
}

export default function RegisterPatientScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const setSelectedPatient = useSessionStore((s) => s.setSelectedPatient);

  //Form state
  const [patientCode, setPatientCode] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<SexOption | null>(null);
  const [diabetesType, setDiabetesType] = useState<DiabetesType | null>(null);
  const [durationYears, setDurationYears] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const handleRegister = async () => {
    const code = patientCode.trim();
    if (!code) {
      Alert.alert("Required", "Patient code is required.");
      return;
    }
    if (!user?.clinic_id) {
      Alert.alert("Error", "Your account is not linked to a clinic.");
      return;
    }

    //Validate DOB format if provided
    if (dob.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      Alert.alert("Invalid Date", "Date of birth must be in YYYY-MM-DD format.");
      return;
    }

    //Validate duration if provided
    const duration = durationYears.trim() ? parseInt(durationYears.trim(), 10) : undefined;
    if (durationYears.trim() && (isNaN(duration!) || duration! < 0 || duration! > 100)) {
      Alert.alert("Invalid Duration", "Diabetes duration must be a number between 0 and 100.");
      return;
    }

    setSaving(true);
    const payload: Partial<Patient> = {
      clinic_id:                user.clinic_id,
      patient_code:             code,
      date_of_birth:            dob.trim() || undefined,
      sex:                      sex ?? undefined,
      diabetes_type:            diabetesType ?? undefined,
      diabetes_duration_years:  duration,
      notes:                    notes.trim() || undefined,
    };

    const { data, error } = await supabase
      .from("patients")
      .insert(payload)
      .select()
      .single();

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        Alert.alert("Duplicate Code", "A patient with this code already exists in your clinic.");
      } else {
        Alert.alert("Error", "Failed to register patient. Check your connection and try again.");
      }
      return;
    }

    //Select the new patient and proceed to live feed
    setSelectedPatient(data as Patient);
    router.replace("/(clinic)/live-feed");
  };

  return (
    <ScreenWrapper>
      <Header
        title="Register Patient"
        leftIcon={<Ionicons name="chevron-back" size={24} color={colors.text} />}
        onLeftPress={() => router.back()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Code */}
        <FieldLabel label="Patient Code" required />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="e.g. PAT-0001"
          placeholderTextColor={colors.textSec}
          value={patientCode}
          onChangeText={setPatientCode}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        {/* Date of Birth */}
        <FieldLabel label="Date of Birth" />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSec}
          value={dob}
          onChangeText={setDob}
          keyboardType="numeric"
          maxLength={10}
        />

        {/* Sex */}
        <FieldLabel label="Sex" />
        <SegmentedGroup options={SEX_OPTIONS} selected={sex} onSelect={setSex} />

        {/* Diabetes Type */}
        <FieldLabel label="Diabetes Type" />
        <SegmentedGroup options={DIABETES_OPTIONS} selected={diabetesType} onSelect={setDiabetesType} />

        {/* Duration */}
        <FieldLabel label="Diabetes Duration (years)" />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="e.g. 5"
          placeholderTextColor={colors.textSec}
          value={durationYears}
          onChangeText={setDurationYears}
          keyboardType="numeric"
          maxLength={3}
        />

        {/* Notes */}
        <FieldLabel label="Notes" />
        <TextInput
          style={[styles.input, styles.textarea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Optional clinical notes..."
          placeholderTextColor={colors.textSec}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Info note */}
        <View style={[styles.infoBox, { backgroundColor: colors.accentSoft, borderColor: `${colors.accent}33` }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.accent} style={{ marginTop: 1 }} />
          <Text style={[styles.infoText, { color: colors.textSec }]}>
            After registering, this patient will be automatically selected for the current screening session.
          </Text>
        </View>

        {/* Submit */}
        <Button
          label={saving ? "Registering..." : "Register & Start Session"}
          onPress={handleRegister}
          variant="teal"
          size="lg"
          style={styles.submitBtn}
        />
        {saving && <ActivityIndicator color={colors.accent} style={{ marginTop: Spacing.sm }} />}
      </ScrollView>
    </ScreenWrapper>
  );
}

const seg = StyleSheet.create({
  wrap: { flexDirection: "row", marginBottom: Spacing.lg },
  btn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderWidth: 1,
  },
  first: { borderRadius: Radius.md, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  last:  { borderRadius: Radius.md, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  label: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.label },
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["3xl"],
  },
  fieldLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    marginBottom: Spacing.lg,
    height: 48,
  },
  textarea: {
    height: 88,
    paddingTop: Spacing.sm,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    lineHeight: 20,
  },
  submitBtn: { width: "100%" },
});
