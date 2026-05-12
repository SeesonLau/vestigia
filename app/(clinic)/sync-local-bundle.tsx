// app/(clinic)/sync-local-bundle.tsx
// Clinic-side flow that uploads a single offline bundle (AsyncStorage) into
// Supabase against a clinic-managed patient. The operator searches the
// clinic's patient roster by patient_code and confirms; the patient's own
// canonical fields (first/middle/last/sex/date_of_birth/weight/height) are
// used as the cloud-side patient snapshot — whatever the operator typed in
// during the offline capture is discarded.

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import { getBundleByCode, type ThermalBundle } from "../../lib/thermal/bundleStorage";
import { syncLocalBundle, type SyncPatientSnapshot } from "../../lib/thermal/localBundleSync";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

interface PatientRow {
  id: string;
  profile_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  sex: string | null;
  date_of_birth: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  profile: { patient_code: string; full_name: string };
}

export default function ClinicSyncLocalBundleScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { code } = useLocalSearchParams<{ code: string }>();

  const [bundle, setBundle] = useState<ThermalBundle | null>(null);
  const [bundleLoading, setBundleLoading] = useState(true);

  const [search, setSearch]   = useState("");
  const [results, setResults] = useState<PatientRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selected, setSelected] = useState<PatientRow | null>(null);

  const [uploading, setUploading] = useState(false);

  // Load the AsyncStorage bundle by code.
  useEffect(() => {
    if (!code) { setBundleLoading(false); return; }
    let cancelled = false;
    getBundleByCode(code).then((b) => {
      if (!cancelled) { setBundle(b); setBundleLoading(false); }
    });
    return () => { cancelled = true; };
  }, [code]);

  // Search the clinic's roster. Mirrors patient-select.tsx — patient_code
  // lives on profiles (global), so we inner-join to filter on it.
  useEffect(() => {
    if (!user?.clinic_id) return;
    let cancelled = false;
    setListLoading(true);
    const q = search.trim();
    let query = supabase
      .from("patients")
      .select("id, profile_id, first_name, middle_name, last_name, sex, date_of_birth, weight_kg, height_cm, profile:profiles!inner(patient_code, full_name)")
      .eq("clinic_id", user.clinic_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (q) query = query.ilike("profile.patient_code", `%${q}%`);
    query.then(({ data }) => {
      if (cancelled) return;
      setResults((data as unknown as PatientRow[]) ?? []);
      setListLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.clinic_id, search]);

  const snapshot: SyncPatientSnapshot | null = useMemo(() => {
    if (!selected || !bundle) return null;
    // Prefer clinic-managed weight/height. Fall back to the offline-typed
    // values so the snapshot stays populated when the patient row hasn't
    // had those fields filled in yet.
    return {
      first_name:    selected.first_name,
      middle_name:   selected.middle_name,
      last_name:     selected.last_name,
      sex:           selected.sex,
      date_of_birth: selected.date_of_birth,
      weight_kg:     selected.weight_kg ?? bundle.patient.weight_kg ?? null,
      height_cm:     selected.height_cm ?? bundle.patient.height_cm ?? null,
    };
  }, [selected, bundle]);

  const handleSync = async () => {
    if (!bundle || !selected || !snapshot || !user?.clinic_id || !user?.id) return;
    setUploading(true);
    try {
      const result = await syncLocalBundle(bundle, {
        capture_mode:       "clinical",
        subject_profile_id: selected.profile_id,
        patient_id:         selected.id,
        clinic_id:          user.clinic_id,
        operator_id:        user.id,
        patient_snapshot:   snapshot,
      });
      Alert.alert(
        "Synced",
        `Bundle ${bundle.bundle_code} is now in the cloud and linked to ${selected.profile.full_name} (${selected.profile.patient_code}).`,
        [
          {
            text: "View Session",
            onPress: () => router.replace(`/(clinic)/bundle-detail?session_id=${result.session_id}` as any),
          },
          { text: "OK", onPress: () => router.replace("/(clinic)/history" as any) },
        ],
      );
    } catch (e) {
      Alert.alert("Sync Failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (bundleLoading) {
    return (
      <ScreenWrapper>
        <Header title="Sync to Clinic" leftIcon={<BackIcon onPress={() => router.back()} color={colors.text} />} />
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      </ScreenWrapper>
    );
  }

  if (!bundle) {
    return (
      <ScreenWrapper>
        <Header title="Sync to Clinic" leftIcon={<BackIcon onPress={() => router.back()} color={colors.text} />} />
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.textSec }]}>Local bundle not found.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header
        title="Sync to Clinic"
        subtitle={bundle.bundle_code}
        leftIcon={<BackIcon onPress={() => router.back()} color={colors.text} />}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.section, { color: colors.textSec }]}>SELECT PATIENT</Text>
        <Text style={[styles.hint, { color: colors.textSec }]}>
          Search by patient ID. The bundle will be attached to the patient&apos;s record and their
          name, birthdate, sex, weight, and height will replace what was entered offline.
        </Text>

        <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textSec} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="e.g. JGS-20260502-2347-00"
            placeholderTextColor={colors.textSec}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        {listLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: Spacing.md }} />
        ) : results.length === 0 ? (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={24} color={colors.textSec} />
            <Text style={[styles.emptyText, { color: colors.textSec }]}>
              {search ? "No matching patients." : "No patients in this clinic yet."}
            </Text>
          </View>
        ) : (
          results.map((p) => {
            const isSelected = selected?.id === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelected(p)}
                activeOpacity={0.75}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.accent : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.rowInfo}>
                  <Text style={[styles.code, { color: colors.text }]}>{p.profile.patient_code}</Text>
                  <Text style={[styles.name, { color: colors.textSec }]}>{p.profile.full_name}</Text>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.textSec} />
                )}
              </TouchableOpacity>
            );
          })
        )}

        {selected && snapshot ? (
          <>
            <Text style={[styles.section, { color: colors.textSec, marginTop: Spacing.lg }]}>SNAPSHOT</Text>
            <View style={[styles.snapshot, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SnapshotRow label="Name"      value={`${snapshot.first_name} ${snapshot.middle_name ?? ""} ${snapshot.last_name}`.replace(/\s+/g, " ").trim()} colors={colors} />
              <SnapshotRow label="Sex"       value={snapshot.sex ?? "—"} colors={colors} />
              <SnapshotRow label="Birthdate" value={snapshot.date_of_birth ?? "—"} colors={colors} />
              <SnapshotRow label="Weight"    value={snapshot.weight_kg != null ? `${snapshot.weight_kg} kg` : "—"} colors={colors} />
              <SnapshotRow label="Height"    value={snapshot.height_cm != null ? `${snapshot.height_cm} cm` : "—"} colors={colors} />
            </View>
            <Button
              label={uploading ? "Uploading…" : "Sync Bundle"}
              onPress={handleSync}
              loading={uploading}
              size="lg"
              style={{ marginTop: Spacing.md }}
            />
          </>
        ) : null}
      </ScrollView>
    </ScreenWrapper>
  );
}

