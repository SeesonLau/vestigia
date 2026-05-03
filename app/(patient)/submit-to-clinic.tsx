// app/(patient)/submit-to-clinic.tsx
//Lets a patient send one of their self-captures to a clinic by entering
//the clinic_code (XX-YYYYMMDD-HHMM-NN). Submission counts as consent --
//on success the clinic_access row jumps straight to 'accepted'.

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

const CLINIC_CODE_RE = /^[A-Z]{2}-[0-9]{8}-[0-9]{4}-[0-9]{2}$/;

const cleanClinicCode = (raw: string) =>
  raw.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 16);
const formatClinicCode = (clean: string) => {
  if (clean.length <= 2)  return clean;
  if (clean.length <= 10) return clean.slice(0, 2) + "-" + clean.slice(2);
  if (clean.length <= 14) return clean.slice(0, 2) + "-" + clean.slice(2, 10) + "-" + clean.slice(10);
  return clean.slice(0, 2) + "-" + clean.slice(2, 10) + "-" + clean.slice(10, 14) + "-" + clean.slice(14);
};

interface ClinicLookup {
  id: string;
  facility_name: string;
  facility_type: string;
  clinic_code: string;
}

export default function SubmitToClinicScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { session_id } = useLocalSearchParams<{ session_id: string }>();

  const [code, setCode]               = useState("");
  const [searching, setSearching]     = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [clinic, setClinic]           = useState<ClinicLookup | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formatted = formatClinicCode(code);

  const handleLookup = async () => {
    if (!CLINIC_CODE_RE.test(formatted)) {
      setLookupError("Enter a complete clinic code (XX-YYYYMMDD-HHMM-NN).");
      return;
    }
    setSearching(true);
    setLookupError(null);
    setClinic(null);
    const { data, error } = await supabase
      .from("clinics")
      .select("id, facility_name, facility_type, clinic_code, is_active")
      .eq("clinic_code", formatted)
      .maybeSingle();
    setSearching(false);
    if (error) {
      setLookupError("Lookup failed. Check your connection.");
      return;
    }
    if (!data) {
      setLookupError("No clinic found with that code.");
      return;
    }
    if (!(data as { is_active: boolean }).is_active) {
      setLookupError("This clinic is currently inactive.");
      return;
    }
    setClinic(data as ClinicLookup);
  };

  const handleSubmit = async () => {
    if (!session_id || !clinic) return;
    setSubmitting(true);
    setSubmitError(null);
    const { error } = await supabase.rpc("submit_session_to_clinic", {
      p_session_id:  session_id,
      p_clinic_code: clinic.clinic_code,
    });
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message ?? "Failed to submit.");
      return;
    }
    Alert.alert(
      "Submitted",
      `Your capture is now visible to ${clinic.facility_name}. They can also see your other screening history with you having approved access.`,
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  const facilityTypeLabel = clinic
    ? clinic.facility_type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "";

  return (
    <ScreenWrapper>
      <Header
        title="Submit to clinic"
        leftIcon={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.infoBox, { backgroundColor: colors.accentSoft, borderColor: `${colors.accent}33` }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accent} style={{ marginTop: 1 }} />
            <Text style={[styles.infoText, { color: colors.textSec }]}>
              Enter your clinic's code to share this capture. Submitting also grants the clinic access to your full screening history (you can revoke later from your inbox).
            </Text>
          </View>

          <View style={styles.lookupRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Clinic Code"
                placeholder="XX-YYYYMMDD-HHMM-NN"
                value={formatted}
                onChangeText={(v) => {
                  setCode(cleanClinicCode(v));
                  setLookupError(null);
                  setClinic(null);
                }}
                autoCapitalize="characters"
                error={lookupError ?? undefined}
              />
            </View>
            <TouchableOpacity
              onPress={handleLookup}
              disabled={searching}
              style={[styles.lookupBtn, { backgroundColor: colors.accent }]}
              activeOpacity={0.8}
            >
              {searching
                ? <ActivityIndicator color={colors.textInverse} size="small" />
                : <Ionicons name="search" size={18} color={colors.textInverse} />}
            </TouchableOpacity>
          </View>

          {clinic ? (
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.previewHeader}>
                <Ionicons name="business-outline" size={18} color={colors.accent} />
                <Text style={[styles.previewName, { color: colors.text }]}>{clinic.facility_name}</Text>
              </View>
              <Text style={[styles.previewMeta, { color: colors.textSec }]}>
                {facilityTypeLabel} · {clinic.clinic_code}
              </Text>

              {submitError ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{submitError}</Text>
              ) : null}

              <Button
                label={submitting ? "Submitting..." : "Submit & grant access"}
                onPress={handleSubmit}
                loading={submitting}
                size="lg"
                style={styles.submitBtn}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing["3xl"], gap: Spacing.lg },
  infoBox: {
    flexDirection: "row", gap: Spacing.sm, alignItems: "flex-start",
    borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md,
  },
  infoText: { flex: 1, fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, lineHeight: 20 },

  lookupRow: { flexDirection: "row", gap: Spacing.sm, alignItems: "flex-start" },
  lookupBtn: {
    width: 58, height: 58, borderRadius: Radius.md,
    alignItems: "center", justifyContent: "center",
  },

  previewCard: {
    borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm,
  },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  previewName: { fontSize: Typography.sizes.lg, fontFamily: Typography.fonts.heading, flex: 1 },
  previewMeta: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.mono },
  submitBtn:   { marginTop: Spacing.md },
  errorText:   { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, color: "red", textAlign: "center" },
});
