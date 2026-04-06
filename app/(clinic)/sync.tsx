// app/(clinic)/sync.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import { getCaptureById, markSynced } from "../../lib/db/offlineCaptures";
import { parseY16Frame } from "../../lib/thermal/preprocessing";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import type { LocalCapture, Patient } from "../../types";

export default function SyncScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  //Capture
  const [capture, setCapture] = useState<LocalCapture | null>(null);

  //Patient search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  //Sync
  const [syncing, setSyncing] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  //Load capture
  useEffect(() => {
    if (!id) return;
    getCaptureById(id).then(setCapture);
  }, [id]);

  //Debounced patient search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      if (!user?.clinic_id) return;
      setSearching(true);
      const { data } = await supabase
        .from("patients")
        .select("*")
        .eq("clinic_id", user.clinic_id)
        .ilike("patient_code", `%${query.trim()}%`)
        .limit(10);
      setSearchResults((data as Patient[]) ?? []);
      setSearching(false);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [query, user?.clinic_id]);

  const handleSync = async () => {
    if (!capture || !selectedPatient || !user) return;

    setSyncing(true);
    try {
      // 1. Fetch active device for this clinic
      const { data: device, error: devErr } = await supabase
        .from("devices")
        .select("id")
        .eq("clinic_id", user.clinic_id)
        .eq("is_active", true)
        .limit(1)
        .single();
      if (devErr || !device) throw new Error("No active device found for your clinic. Register a device first.");

      // 2. Parse thermal matrix from stored B64
      const matrix = parseY16Frame(capture.thermal_matrix_b64);

      // 3. Create screening session
      const { data: session, error: sessErr } = await supabase
        .from("screening_sessions")
        .insert({
          patient_id: selectedPatient.id,
          operator_id: user.id,
          device_id: device.id,
          clinic_id: user.clinic_id,
          status: "completed",
          started_at: capture.captured_at,
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (sessErr || !session) throw new Error("Failed to create session.");

      // 4. Save thermal capture
      const { error: capErr } = await supabase.from("thermal_captures").insert({
        session_id: session.id,
        foot: capture.foot_side,
        thermal_matrix: matrix,
        min_temp_c: capture.min_temp,
        max_temp_c: capture.max_temp,
        mean_temp_c: capture.mean_temp,
        resolution_x: 160,
        resolution_y: 120,
        captured_at: capture.captured_at,
      });
      if (capErr) throw new Error("Failed to save thermal capture.");

      // 5. Save vitals if present
      const hasVitals = capture.blood_glucose_mgdl || capture.systolic_bp_mmhg || capture.diastolic_bp_mmhg;
      if (hasVitals) {
        const { error: vitalsErr } = await supabase.from("patient_vitals").insert({
          session_id: session.id,
          blood_glucose_mgdl: capture.blood_glucose_mgdl ?? null,
          systolic_bp_mmhg: capture.systolic_bp_mmhg ?? null,
          diastolic_bp_mmhg: capture.diastolic_bp_mmhg ?? null,
          recorded_at: capture.captured_at,
        });
        if (vitalsErr) throw new Error("Failed to save vitals.");
      }

      // 6. Send data request if patient has a linked app account
      if (selectedPatient.user_id) {
        await supabase.from("data_requests").insert({
          from_role: "clinic",
          from_id: user.id,
          to_role: "patient",
          to_id: selectedPatient.user_id,
          session_id: session.id,
          status: "pending",
        });
      }

      // 7. Mark local record as synced
      await markSynced(capture.id, session.id);

      Alert.alert(
        "Synced",
        selectedPatient.user_id
          ? "Session uploaded and a request was sent to the patient's account."
          : "Session uploaded. The patient doesn't have an app account yet — no notification was sent.",
        [{ text: "OK", onPress: () => router.replace("/(clinic)/history" as any) }]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      Alert.alert("Sync Failed", msg);
    } finally {
      setSyncing(false);
    }
  };

  if (!capture) {
    return (
      <ScreenWrapper>
        <Header
          title="Sync to Account"
          leftIcon={
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          }
        />
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header
        title="Sync to Account"
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
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Capture summary */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textSec }]}>Offline Capture</Text>
            <View style={styles.captureRow}>
              <Text style={[styles.captureLabel, { color: colors.text }]}>{capture.patient_label}</Text>
              <View style={styles.unsyncedBadge}>
                <Text style={styles.unsyncedText}>Unsynced</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="footsteps-outline" size={13} color={colors.textSec} />
              <Text style={[styles.meta, { color: colors.textSec }]}>
                {capture.foot_side.charAt(0).toUpperCase() + capture.foot_side.slice(1)} foot
              </Text>
              <Text style={[styles.metaDivider, { color: colors.textSec }]}>·</Text>
              <Ionicons name="thermometer-outline" size={13} color={colors.textSec} />
              <Text style={[styles.meta, { color: colors.textSec }]}>
                {capture.min_temp.toFixed(1)}–{capture.max_temp.toFixed(1)}°C
              </Text>
            </View>
            {(capture.blood_glucose_mgdl || capture.systolic_bp_mmhg) && (
              <View style={styles.metaRow}>
                <Ionicons name="pulse-outline" size={13} color={colors.textSec} />
                <Text style={[styles.meta, { color: colors.textSec }]}>
                  {capture.blood_glucose_mgdl ? `${capture.blood_glucose_mgdl} mg/dL` : ""}
                  {capture.blood_glucose_mgdl && capture.systolic_bp_mmhg ? "  ·  " : ""}
                  {capture.systolic_bp_mmhg ? `${capture.systolic_bp_mmhg}/${capture.diastolic_bp_mmhg} mmHg` : ""}
                </Text>
              </View>
            )}
            <Text style={[styles.captureDate, { color: colors.textSec }]}>
              {new Date(capture.captured_at).toLocaleString()}
            </Text>
          </View>

          {/* Patient search */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Match to Patient</Text>
            <Text style={[styles.sectionHint, { color: colors.textSec }]}>
              Search by patient code to link this capture to a patient record in your clinic.
            </Text>
            <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={16} color={colors.textSec} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search patient code..."
                placeholderTextColor={colors.textSec}
                value={query}
                onChangeText={(v) => {
                  setQuery(v);
                  setSelectedPatient(null);
                }}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searching && (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: Spacing.sm }} />
              )}
            </View>

            {/* Search results */}
            {searchResults.length > 0 && !selectedPatient && (
              <View style={[styles.resultList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {searchResults.map((p, idx) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.resultItem, { borderBottomColor: colors.border }, idx === searchResults.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => {
                      setSelectedPatient(p);
                      setQuery(p.patient_code);
                      setSearchResults([]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.resultCode, { color: colors.text }]}>{p.patient_code}</Text>
                    {p.sex && (
                      <Text style={[styles.resultMeta, { color: colors.textSec }]}>
                        {p.sex.charAt(0).toUpperCase() + p.sex.slice(1)}
                        {p.diabetes_type ? ` · ${p.diabetes_type}` : ""}
                      </Text>
                    )}
                    {!p.user_id && (
                      <Text style={[styles.noAccountNote, { color: colors.textSec }]}>No app account</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Selected patient preview */}
          {selectedPatient && (
            <View style={[styles.selectedCard, { backgroundColor: `${colors.accent}14`, borderColor: `${colors.accent}40` }]}>
              <View style={styles.selectedHeader}>
                <Ionicons name="person-circle-outline" size={20} color={colors.accent} />
                <Text style={[styles.selectedCode, { color: colors.text }]}>{selectedPatient.patient_code}</Text>
                <TouchableOpacity onPress={() => { setSelectedPatient(null); setQuery(""); }}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.textSec} />
                </TouchableOpacity>
              </View>
              {selectedPatient.diabetes_type && (
                <Text style={[styles.selectedMeta, { color: colors.textSec }]}>
                  {selectedPatient.diabetes_type}
                  {selectedPatient.diabetes_duration_years
                    ? ` · ${selectedPatient.diabetes_duration_years}yr duration`
                    : ""}
                </Text>
              )}
              {selectedPatient.user_id ? (
                <View style={styles.accountRow}>
                  <Ionicons name="checkmark-circle-outline" size={13} color={colors.success} />
                  <Text style={[styles.accountNote, { color: colors.success }]}>Has app account — will receive a notification</Text>
                </View>
              ) : (
                <View style={styles.accountRow}>
                  <Ionicons name="information-circle-outline" size={13} color={colors.textSec} />
                  <Text style={[styles.noAccountNoteInline, { color: colors.textSec }]}>No app account — session saved, no notification sent</Text>
                </View>
              )}
            </View>
          )}

          {/* Sync button */}
          <TouchableOpacity
            style={[styles.syncBtn, { backgroundColor: colors.accent }, (!selectedPatient || syncing) && styles.syncBtnDisabled]}
            onPress={handleSync}
            disabled={!selectedPatient || syncing}
            activeOpacity={0.8}
          >
            {syncing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.syncBtnText}>Sync to Account</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.footerNote, { color: colors.textSec }]}>
            The capture will be linked to the selected patient and remain on this device until deleted.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing["3xl"] },
  //Capture card
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  captureRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  captureLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.heading,
    flex: 1,
  },
  unsyncedBadge: {
    backgroundColor: "rgba(251,191,36,0.15)",
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
  },
  unsyncedText: { fontSize: 10, fontFamily: Typography.fonts.label, color: "#fbbf24" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
  metaDivider: { marginHorizontal: 2 },
  captureDate: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
  //Section
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.heading,
  },
  sectionHint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    lineHeight: 18,
  },
  //Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  searchIcon: { paddingLeft: Spacing.md },
  searchInput: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
  },
  resultList: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  resultItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    gap: 2,
  },
  resultCode: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.heading,
  },
  resultMeta: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
  },
  noAccountNote: {
    fontSize: 10,
    fontFamily: Typography.fonts.label,
    marginTop: 2,
  },
  //Selected patient
  selectedCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  selectedHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  selectedCode: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.heading,
  },
  selectedMeta: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
  },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  accountNote: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
  noAccountNoteInline: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
  },
  //Sync button
  syncBtn: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  syncBtnDisabled: { opacity: 0.4 },
  syncBtnText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.heading,
    color: "#fff",
  },
  footerNote: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    lineHeight: 18,
  },
});
