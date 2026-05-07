// app/(clinic)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { SessionCard } from "../../components/session";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { ScreeningSession } from "../../types";

type DateFilter = "today" | "month" | "all";
type DbSession = ScreeningSession & {
  classification: ScreeningSession["classification"][] | ScreeningSession["classification"] | null;
};

function periodStart(filter: DateFilter): Date | null {
  if (filter === "all") return null;
  const d = new Date();
  if (filter === "today") d.setHours(0, 0, 0, 0);
  else { d.setDate(1); d.setHours(0, 0, 0, 0); }
  return d;
}

export default function ClinicHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [clinicName,    setClinicName]    = useState<string>("My Clinic");
  const [filter,        setFilter]        = useState<DateFilter>("today");
  const [sessions,      setSessions]      = useState<ScreeningSession[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Refetch on mount, on filter change, and whenever this screen regains
  // focus (so a new capture saved elsewhere shows up immediately).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const clinicId = user?.clinic_id;
      if (!clinicId) {
        setLoading(false);
        return;
      }

      const run = async () => {
        setLoading(true);
        setError(null);
        try {
          const after = periodStart(filter);
          let q = supabase
            .from("screening_sessions")
            .select("*, classification:classification_results(*)")
            .eq("clinic_id", clinicId)
            .order("started_at", { ascending: false });
          if (after) q = q.gte("started_at", after.toISOString());

          const [clinicRes, sessionsRes] = await Promise.all([
            supabase.from("clinics").select("facility_name").eq("id", clinicId).single(),
            q,
          ]);
          if (cancelled) return;

          if (clinicRes.data?.facility_name) setClinicName(clinicRes.data.facility_name);
          if (sessionsRes.error) throw sessionsRes.error;

          const rows = (sessionsRes.data ?? []) as DbSession[];
          setSessions(
            rows.map((s) => ({
              ...s,
              classification: Array.isArray(s.classification)
                ? s.classification[0] ?? undefined
                : s.classification ?? undefined,
            })) as ScreeningSession[]
          );
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : "Could not load sessions.");
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      run();
      return () => { cancelled = true; };
    }, [user?.clinic_id, filter]),
  );

  // Counts derived from the loaded sessions for the at-a-glance strip.
  const counts = sessions.reduce(
    (acc, s) => {
      acc.total++;
      const cls = s.classification?.classification;
      if (cls === "POSITIVE") acc.positive++;
      else if (cls === "NEGATIVE") acc.negative++;
      return acc;
    },
    { total: 0, positive: 0, negative: 0 },
  );

  const operatorName = user?.first_name
    ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}`
    : "Operator";
  const initials = (user?.first_name?.[0] ?? "?") + (user?.last_name?.[0] ?? "");

  return (
    <ScreenWrapper scrollable>
      {/* Profile + greeting hero. Read-only — editing lives in Settings. */}
      <View style={styles.hero}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/(clinic)/profile" as any)}
          style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.avatarInitials, { color: colors.accent }]}>{initials.toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.greeting, { color: colors.textSec }]}>{timeGreeting},</Text>
            <Text style={[styles.heroName,  { color: colors.text }]} numberOfLines={1}>{operatorName}</Text>
            <Text style={[styles.heroSub,   { color: colors.textSec }]} numberOfLines={1}>{clinicName}</Text>
            {user?.email ? (
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={11} color={colors.textSec} />
                <Text style={[styles.contactText, { color: colors.textSec }]} numberOfLines={1}>{user.email}</Text>
              </View>
            ) : null}
            {user?.contact_number ? (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={11} color={colors.textSec} />
                <Text style={[styles.contactText, { color: colors.textSec }]} numberOfLines={1}>{user.contact_number}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtn}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.textSec} />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {/* Primary CTA — most-used action gets pride of place. */}
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => router.push("/(clinic)/live-feed" as any)}
          activeOpacity={0.85}
          style={[styles.primaryCta, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="camera" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryCtaTitle}>New Screening</Text>
            <Text style={styles.primaryCtaSub}>Start a thermal capture session</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <SecondaryAction
            icon="people-outline"
            label="Patients"
            onPress={() => router.push("/(clinic)/manage-patients" as any)}
            colors={colors}
          />
          <SecondaryAction
            icon="time-outline"
            label="History"
            onPress={() => router.push("/(clinic)/history" as any)}
            colors={colors}
          />
          <SecondaryAction
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push("/(clinic)/settings" as any)}
            colors={colors}
          />
        </View>

        {/* Sessions section header + filter toggle */}
        <View style={styles.sessionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Sessions</Text>
          <View style={[styles.filterSeg, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {([
              ["today", "Today"],
              ["month", "This Month"],
              ["all",   "All"],
            ] as const).map(([val, label]) => {
              const active = filter === val;
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => setFilter(val)}
                  style={[styles.filterBtn, active && { backgroundColor: colors.accent }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterText, { color: active ? "#fff" : colors.textSec }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* At-a-glance counts derived from the filtered list */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Stat label="Total"    value={String(counts.total)}    color={colors.text}    colors={colors} />
          <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
          <Stat label="Positive" value={String(counts.positive)} color={colors.error}   colors={colors} />
          <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
          <Stat label="Negative" value={String(counts.negative)} color={colors.success} colors={colors} />
        </View>

        {/* Session list — same SessionCard used everywhere else for consistency. */}
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ paddingVertical: Spacing.lg }} />
        ) : error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        ) : sessions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="folder-open-outline" size={32} color={colors.textSec} />
            <Text style={[styles.emptyText, { color: colors.textSec }]}>
              {filter === "today" ? "No sessions today yet."
                : filter === "month" ? "No sessions this month yet."
                : "No sessions yet."}
            </Text>
          </View>
        ) : (
          sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onPress={() => router.push(`/(clinic)/bundle-detail?sessionId=${s.id}` as any)}
            />
          ))
        )}
      </View>
    </ScreenWrapper>
  );
}

function SecondaryAction({
  icon, label, onPress, colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: import("../../constants/theme").ThemeColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.secondaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Ionicons name={icon} size={20} color={colors.accent} />
      <Text style={[styles.secondaryLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Stat({
  label, value, color, colors,
}: {
  label: string; value: string; color: string;
  colors: import("../../constants/theme").ThemeColors;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSec }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  heroCard: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: Radius.xl,
    padding: Spacing.md, gap: Spacing.md,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 1,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarInitials: { fontSize: 18, fontFamily: Typography.fonts.heading, letterSpacing: 1 },
  heroText: { flex: 1, gap: 2 },
  greeting: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, letterSpacing: 0.3 },
  heroName: { fontSize: Typography.sizes.lg, fontFamily: Typography.fonts.heading },
  heroSub:  { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  contactText: { fontSize: 10, fontFamily: Typography.fonts.mono },
  logoutBtn: { padding: 4, alignSelf: "flex-start" },

  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing["2xl"],
  },

  primaryCta: {
    flexDirection: "row", alignItems: "center",
    borderRadius: Radius.xl, padding: Spacing.md, gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  primaryCtaTitle: { color: "#fff", fontSize: Typography.sizes.lg, fontFamily: Typography.fonts.heading },
  primaryCtaSub:   { color: "rgba(255,255,255,0.85)", fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, marginTop: 1 },

  secondaryRow:  { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  secondaryCard: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1, borderRadius: Radius.lg, paddingVertical: Spacing.md,
  },
  secondaryLabel: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.subheading },

  sessionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.heading,
    letterSpacing: 1.5, textTransform: "uppercase",
  },

  filterSeg:  { flexDirection: "row", borderWidth: 1, borderRadius: Radius.md, padding: 2 },
  filterBtn:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm },
  filterText: { fontSize: 10, fontFamily: Typography.fonts.heading, letterSpacing: 0.5 },

  statsCard: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, marginBottom: Spacing.md,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: Typography.sizes["2xl"], fontFamily: Typography.fonts.heading },
  statLabel: { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },
  statsDivider: { width: 1, height: 28 },

  emptyCard: {
    alignItems: "center", justifyContent: "center", gap: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.lg, paddingVertical: Spacing.xl,
  },
  emptyText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body },
  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", paddingVertical: Spacing.lg },
});
