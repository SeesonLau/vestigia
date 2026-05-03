// app/(clinic)/manage-patients.tsx
//Roster of every patient currently linked to this clinic. For each row we
//show their global Patient ID, name, the count of sessions captured at
//this clinic, and the current history-access status (pending / approved /
//rejected / revoked / never requested). Tap a row to drill into history
//filtered by that patient.

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator, FlatList, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import InitialsAvatar, { personInitials } from "../../components/ui/InitialsAvatar";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

type AccessStatus = "pending" | "accepted" | "rejected" | "revoked" | "none";

interface PatientRow {
  patient_id: string;
  profile_id: string;
  full_name: string;
  patient_code: string;
  sex: string | null;
  date_of_birth: string | null;
  session_count: number;
  access_status: AccessStatus;
}

export default function ManagePatientsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  const [rows, setRows]       = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.clinic_id) {
      setError("Your account is not linked to a clinic.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      //Patients at this clinic (joined to profile for the canonical code/name)
      const patientsRes = await supabase
        .from("patients")
        .select(`
          id, profile_id, sex, date_of_birth,
          profile:profiles!inner ( patient_code, full_name )
        `)
        .eq("clinic_id", user.clinic_id);
      if (patientsRes.error) throw patientsRes.error;

      type Joined = {
        id: string; profile_id: string;
        sex: string | null; date_of_birth: string | null;
        profile: { patient_code: string; full_name: string } | null;
      };
      //Supabase types the joined relation as an array even when it's
      //one-to-one (an inner-join of a uuid FK). Normalize to a single object.
      const raw = (patientsRes.data ?? []) as unknown as Array<Omit<Joined, "profile"> & {
        profile: Joined["profile"] | { patient_code: string; full_name: string }[];
      }>;
      const ps: Joined[] = raw.map((r) => ({
        ...r,
        profile: Array.isArray(r.profile) ? r.profile[0] ?? null : r.profile,
      }));
      if (ps.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      //Pull all access rows for this clinic in one shot, plus session counts
      const profileIds = ps.map((p) => p.profile_id);
      const [accessRes, sessionsRes] = await Promise.all([
        supabase
          .from("clinic_access")
          .select("patient_profile_id, status")
          .eq("clinic_id", user.clinic_id)
          .in("patient_profile_id", profileIds),
        supabase
          .from("screening_sessions")
          .select("patient_id")
          .eq("clinic_id", user.clinic_id)
          .in("patient_id", ps.map((p) => p.id)),
      ]);
      if (accessRes.error)   throw accessRes.error;
      if (sessionsRes.error) throw sessionsRes.error;

      const accessByProfile = new Map<string, AccessStatus>();
      for (const a of (accessRes.data ?? []) as { patient_profile_id: string; status: AccessStatus }[]) {
        accessByProfile.set(a.patient_profile_id, a.status);
      }
      const countByPatient = new Map<string, number>();
      for (const s of (sessionsRes.data ?? []) as { patient_id: string }[]) {
        countByPatient.set(s.patient_id, (countByPatient.get(s.patient_id) ?? 0) + 1);
      }

      const list: PatientRow[] = ps
        .map((p) => ({
          patient_id:    p.id,
          profile_id:    p.profile_id,
          full_name:     p.profile?.full_name ?? "—",
          patient_code:  p.profile?.patient_code ?? "—",
          sex:           p.sex,
          date_of_birth: p.date_of_birth,
          session_count: countByPatient.get(p.id) ?? 0,
          access_status: accessByProfile.get(p.profile_id) ?? "none",
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

      setRows(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load patients.");
    } finally {
      setLoading(false);
    }
  }, [user?.clinic_id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = useCallback(({ item }: { item: PatientRow }) => {
    const ageStr = item.date_of_birth
      ? `${Math.floor((Date.now() - new Date(item.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))}y`
      : null;

    const access = ACCESS_BADGE[item.access_status];

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/(clinic)/history?patient_id=${item.patient_id}` as any)}
        activeOpacity={0.7}
      >
        <InitialsAvatar
          initials={personInitials(item.full_name.split(" ")[0], item.full_name.split(" ").slice(-1)[0])}
          seed={item.profile_id}
          size={40}
        />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.full_name}
          </Text>
          <Text style={[styles.code, { color: colors.textSec }]} numberOfLines={1}>
            {item.patient_code}
            {ageStr ? ` · ${ageStr}` : ""}
            {item.sex ? ` · ${item.sex.charAt(0).toUpperCase()}${item.sex.slice(1)}` : ""}
          </Text>
        </View>
        <View style={styles.right}>
          <View style={[styles.statusPill, { backgroundColor: `${access.color(colors)}26`, borderColor: `${access.color(colors)}66` }]}>
            <Text style={[styles.statusText, { color: access.color(colors) }]}>{access.label}</Text>
          </View>
          <Text style={[styles.sessionCount, { color: colors.textSec }]}>
            {item.session_count} {item.session_count === 1 ? "session" : "sessions"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSec} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  }, [colors, router]);

  return (
    <ScreenWrapper>
      <Header
        title="Manage Patients"
        subtitle={rows.length ? `${rows.length} ${rows.length === 1 ? "patient" : "patients"}` : undefined}
        leftIcon={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
        rightIcon={
          <TouchableOpacity onPress={() => router.push("/(clinic)/register-patient" as any)}>
            <Ionicons name="person-add-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textSec }]}>{error}</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={40} color={colors.textSec} />
          <Text style={[styles.emptyTitle, { color: colors.textSec }]}>No linked patients yet</Text>
          <Text style={[styles.emptyHint, { color: colors.textSec }]}>
            Patients link to your clinic the first time you capture for them by entering their Patient ID.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(clinic)/register-patient" as any)}
            style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={16} color={colors.textInverse} />
            <Text style={[styles.emptyBtnText, { color: colors.textInverse }]}>Add patient by ID</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.patient_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}

const ACCESS_BADGE: Record<AccessStatus, { label: string; color: (c: { warning: string; success: string; error: string; textSec: string }) => string }> = {
  none:     { label: "No request",   color: (c) => c.textSec },
  pending:  { label: "Pending",      color: (c) => c.warning },
  accepted: { label: "Approved",     color: (c) => c.success },
  rejected: { label: "Disapproved",  color: (c) => c.error   },
  revoked:  { label: "Revoked",      color: (c) => c.error   },
};

const styles = StyleSheet.create({
  list: { padding: Spacing.lg, paddingBottom: Spacing["3xl"] },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading },
  code: { fontSize: Typography.sizes.xs,   fontFamily: Typography.fonts.mono },
  right: { alignItems: "flex-end", gap: 4 },
  statusPill: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
  sessionCount: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.lg, gap: Spacing.sm },
  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center" },
  emptyTitle: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading },
  emptyHint:  { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, marginTop: Spacing.md,
  },
  emptyBtnText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading },
});
