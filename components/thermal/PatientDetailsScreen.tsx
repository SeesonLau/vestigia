// components/thermal/PatientDetailsScreen.tsx
//Two modes, identical visual layout:
//  - mode='patient' → first/middle/last/sex/birthdate are auto-filled on
//    mount from authStore.user. Only weight + height are user-entered.
//  - mode='clinic'  → an extra 'Patient ID' lookup at the top finds the
//    profile and populates first/middle/last/sex/birthdate. Only weight +
//    height are user-entered.
//Submit performs the Supabase upload (sessions + thermal_captures + storage)
//and navigates: clinic → assessment, patient → home.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Dimensions, Image, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import Header from "../layout/Header";
import ScreenWrapper from "../layout/ScreenWrapper";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import type { ThemeColors } from "../../constants/theme";
import {
  calculateAge, calculateBMI, bmiCategory,
  digitsToISO, fmtDateDigits,
} from "../../lib/thermal/bundleUtils";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { useSessionStore, useThermalStore } from "../../store/sessionStore";

const SCREEN_W = Dimensions.get("window").width;
const THUMB_W  = (SCREEN_W - Spacing.lg * 2 - Spacing.md) / 2;
const THUMB_H  = Math.round(THUMB_W * (120 / 160));

type Sex = "Male" | "Female";

interface FormState {
  firstName:       string;
  middleName:      string;
  lastName:        string;
  sex:             Sex | "";
  birthdateDigits: string; // raw "MMDDYYYY"
  weightKg:        string;
  heightCm:        string;
}

interface Props {
  mode: "clinic" | "patient";
  headerLeft?: React.ReactNode;
}

