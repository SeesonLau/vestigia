// app/(clinic)/register-patient.tsx
//Pre-redesign: this screen created a brand-new patient row with a
//clinic-scoped patient_code. Post-redesign: patients self-register
//and own a global profile.patient_code; this screen looks up that
//profile by code and (optionally) records clinical data on a new
//patients row that links back to it.

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

type DiabetesType = "type1" | "type2" | "gestational" | "unknown";

//Patient ID auto-mask: XXX-YYYYMMDD-HHMM-NN (17 clean chars + 3 dashes)
const cleanPatientId = (raw: string) =>
  raw.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 17);
const formatPatientId = (clean: string) => {
  if (clean.length <= 3)  return clean;
  if (clean.length <= 11) return clean.slice(0, 3) + "-" + clean.slice(3);
  if (clean.length <= 15) return clean.slice(0, 3) + "-" + clean.slice(3, 11) + "-" + clean.slice(11);
  return clean.slice(0, 3) + "-" + clean.slice(3, 11) + "-" + clean.slice(11, 15) + "-" + clean.slice(15);
};

const DIABETES_OPTIONS: { value: DiabetesType; label: string }[] = [
  { value: "type1",       label: "Type 1" },
  { value: "type2",       label: "Type 2" },
  { value: "gestational", label: "Gestational" },
  { value: "unknown",     label: "Unknown" },
];