function BackIcon({ onPress, color }: { onPress: () => void; color: string }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityLabel="Back" accessibilityRole="button">
      <Ionicons name="arrow-back-outline" size={22} color={color} />
    </TouchableOpacity>
  );
}

function SnapshotRow({ label, value, colors }: { label: string; value: string; colors: import("../../constants/theme").ThemeColors }) {
  return (
    <View style={styles.snapshotRow}>
      <Text style={[styles.snapshotLabel, { color: colors.textSec }]}>{label}</Text>
      <Text style={[styles.snapshotValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing["2xl"] },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.lg },
  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center" },

  section: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: 11, fontFamily: Typography.fonts.body, lineHeight: 16,
    marginBottom: Spacing.md,
  },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.mono, paddingVertical: 4 },

  empty: { alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: Spacing.lg, borderRadius: Radius.md, borderWidth: 1 },
  emptyText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body },

  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    marginBottom: 6,
  },
  rowInfo: { flex: 1 },
  code: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.mono, letterSpacing: 0.3 },
  name: { fontSize: 11, fontFamily: Typography.fonts.body, marginTop: 2 },

  snapshot: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  snapshotRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: Spacing.xs },
  snapshotLabel: { fontSize: 11, fontFamily: Typography.fonts.label, letterSpacing: 0.5, textTransform: "uppercase" },
  snapshotValue: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.subheading, flexShrink: 1, textAlign: "right" },
});
