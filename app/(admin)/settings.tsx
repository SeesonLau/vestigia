// app/(admin)/settings.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { Card } from "../../components/ui/index";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

interface SettingRowProps {
  label: string;
  subtitle?: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
}

function SettingRow({
  label,
  subtitle,
  value,
  toggle,
  toggleValue,
  onToggle,
  onPress,
  icon,
  danger,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !toggle}
      style={styles.row}
      activeOpacity={0.7}
    >
      <View style={styles.rowIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? "#f87171" : Colors.text.muted}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger ? styles.danger : null]}>
          {label}
        </Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border.default, true: Colors.primary[500] }}
          thumbColor={toggleValue ? Colors.primary[200] : Colors.text.muted}
        />
      ) : value ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : onPress ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const soon = (feature: string) =>
  Alert.alert("Coming Soon", `${feature} is not yet available.`);

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [auditLog, setAuditLog] = useState(true);

  useEffect(() => {
    supabase
      .from("system_config")
      .select("key, value")
      .in("key", ["maintenance_mode", "audit_log_enabled"])
      .then(({ data }) => {
        data?.forEach((row) => {
          if (row.key === "maintenance_mode") setMaintenanceMode(row.value === true);
          if (row.key === "audit_log_enabled") setAuditLog(row.value === true);
        });
      });
  }, []);

  const updateConfig = (key: string, value: boolean) => {
    supabase
      .from("system_config")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key)
      .then(({ error }) => {
        if (error) Alert.alert("Error", "Failed to save setting.");
      });
  };

  const handleMaintenanceToggle = (v: boolean) => {
    setMaintenanceMode(v);
    updateConfig("maintenance_mode", v);
  };

  const handleAuditLogToggle = (v: boolean) => {
    setAuditLog(v);
    updateConfig("audit_log_enabled", v);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScreenWrapper scrollable>
      <Header
        title="Admin Settings"
        rightIcon={<Text style={styles.adminBadge}>ADMIN</Text>}
      />
      <View style={styles.container}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0) ?? "A"}
            </Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.full_name ?? "—"}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? "—"}</Text>
            <Text style={styles.profileRole}>System Administrator</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>System</Text>
        <Card style={styles.card}>
          <SettingRow
            icon="construct-outline"
            label="Maintenance Mode"
            subtitle="Disable access for non-admin users"
            toggle
            toggleValue={maintenanceMode}
            onToggle={handleMaintenanceToggle}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="clipboard-outline"
            label="Audit Log"
            subtitle="Track all user actions"
            toggle
            toggleValue={auditLog}
            onToggle={handleAuditLogToggle}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="hardware-chip-outline"
            label="AI Model Version"
            value="dpn-v1.2.0"
            onPress={() => soon("AI model configuration")}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="thermometer-outline"
            label="Asymmetry Threshold"
            value="2.2°C"
            onPress={() => soon("Threshold configuration")}
          />
        </Card>

        <Text style={styles.sectionHeader}>Account</Text>
        <Card style={styles.card}>
          <SettingRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => router.push("/(auth)/update-password" as any)}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="notifications-outline"
            label="Notifications"
            onPress={() => soon("Notification settings")}
          />
        </Card>

        <Text style={styles.sectionHeader}>About</Text>
        <Card style={styles.card}>
          <SettingRow icon="information-circle-outline" label="App Version" value="0.3.0" />
          <View style={styles.divider} />
          <SettingRow icon="server-outline" label="Database" value="Supabase" />
          <View style={styles.divider} />
          <SettingRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => soon("Privacy Policy")}
          />
        </Card>

        <Text style={styles.sectionHeader}>Danger Zone</Text>
        <Card style={styles.card}>
          <SettingRow
            icon="log-out-outline"
            label="Sign Out"
            danger
            onPress={handleSignOut}
          />
        </Card>

        <Text style={styles.version}>DPN Thermal Admin · v0.3.0</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  adminBadge: {
    fontSize: 9,
    fontFamily: Typography.fonts.heading,
    color: Colors.warning,
    letterSpacing: 1.5,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.4)",
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(245,158,11,0.1)",
  },
  container: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(245,158,11,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.warning,
  },
  profileName: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
  },
  profileEmail: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: 2,
  },
  profileRole: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.warning,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    marginLeft: Spacing.xs,
  },
  card: { padding: 0, overflow: "hidden", marginBottom: Spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowIcon: { width: 32, alignItems: "center", marginRight: Spacing.md },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.primary,
  },
  rowSub: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: 2,
  },
  danger: { color: "#f87171" },
  rowValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
  },
  chevron: { fontSize: 22, color: Colors.text.muted },
  divider: {
    height: 1,
    backgroundColor: Colors.border.subtle,
    marginLeft: Spacing.lg + 32 + Spacing.md,
  },
  version: {
    textAlign: "center",
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
    marginTop: Spacing.xl,
    marginBottom: Spacing["2xl"],
    letterSpacing: 0.5,
  },
});