//"2003-06-09" → "06092003"; DateInput stores raw MMDDYYYY digits
function isoToDobDigits(iso?: string | null): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}${m[3]}${m[1]}` : "";
}

function profileToForm(p: {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  sex: "male" | "female" | "other" | null;
  date_of_birth: string | null;
}): Partial<FormState> {
  const sex: Sex | "" = p.sex === "male" ? "Male" : p.sex === "female" ? "Female" : "";
  return {
    firstName:       p.first_name,
    middleName:      p.middle_name ?? "",
    lastName:        p.last_name,
    sex,
    birthdateDigits: isoToDobDigits(p.date_of_birth),
  };
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

  const [form, setForm] = useState<FormState>({
    firstName: "", middleName: "", lastName: "",
    sex: "", birthdateDigits: "", weightKg: "", heightCm: "",
  });
  const [profileId, setProfileId] = useState<string | null>(null);
  //Clinic-mode badge: history-access status with this patient
  type AccessStatus = "none" | "pending" | "accepted" | "rejected" | "revoked";
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("none");

  //Refresh history-access status whenever a clinic-mode lookup sets profileId
  useEffect(() => {
    if (mode !== "clinic" || !profileId || !user?.clinic_id) {
      setAccessStatus("none");
      return;
    }
    let cancelled = false;
    supabase
      .from("clinic_access")
      .select("status")
      .eq("clinic_id", user.clinic_id)
      .eq("patient_profile_id", profileId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setAccessStatus(((data?.status as AccessStatus) ?? "none"));
      });
    return () => { cancelled = true; };
  }, [mode, profileId, user?.clinic_id]);

  //Patient mode: auto-fill from the signed-in user once on mount
  useEffect(() => {
    if (mode !== "patient" || !user || user.role !== "patient") return;
    setForm((prev) => ({
      ...prev,
      ...profileToForm({
        first_name:    user.first_name,
        middle_name:   user.middle_name ?? null,
        last_name:     user.last_name,
        sex:           user.sex ?? null,
        date_of_birth: user.date_of_birth ?? null,
      }),
    }));
    setProfileId(user.id);
  }, [mode, user]);

  //Clinic mode lookup
  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleLookup = async () => {
    //Patient ID is stored clean (no dashes) — re-insert them for the lookup
    const q = code.length === 17
      ? `${code.slice(0, 3)}-${code.slice(3, 11)}-${code.slice(11, 15)}-${code.slice(15)}`
      : code.trim().toUpperCase();
    if (!q) { setLookupError("Enter the Patient ID."); return; }
    setSearching(true);
    setLookupError(null);
    //SECURITY DEFINER RPC bypasses the profiles_select_clinic RLS policy so a
    //clinic operator can resolve a patient they haven't yet linked.
    const { data, error } = await supabase.rpc("find_patient_by_code", { p_code: q });
    setSearching(false);
    if (error) { setLookupError("Lookup failed. Check your connection."); return; }
    const row = (data as Array<{
      id: string; first_name: string; middle_name: string | null;
      last_name: string; sex: "male" | "female" | "other" | null;
      date_of_birth: string | null;
    }> | null)?.[0];
    if (!row) {
      setLookupError("No patient found with that ID.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      ...profileToForm({
        first_name:    row.first_name,
        middle_name:   row.middle_name,
        last_name:     row.last_name,
        sex:           row.sex,
        date_of_birth: row.date_of_birth,
      }),
    }));
    setProfileId(row.id);
  };

  const update = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setSex = (s: Sex) =>
    setForm((prev) => ({ ...prev, sex: prev.sex === s ? "" : s }));

  //Live preview calculations
  const isoDate = digitsToISO(form.birthdateDigits);
  const age     = isoDate ? calculateAge(isoDate) : null;
  const weight  = parseFloat(form.weightKg);
  const height  = parseFloat(form.heightCm);
  const bmi     = (!isNaN(weight) && !isNaN(height) && weight > 0 && height > 0)
    ? calculateBMI(weight, height) : null;

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function validate(): string | null {
    if (mode === "clinic" && !profileId) return "Look up the patient by ID first.";
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim())  return "Last name is required.";
    if (!form.sex)              return "Sex is required.";
    if (!isoDate)               return "Birthdate is invalid.";
    if (age === null || age < 0 || age > 120) return "Birthdate results in an invalid age.";
    if (isNaN(weight) || weight <= 0) return "Enter a valid weight (kg).";
    if (isNaN(height) || height <= 0) return "Enter a valid height (cm).";
    if (!leftProcessedB64 || !rightProcessedB64) return "Both foot captures are required.";
    if (!leftIsolatedB64  || !rightIsolatedB64)  return "Capture data is incomplete.";
    if (!leftCsvContent   || !rightCsvContent)   return "Capture CSV is missing.";
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

  const handleSave = async () => {
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

        const dev = await supabase
          .from("devices").select("id")
          .eq("clinic_id", clinicId).eq("is_active", true)
          .limit(1).maybeSingle();
        if (dev.data?.id) {
          deviceId = dev.data.id;
        } else {
          //First capture for this clinic: auto-register a default device so
          //the session FK resolves. The operator can rename / pair more
          //devices later.
          const inserted = await supabase
            .from("devices")
            .insert({ clinic_id: clinicId, name: "Default Device", is_active: true })
            .select("id")
            .single();
          if (inserted.error || !inserted.data) {
            throw new Error(inserted.error?.message ?? "Failed to register a default device.");
          }
          deviceId = inserted.data.id;
        }

        //Find or create the patients row
        const existing = await supabase
          .from("patients").select("id")
          .eq("clinic_id", clinicId).eq("profile_id", profileId!)
          .maybeSingle();

        if (existing.data) {
          patientId = existing.data.id;
          await supabase.from("patients")
            .update({
              first_name:  form.firstName.trim(),
              middle_name: form.middleName.trim() || null,
              last_name:   form.lastName.trim(),
              sex:         form.sex.toLowerCase(),
              date_of_birth: isoDate,
              height_cm:   height,
              weight_kg:   weight,
            })
            .eq("id", patientId);
        } else {
          const inserted = await supabase
            .from("patients")
            .insert({
              clinic_id:    clinicId,
              profile_id:   profileId!,
              first_name:   form.firstName.trim(),
              middle_name:  form.middleName.trim() || null,
              last_name:    form.lastName.trim(),
              sex:          form.sex.toLowerCase(),
              date_of_birth: isoDate,
              height_cm:    height,
              weight_kg:    weight,
            })
            .select("id").single();
          if (inserted.error || !inserted.data) {
            throw new Error(inserted.error?.message ?? "Failed to create patient record.");
          }
          patientId = inserted.data.id;
        }
      }

      const startedAt = new Date().toISOString();
      const patientSnapshot = {
        first_name:    form.firstName.trim(),
        middle_name:   form.middleName.trim() || null,
        last_name:     form.lastName.trim(),
        sex:           form.sex.toLowerCase(),
        date_of_birth: isoDate,
        height_cm:     height,
        weight_kg:     weight,
      };

      const { data: session, error: sessErr } = await supabase
        .from("screening_sessions")
        .insert({
          subject_profile_id: profileId,
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
          session_id:           session.id,
          foot:                 e.foot,
          thermal_matrix:       e.matrix,
          min_temp_c:           e.stats?.min ?? 0,
          max_temp_c:           e.stats?.max ?? 0,
          mean_temp_c:          e.stats?.mean ?? 0,
          resolution_x:         e.matrix[0]?.length ?? 160,
          resolution_y:         e.matrix.length || 120,
          raw_image_path:       rawPath,
          processed_image_path: processedPath,
          isolated_image_path:  isolatedPath,
          csv_path:             csvPath,
          captured_at:          startedAt,
        });
        if (capErr) throw new Error(`Failed to save ${e.foot} thermal capture.`);
      }

      //Per-relationship history-share consent — fire after the capture is
      //safely stored. Cooldown errors here don't fail the capture itself.
      if (mode === "clinic" && clinicId && profileId) {
        const { error: accessErr } = await supabase.rpc("request_clinic_access", {
          p_clinic_id:          clinicId,
          p_patient_profile_id: profileId,
        });
        if (accessErr && accessErr.code !== "P0001") {
          console.warn("[clinic_access] request failed:", accessErr.message);
        }
      }

      //Mark the bundle complete now that all uploads + child rows landed.
      //Assessment (DPN classification) is a separate flow run from history later;
      //a row with status='completed' AND no classification_results entry is the
      //'not yet assessed' bundle in that future UI.
      await supabase
        .from("screening_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", session.id);

      setActiveSession({
        id:                 session.id,
        bundle_code:        session.bundle_code ?? null,
        subject_profile_id: profileId,
        patient_id:         patientId,
        clinic_id:          clinicId,
        operator_id:        user.id,
        device_id:          deviceId,
        capture_mode:       mode === "clinic" ? "clinical" : "patient_self",
        status:             "completed",
        started_at:         startedAt,
      });
      clearBilateral();

      const homeRoute = mode === "clinic" ? "/(clinic)" : "/(patient)";
      Alert.alert(
        "Bundle Saved",
        "The thermal capture has been saved. Run assessment from the history screen when you're ready.",
        [{ text: "OK", onPress: () => router.replace(homeRoute) }],
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setFormError(`Save failed: ${msg}`);
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

          {/* Clinic-only: Patient ID lookup */}
          {mode === "clinic" ? (
            <View style={styles.lookupRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Patient ID"
                  value={code}
                  onChangeText={(v) => { setCode(v); setLookupError(null); }}
                  format="patient-id"
                  placeholder="XXX-YYYYMMDD-HHMM-NN"
                />
              </View>
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
          ) : null}
          {lookupError ? (
            <Text style={[styles.lookupError, { color: colors.error }]}>{lookupError}</Text>
          ) : null}

          {/* Clinic-mode: history-access badge once a patient is matched */}
          {mode === "clinic" && profileId ? (
            <AccessBadge status={accessStatus} colors={colors} />
          ) : null}

          {/* Form. Identity fields lock as soon as a subject is resolved
               (patient mode: on mount; clinic mode: after a successful lookup). */}
          <View style={styles.form}>
            {(() => {
              const identityLocked = profileId !== null;
              return (
                <>
                  <FloatInput label="First Name"  value={form.firstName}  onChangeText={update("firstName")}  colors={colors} disabled={identityLocked} />
                  <FloatInput label="Middle Name" value={form.middleName} onChangeText={update("middleName")} colors={colors} disabled={identityLocked} />
                  <FloatInput label="Last Name"   value={form.lastName}   onChangeText={update("lastName")}   colors={colors} disabled={identityLocked} />

                  {/* Sex */}
                  <View style={[styles.fieldGroup, identityLocked && { opacity: 0.7 }]}>
                    <Text style={[styles.groupLabel, { color: colors.textSec }]}>Sex</Text>
                    <View style={styles.sexRow}>
                      {(["Male", "Female"] as Sex[]).map((s) => {
                        const active = form.sex === s;
                        return (
                          <TouchableOpacity
                            key={s}
                            onPress={() => { if (!identityLocked) setSex(s); }}
                            disabled={identityLocked}
                            style={[
                              styles.sexBtn,
                              {
                                borderColor: active ? colors.accent : colors.border,
                                backgroundColor: identityLocked ? colors.cardAlt : "transparent",
                              },
                              active && !identityLocked && { backgroundColor: `${colors.accent}1A` },
                              active && identityLocked && { backgroundColor: `${colors.accent}26` },
                            ]}
                            activeOpacity={identityLocked ? 1 : 0.7}
                          >
                            <Text style={[styles.sexBtnText, { color: active ? colors.accent : colors.textSec }]}>{s}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <DateInput
                    label="Birthdate"
                    value={form.birthdateDigits}
                    onChangeText={update("birthdateDigits")}
                    colors={colors}
                    disabled={identityLocked}
                  />
                  <FloatInput label="Weight (kg)" value={form.weightKg} onChangeText={update("weightKg")} keyboard="decimal-pad" colors={colors} />
                  <FloatInput label="Height (cm)" value={form.heightCm} onChangeText={update("heightCm")} keyboard="decimal-pad" colors={colors} />
                </>
              );
            })()}

            {/* Live age / BMI preview */}
            {(age !== null || bmi !== null) ? (
              <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {age !== null ? (
                  <PreviewStat label="Age" value={`${age} yrs`} colors={colors} />
                ) : null}
                {age !== null && bmi !== null ? (
                  <View style={[styles.previewDivider, { backgroundColor: colors.border }]} />
                ) : null}
                {bmi !== null ? (
                  <PreviewStat label="BMI" value={`${bmi.toFixed(1)}  ·  ${bmiCategory(bmi)}`} colors={colors} />
                ) : null}
              </View>
            ) : null}
          </View>

          {formError ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{formError}</Text>
          ) : null}

          <Button
            label={mode === "clinic" ? "Continue to Assessment" : "Save Capture"}
            onPress={handleSave}
            loading={saving}
            variant="teal"
            size="lg"
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

//FloatInput — standard floating label input. When `disabled`, renders a
//slightly dimmed background and the TextInput is non-editable.
function FloatInput({
  label, value, onChangeText, keyboard, colors, disabled,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  keyboard?: "numeric" | "decimal-pad"; colors: ThemeColors; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value !== "" ? 1 : 0)).current;
  const isUp = focused || value !== "";

  useEffect(() => {
    Animated.timing(anim, { toValue: isUp ? 1 : 0, duration: 150, useNativeDriver: false }).start();
  }, [isUp]);

  return (
    <View
      style={[
        floatStyles.container,
        {
          borderColor: focused ? colors.accent : colors.border,
          backgroundColor: disabled ? colors.cardAlt : colors.surface,
          opacity: disabled ? 0.7 : 1,
        },
      ]}
    >
      <Animated.Text
        style={[floatStyles.label, {
          top: anim.interpolate({ inputRange: [0, 1], outputRange: [19, 6] }),
          fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] }),
          color: focused ? colors.accent : colors.textSec,
        }]}
      >
        {label}
      </Animated.Text>
      <TextInput
        style={[floatStyles.input, { color: disabled ? colors.textSec : colors.text }]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={keyboard ?? "default"}
        autoCapitalize={keyboard ? "none" : "words"}
        returnKeyType="next"
        editable={!disabled}
      />
    </View>
  );
}

//DateInput — floating label with MM/DD/YYYY auto-masking
function DateInput({
  label, value, onChangeText, colors, disabled,
}: {
  label: string; value: string; onChangeText: (digits: string) => void; colors: ThemeColors; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const anim     = useRef(new Animated.Value(value !== "" ? 1 : 0)).current;
  const prevFmt  = useRef(fmtDateDigits(value));
  const isUp     = focused || value !== "";

  useEffect(() => {
    Animated.timing(anim, { toValue: isUp ? 1 : 0, duration: 150, useNativeDriver: false }).start();
  }, [isUp]);

  const handleChange = (text: string) => {
    const newDigits   = text.replace(/\D/g, "").slice(0, 8);
    const prevDisplay = prevFmt.current;
    if (text.length < prevDisplay.length && newDigits === value) {
      const reduced = value.slice(0, -1);
      onChangeText(reduced);
      prevFmt.current = fmtDateDigits(reduced);
    } else {
      onChangeText(newDigits);
      prevFmt.current = fmtDateDigits(newDigits);
    }
  };

  const displayed = fmtDateDigits(value);

  return (
    <View
      style={[
        floatStyles.container,
        {
          borderColor: focused ? colors.accent : colors.border,
          backgroundColor: disabled ? colors.cardAlt : colors.surface,
          opacity: disabled ? 0.7 : 1,
        },
      ]}
    >
      <Animated.Text
        style={[floatStyles.label, {
          top: anim.interpolate({ inputRange: [0, 1], outputRange: [19, 6] }),
          fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] }),
          color: focused ? colors.accent : colors.textSec,
        }]}
      >
        {label}
      </Animated.Text>
      <TextInput
        style={[floatStyles.input, { color: disabled ? colors.textSec : colors.text }]}
        value={displayed}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="numeric"
        returnKeyType="next"
        placeholder={focused ? "MM / DD / YYYY" : ""}
        placeholderTextColor={colors.textSec + "80"}
        editable={!disabled}
      />
    </View>
  );
}

//AccessBadge — clinic-mode banner showing the operator's history-access status
//for the currently identified patient.
function AccessBadge({
  status, colors,
}: {
  status: "none" | "pending" | "accepted" | "rejected" | "revoked";
  colors: ThemeColors;
}) {
  const cfg = (() => {
    switch (status) {
      case "accepted":
        return { color: colors.success, icon: "checkmark-circle" as const,
                 title: "History access: approved",
                 body:  "You can view this patient's full screening history." };
      case "pending":
        return { color: colors.warning, icon: "time-outline" as const,
                 title: "History access: pending",
                 body:  "Awaiting approval from the patient." };
      case "rejected":
        return { color: colors.error, icon: "close-circle-outline" as const,
                 title: "History access: disapproved",
                 body:  "A new request will be sent when you save (5-minute cooldown applies)." };
      case "revoked":
        return { color: colors.error, icon: "remove-circle-outline" as const,
                 title: "History access: revoked",
                 body:  "A new request will be sent when you save." };
      default:
        return { color: colors.accent, icon: "send-outline" as const,
                 title: "First-time capture",
                 body:  "An access request will be sent to the patient when you save." };
    }
  })();

  return (
    <View
      style={{
        flexDirection: "row",
        gap: Spacing.sm,
        alignItems: "flex-start",
        padding: Spacing.md,
        borderWidth: 1,
        borderRadius: Radius.md,
        backgroundColor: `${cfg.color}1A`,
        borderColor:     `${cfg.color}66`,
      }}
    >
      <Ionicons name={cfg.icon} size={18} color={cfg.color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={{
          color: cfg.color,
          fontSize: Typography.sizes.sm,
          fontFamily: Typography.fonts.heading,
        }}>
          {cfg.title}
        </Text>
        <Text style={{
          color: colors.textSec,
          fontSize: Typography.sizes.xs,
          fontFamily: Typography.fonts.body,
          marginTop: 2,
          lineHeight: 16,
        }}>
          {cfg.body}
        </Text>
      </View>
    </View>
  );
}

function PreviewStat({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
  return (
    <View style={styles.previewStat}>
      <Text style={[styles.previewLabel, { color: colors.textSec }]}>{label}</Text>
      <Text style={[styles.previewValue, { color: colors.text }]}>{value}</Text>
    </View>
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

const floatStyles = StyleSheet.create({
  container: { height: 58, borderWidth: 1, borderRadius: Radius.md, position: "relative" },
  label: { position: "absolute", left: Spacing.md, fontFamily: Typography.fonts.body },
  input: {
    position: "absolute", left: 0, right: 0, bottom: 0, top: 0,
    paddingHorizontal: Spacing.md, paddingTop: 22, paddingBottom: 8,
    fontSize: Typography.sizes.base, fontFamily: Typography.fonts.body,
  },
});

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing["3xl"], gap: Spacing.lg },

  thumbRow:     { flexDirection: "row", borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.sm },
  thumbCell:    { flex: 1, alignItems: "center", gap: 4 },
  thumbDivider: { width: 1, marginHorizontal: Spacing.xs },
  thumbLabel:   { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1.5 },
  thumbImg:     { width: THUMB_W, height: THUMB_H, borderRadius: Radius.md, borderWidth: 1 },
  thumbStats:   { fontSize: 9, fontFamily: Typography.fonts.mono, textAlign: "center" },

  lookupRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  lookupBtn: {
    width: 58, height: 58,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  lookupError: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: -Spacing.sm,
  },

  form:       { gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  groupLabel: { fontSize: 11, fontFamily: Typography.fonts.label, letterSpacing: 1, textTransform: "uppercase" },

  sexRow:     { flexDirection: "row", gap: Spacing.sm },
  sexBtn:     { flex: 1, alignItems: "center", paddingVertical: Spacing.sm + 2, borderRadius: Radius.md, borderWidth: 1 },
  sexBtnText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body },

  preview: {
    flexDirection: "row", borderWidth: 1, borderRadius: Radius.md,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  previewStat:    { flex: 1, alignItems: "center", gap: 2 },
  previewLabel:   { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 1, textTransform: "uppercase" },
  previewValue:   { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading },
  previewDivider: { width: 1, alignSelf: "stretch" },

  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center" },
  saveBtn:   { marginTop: Spacing.xs },
});
