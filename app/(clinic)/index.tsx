// app/(clinic)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { StatusIndicator } from "../../components/ui/index";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  accent?: string;
}

function QuickAction({
  icon,
  title,
  subtitle,
  onPress,
  accent,
}: QuickActionProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.actionCard}
      accessibilityLabel={title}
      accessibilityRole="button"
    >
      <View
        style={[
          styles.actionIconWrap,
          { borderColor: accent ?? Colors.border.default },
        ]}
      >
        <Ionicons name={icon} size={22} color={Colors.text.secondary} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.actionChevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ClinicHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };
  const [clinicName, setClinicName] = useState("My Clinic");
  const [todayStats, setTodayStats] = useState({ total: 0, positive: 0, negative: 0 });

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!user?.clinic_id) return;

    const fetchData = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [clinicResult, sessionsResult] = await Promise.all([
        supabase.from("clinics").select("name").eq("id", user.clinic_id).single(),
        supabase.from("screening_sessions")
          .select("id, classification:classification_results(classification)")
          .eq("clinic_id", user.clinic_id)
          .gte("started_at", todayStart.toISOString()),
      ]);

      if (!clinicResult.error && clinicResult.data?.name) setClinicName(clinicResult.data.name);

      if (!sessionsResult.error && sessionsResult.data) {
        const sessions = sessionsResult.data as Array<{ id: string; classification: { classification: string }[] | { classification: string } | null }>;
        const getClass = (s: typeof sessions[number]) =>
          Array.isArray(s.classification) ? s.classification[0]?.classification : s.classification?.classification;
        const positive = sessions.filter((s) => getClass(s) === "POSITIVE").length;
        const negative = sessions.filter((s) => getClass(s) === "NEGATIVE").length;
        setTodayStats({ total: sessions.length, positive, negative });
      }
    };

    fetchData();
  }, [user?.clinic_id]);

  return (
    <ScreenWrapper scrollable>
      {/* Custom header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{timeGreeting} 👋</Text>
          <Text style={styles.clinicName}>{clinicName}</Text>
        </View>
        <View style={styles.headerRight}>
          <StatusIndicator status="connected" label="Scanner Online" />
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtn}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.container}>
        {/* Today's stats */}
        <View style={styles.todayCard}>
          <Text style={styles.todayLabel}>Today's Sessions</Text>
          <View style={styles.todayRow}>
            <View style={styles.todayStat}>
              <Text style={styles.todayValue}>{todayStats.total}</Text>
              <Text style={styles.todayKey}>Total</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayStat}>
              <Text style={[styles.todayValue, styles.positiveVal]}>{todayStats.positive}</Text>
              <Text style={styles.todayKey}>Positive</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayStat}>
              <Text style={[styles.todayValue, styles.negativeVal]}>{todayStats.negative}</Text>
              <Text style={styles.todayKey}>Negative</Text>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>

        <QuickAction
          icon="bluetooth-outline"
          title="Pair Device"
          subtitle="Connect to DPN Scanner via BLE"
          onPress={() => router.push("/(clinic)/pairing")}
          accent="rgba(59,130,246,0.5)"
        />
        <QuickAction
          icon="camera-outline"
          title="New Screening"
          subtitle="Start a new thermal capture session"
          onPress={() => router.push("/(clinic)/patient-select" as any)}
          accent="rgba(20,176,142,0.5)"
        />
        <QuickAction
          icon="time-outline"
          title="Session History"
          subtitle="Review past screening results"
          onPress={() => router.push("/(clinic)/history")}
          accent="rgba(0,128,200,0.5)"
        />
        <QuickAction
          icon="settings-outline"
          title="Settings"
          subtitle="Device, app, and account settings"
          onPress={() => router.push("/(clinic)/settings")}
          accent="rgba(77,106,150,0.5)"
        />

        {/* Device status card */}
        <Text style={styles.sectionLabel}>Device Status</Text>
        <View style={styles.deviceCard}>
          <View style={styles.deviceTop}>
            <Text style={styles.deviceName}>DPN-Scanner-01</Text>
            <View style={styles.deviceActive}>
              <View style={styles.deviceActiveDot} />
              <Text style={styles.deviceActiveText}>Active</Text>
            </View>
          </View>
          <View style={styles.deviceStats}>
            <View style={styles.deviceStat}>
              <Text style={styles.deviceStatLabel}>Sensor</Text>
              <Text style={styles.deviceStatValue}>MI0802M5S</Text>
            </View>
            <View style={styles.deviceStat}>
              <Text style={styles.deviceStatLabel}>Firmware</Text>
              <Text style={styles.deviceStatValue}>v2.1.4</Text>
            </View>
            <View style={styles.deviceStat}>
              <Text style={styles.deviceStatLabel}>Last Cal.</Text>
              <Text style={styles.deviceStatValue}>Feb 10</Text>
            </View>
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
    borderBottomColor: Colors.border.subtle,
  },
  greeting: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginBottom: 2,
  },
  clinicName: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
  },
  headerRight: { paddingTop: Spacing.xs, flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  logoutBtn: { padding: 4 },

  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },

  // Today stats
  todayCard: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  todayLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  todayRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  todayStat: { flex: 1, alignItems: "center" },
  todayValue: {
    fontSize: Typography.sizes["3xl"],
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
  },
  positiveVal: { color: "#f87171" },
  negativeVal: { color: Colors.teal[300] },
  todayKey: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  todayDivider: {
    width: 1,
    height: 48,
    backgroundColor: Colors.border.subtle,
  },

  // Section label
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },

  // Quick actions
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.bg.glassLight,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
actionText: { flex: 1 },
  actionTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    color: Colors.text.primary,
  },
  actionSubtitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: 2,
  },
  actionChevron: {
    fontSize: 22,
    color: Colors.text.muted,
    marginLeft: Spacing.sm,
  },

  // Device card
  deviceCard: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
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
    color: Colors.text.primary,
  },
  deviceActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(20,176,142,0.12)",
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(20,176,142,0.3)",
  },
  deviceActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.teal[400],
  },
  deviceActiveText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.teal[300],
    letterSpacing: 0.5,
  },
  deviceStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  deviceStat: {},
  deviceStatLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  deviceStatValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});
