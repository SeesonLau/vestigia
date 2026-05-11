// app/(patient)/index.tsx
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
import { Disclaimer } from "../../components/ui";
import { DISCLAIMER_TEXT } from "../../constants/clinical";
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

export default function PatientHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [filter,   setFilter]   = useState<DateFilter>("today");
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [pending,  setPending]  = useState(0);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const profileId = user?.id;
      if (!profileId) {
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
            .eq("subject_profile_id", profileId)
            .order("started_at", { ascending: false });
          if (after) q = q.gte("started_at", after.toISOString());

          const [sessionsRes, pendingRes] = await Promise.all([
            q,
            supabase
              .from("data_requests")
              .select("id", { count: "exact", head: true })
              .eq("to_profile_id", profileId)
              .eq("status", "pending"),
          ]);
          if (cancelled) return;

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
          setPending(pendingRes.count ?? 0);
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : "Could not load your sessions.");
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      run();
      return () => { cancelled = true; };
    }, [user?.id, filter]),
  );

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

  const fullName = user?.first_name
    ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}`
    : "Patient";
  const initials = (user?.first_name?.[0] ?? "?") + (user?.last_name?.[0] ?? "");

  return (
    <ScreenWrapper scrollable>
      {/* Profile + greeting hero. Soft mint-tinted to read as personal /
          patient-side, visually distinct from the clinic side's filled-teal
          institutional hero. Read-only — editing lives in Settings. */}
      <View style={styles.hero}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/(patient)/profile" as any)}
          style={[styles.heroCard, { backgroundColor: colors.cardAlt, borderColor: colors.accentSoft }]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.accent, borderColor: colors.accent }]}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.avatarInitials, { color: "#FFFFFF" }]}>{initials.toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.greeting, { color: colors.textSec }]}>{timeGreeting},</Text>
            <Text style={[styles.heroName,  { color: colors.text }]} numberOfLines={1}>{fullName}</Text>
            <View style={[styles.rolePill, { backgroundColor: colors.accent }]}>
              <Ionicons name="person" size={11} color="#FFFFFF" />
              <Text style={[styles.rolePillText, { color: "#FFFFFF" }]}>Patient</Text>
            </View>
            <Text style={[styles.heroSub,   { color: colors.textSec }]} numberOfLines={1}>
              Patient ID: {user?.patient_code ?? "—"}
            </Text>
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

      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => router.push("/(patient)/live-feed" as any)}
          activeOpacity={0.85}
          style={[styles.primaryCta, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="camera" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryCtaTitle}>New Self-Screening</Text>
            <Text style={styles.primaryCtaSub}>Capture both feet for analysis</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <SecondaryAction
            icon="time-outline"
            label="History"
            onPress={() => router.push("/(patient)/history" as any)}
            colors={colors}
          />
          <SecondaryAction
            icon="cloud-upload-outline"
            label="Submit"
            badge={pending > 0 ? pending : undefined}
            onPress={() => router.push("/(patient)/submit-to-clinic" as any)}
            colors={colors}
          />
          <SecondaryAction
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push("/(patient)/settings" as any)}
            colors={colors}
          />
        </View>

        <View style={styles.sessionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textSec }]}>My Sessions</Text>
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

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Stat label="Total"    value={String(counts.total)}    color={colors.text}    colors={colors} />
          <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
          <Stat label="Positive" value={String(counts.positive)} color={colors.error}   colors={colors} />
          <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
          <Stat label="Negative" value={String(counts.negative)} color={colors.success} colors={colors} />
        </View>

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
                : "No screening sessions yet."}
            </Text>
          </View>
        ) : (
          sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onPress={() => router.push(`/(patient)/bundle-detail?session_id=${s.id}` as any)}
            />
          ))
        )}

        <Disclaimer text={DISCLAIMER_TEXT} style={{ marginTop: Spacing.md }} />
      </View>
    </ScreenWrapper>
  );
}

function SecondaryAction({
  icon, label, onPress, colors, badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: import("../../constants/theme").ThemeColors;
  badge?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.secondaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View>
        <Ionicons name={icon} size={20} color={colors.accent} />
        {badge != null ? (
          <View style={[styles.badge, { backgroundColor: colors.error }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
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
  heroSub:  { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono },
  rolePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start",
    borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 2,
    marginTop: 4, marginBottom: 4,
  },
  rolePillText: {
    fontSize: 9, fontFamily: Typography.fonts.heading,
    letterSpacing: 1, textTransform: "uppercase",
  },
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

  badge: {
    position: "absolute", top: -6, right: -10,
    minWidth: 16, height: 16, borderRadius: 8,
    paddingHorizontal: 4, alignItems: "center", justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 9, fontFamily: Typography.fonts.heading },

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
