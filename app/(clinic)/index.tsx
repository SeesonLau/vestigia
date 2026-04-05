// app/(clinic)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { StatusIndicator } from "../../components/ui/index";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function QuickAction({ icon, title, subtitle, onPress }: QuickActionProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessibilityLabel={title}
      accessibilityRole="button"
    >
      <View style={[styles.actionIconWrap, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={styles.actionText}>
        <Text style={[styles.actionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.actionSubtitle, { color: colors.textSec }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSec} />
    </TouchableOpacity>
  );
}

export default function ClinicHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [clinicName, setClinicName] = useState("My Clinic");
  const [todayStats, setTodayStats] = useState({ total: 0, positive: 0, negative: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!user?.clinic_id) return;
    const fetchData = async () => {
      setStatsLoading(true);
      setStatsError(null);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [clinicResult, sessionsResult] = await Promise.all([
        supabase.from("clinics").select("name").eq("id", user.clinic_id).single(),
        supabase.from("screening_sessions")
          .select("id, classification:classification_results(classification)")
          .eq("clinic_id", user.clinic_id)
          .gte("started_at", todayStart.toISOString()),
      ]);

      if (clinicResult.error) {
        setStatsError("Could not load clinic data.");
      } else if (clinicResult.data?.name) {
        setClinicName(clinicResult.data.name);
      }

      if (!sessionsResult.error && sessionsResult.data) {
        const sessions = sessionsResult.data as Array<{ id: string; classification: { classification: string }[] | { classification: string } | null }>;
        const getClass = (s: typeof sessions[number]) =>
          Array.isArray(s.classification) ? s.classification[0]?.classification : s.classification?.classification;
        const positive = sessions.filter((s) => getClass(s) === "POSITIVE").length;
        const negative = sessions.filter((s) => getClass(s) === "NEGATIVE").length;
        setTodayStats({ total: sessions.length, positive, negative });
      }
      setStatsLoading(false);
    };
    fetchData();
  }, [user?.clinic_id]);

  return (
    <ScreenWrapper scrollable>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSec }]}>{timeGreeting}</Text>
          <Text style={[styles.clinicName, { color: colors.text }]}>{clinicName}</Text>
        </View>
        <View style={styles.headerRight}>
          <StatusIndicator status="connected" label="Scanner Online" />
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtn}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.textSec} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.container}>
        {/* Today's stats */}
        <View style={[styles.todayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.todayLabel, { color: colors.textSec }]}>Today's Sessions</Text>
          {statsLoading ? (
            <ActivityIndicator color={colors.accent} style={{ paddingVertical: Spacing.md }} />
          ) : statsError ? (
            <Text style={[styles.statsError, { color: colors.error }]}>{statsError}</Text>
          ) : (
            <View style={styles.todayRow}>
              <View style={styles.todayStat}>
                <Text style={[styles.todayValue, { color: colors.text }]}>{todayStats.total}</Text>
                <Text style={[styles.todayKey, { color: colors.textSec }]}>Total</Text>
              </View>
              <View style={[styles.todayDivider, { backgroundColor: colors.border }]} />
              <View style={styles.todayStat}>
                <Text style={[styles.todayValue, { color: colors.error }]}>{todayStats.positive}</Text>
                <Text style={[styles.todayKey, { color: colors.textSec }]}>Positive</Text>
              </View>
              <View style={[styles.todayDivider, { backgroundColor: colors.border }]} />
              <View style={styles.todayStat}>
                <Text style={[styles.todayValue, { color: colors.success }]}>{todayStats.negative}</Text>
                <Text style={[styles.todayKey, { color: colors.textSec }]}>Negative</Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick actions */}
        <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Quick Actions</Text>
        <QuickAction
          icon="camera-outline"
          title="New Screening"
          subtitle="Start a new thermal capture session"
          onPress={() => router.push("/(clinic)/patient-select" as any)}
        />
        <QuickAction
          icon="time-outline"
          title="Session History"
          subtitle="Review past screening results"
          onPress={() => router.push("/(clinic)/history")}
        />
        <QuickAction
          icon="hardware-chip-outline"
          title="Device Pairing"
          subtitle="Connect or register scanner devices"
          onPress={() => router.push("/(clinic)/pairing")}
        />
        <QuickAction
          icon="settings-outline"
          title="Settings"
          subtitle="Device, app, and account settings"
          onPress={() => router.push("/(clinic)/settings")}
        />

        {/* Device status card */}
        <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Device Status</Text>
        <View style={[styles.deviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.deviceTop}>
            <Text style={[styles.deviceName, { color: colors.text }]}>DPN-Scanner-01</Text>
            <View style={[styles.deviceActive, { backgroundColor: `${colors.success}1F`, borderColor: `${colors.success}4D` }]}>
              <View style={[styles.deviceActiveDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.deviceActiveText, { color: colors.success }]}>Active</Text>
            </View>
          </View>
          <View style={styles.deviceStats}>
            {[
              ["Sensor", "MI0802M5S"],
              ["Firmware", "v2.1.4"],
              ["Last Cal.", "Feb 10"],
            ].map(([label, value]) => (
              <View key={label} style={styles.deviceStat}>
                <Text style={[styles.deviceStatLabel, { color: colors.textSec }]}>{label}</Text>
                <Text style={[styles.deviceStatValue, { color: colors.textSec }]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    marginBottom: 2,
  },
  clinicName: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
  },
  headerRight: { paddingTop: Spacing.xs, flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  logoutBtn: { padding: 4 },
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },
  todayCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  todayLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  todayRow: { flexDirection: "row", alignItems: "center" },
  todayStat: { flex: 1, alignItems: "center" },
  todayValue: {
    fontSize: Typography.sizes["3xl"],
    fontFamily: Typography.fonts.heading,
  },
  todayKey: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  todayDivider: { width: 1, height: 48 },
  statsError: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    paddingVertical: Spacing.md,
  },
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  actionText: { flex: 1 },
  actionTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
  actionSubtitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: 2,
  },
  deviceCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  deviceTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  deviceName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
  deviceActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
  },
  deviceActiveDot: { width: 6, height: 6, borderRadius: 3 },
  deviceActiveText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
  deviceStats: { flexDirection: "row", justifyContent: "space-between" },
  deviceStat: {},
  deviceStatLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
  deviceStatValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    marginTop: 2,
  },
});