interface ProfileLookup {
  id: string;
  patient_code: string;
  full_name: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  sex: "male" | "female" | "other" | null;
  date_of_birth: string | null;
  contact_number: string | null;
}

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

  //Lookup state
  const [code, setCode]           = useState("");
  const [searching, setSearching] = useState(false);
  const [profile, setProfile]     = useState<ProfileLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  //Clinical fields
  const [diabetesType, setDiabetesType] = useState<DiabetesType | null>(null);
  const [durationYears, setDurationYears] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const handleLookup = async () => {
    //Patient ID is stored clean (no dashes) — re-insert them for the lookup.
    const q = code.length === 17
      ? `${code.slice(0, 3)}-${code.slice(3, 11)}-${code.slice(11, 15)}-${code.slice(15)}`
      : code.trim().toUpperCase();
    if (!q) {
      Alert.alert("Required", "Enter the patient's ID to look them up.");
      return;
    }
    setSearching(true);
    setLookupError(null);
    setProfile(null);
    //SECURITY DEFINER RPC bypasses RLS so this works for any clinic operator,
    //including for patients not yet linked to this clinic.
    const { data, error } = await supabase.rpc("find_patient_by_code", { p_code: q });
    setSearching(false);
    if (error) {
      setLookupError("Lookup failed. Check your connection and try again.");
      return;
    }
    const row = (data as Array<ProfileLookup> | null)?.[0];
    if (!row) {
      setLookupError("No patient found with that ID. Make sure they've signed up first.");
      return;
    }
    setProfile(row);
  };

  const handleSubmit = async () => {
    if (!profile)         return;
    if (!user?.clinic_id) return Alert.alert("Error", "Your account is not linked to a clinic.");

    const duration = durationYears.trim() ? Number(durationYears.trim()) : null;
    if (durationYears.trim() && (Number.isNaN(duration) || (duration ?? 0) < 0 || (duration ?? 0) > 100)) {
      Alert.alert("Invalid Duration", "Diabetes duration must be a number between 0 and 100.");
      return;
    }
    const height = heightCm.trim() ? Number(heightCm.trim()) : null;
    const weight = weightKg.trim() ? Number(weightKg.trim()) : null;

    setSaving(true);

    //If a patients row for (this clinic, this profile) already exists, return it.
    //Otherwise insert a new one.
    const existing = await supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", user.clinic_id)
      .eq("profile_id", profile.id)
      .maybeSingle();

    let row: Patient | null = (existing.data as Patient) ?? null;

    if (!row) {
      const insertPayload = {
        clinic_id:               user.clinic_id,
        profile_id:              profile.id,
        first_name:              profile.first_name,
        middle_name:             profile.middle_name,
        last_name:               profile.last_name,
        sex:                     profile.sex ?? null,
        date_of_birth:           profile.date_of_birth ?? null,
        contact_number:          profile.contact_number ?? null,
        diabetes_type:           diabetesType ?? null,
        diabetes_duration_years: duration,
        height_cm:               height,
        weight_kg:               weight,
        notes:                   notes.trim() || null,
      };
      const { data: inserted, error } = await supabase
        .from("patients")
        .insert(insertPayload)
        .select()
        .single();
      if (error || !inserted) {
        setSaving(false);
        Alert.alert("Error", error?.message ?? "Failed to add patient. Check your connection and try again.");
        return;
      }
      row = inserted as Patient;
    }

    setSaving(false);
    //Decorate with the joined profile so downstream screens (sync, etc.) match
    //the PatientWithProfile shape they consume.
    setSelectedPatient({
      ...row,
      // @ts-expect-error -- attaching the joined profile for screen-local use
      profile: { patient_code: profile.patient_code, full_name: profile.full_name },
    });
    router.replace("/(clinic)/live-feed");
  };

  return (
    <ScreenWrapper>
      <Header
        title="Add Patient"
        leftIcon={<Ionicons name="chevron-back" size={24} color={colors.text} />}
        onLeftPress={() => router.back()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoBox, { backgroundColor: colors.accentSoft, borderColor: `${colors.accent}33` }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.accent} style={{ marginTop: 1 }} />
          <Text style={[styles.infoText, { color: colors.textSec }]}>
            Patients sign up themselves on Lumen AI. Enter their Patient ID below to add them to your clinic for screening.
          </Text>
        </View>

        {/* Patient ID lookup */}
        <FieldLabel label="Patient ID" required />
        <View style={styles.lookupRow}>
          <TextInput
            style={[styles.input, styles.lookupInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. JGS-20260502-1617-00"
            placeholderTextColor={colors.textSec}
            value={formatPatientId(code)}
            onChangeText={(v) => { setCode(cleanPatientId(v)); setLookupError(null); setProfile(null); }}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={handleLookup}
            disabled={searching}
            activeOpacity={0.75}
            style={[styles.lookupBtn, { backgroundColor: colors.accent }]}
          >
            {searching
              ? <ActivityIndicator color={colors.textInverse} size="small" />
              : <Ionicons name="search" size={18} color={colors.textInverse} />}
          </TouchableOpacity>
        </View>
        {lookupError ? (
          <Text style={[styles.lookupError, { color: colors.error }]}>{lookupError}</Text>
        ) : null}

        {/* Profile preview */}
        {profile ? (
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.previewHeader}>
              <Ionicons name="person-circle-outline" size={20} color={colors.accent} />
              <Text style={[styles.previewCode, { color: colors.text }]}>{profile.patient_code}</Text>
            </View>
            <Text style={[styles.previewName, { color: colors.text }]}>{profile.full_name}</Text>
            <Text style={[styles.previewMeta, { color: colors.textSec }]}>
              {profile.sex ? profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1) : "—"}
              {profile.date_of_birth ? ` · ${profile.date_of_birth}` : ""}
              {profile.contact_number ? ` · ${profile.contact_number}` : ""}
            </Text>
          </View>
        ) : null}

        {/* Clinical fields — only relevant once a profile is matched */}
        {profile ? (
          <>
            <FieldLabel label="Diabetes Type" />
            <SegmentedGroup options={DIABETES_OPTIONS} selected={diabetesType} onSelect={setDiabetesType} />

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

            <View style={{ flexDirection: "row", gap: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <FieldLabel label="Height (cm)" />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="170"
                  placeholderTextColor={colors.textSec}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel label="Weight (kg)" />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="65"
                  placeholderTextColor={colors.textSec}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </View>

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

            <Button
              label={saving ? "Adding..." : "Add & Start Session"}
              onPress={handleSubmit}
              variant="teal"
              size="lg"
              style={styles.submitBtn}
            />
            {saving && <ActivityIndicator color={colors.accent} style={{ marginTop: Spacing.sm }} />}
          </>
        ) : null}
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
    marginBottom: Spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    lineHeight: 20,
  },
  lookupRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  lookupInput: {
    flex: 1,
    marginBottom: 0,
  },
  lookupBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  lookupError: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginBottom: Spacing.md,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  previewCode: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
  },
  previewName: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
  },
  previewMeta: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: 4,
  },
  submitBtn: { width: "100%" },
});
