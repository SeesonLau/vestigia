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
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { S } from "../../constants/strings";
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
  const { colors } = useTheme();
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
          color={danger ? colors.error : colors.textSec}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: danger ? colors.error : colors.text }]}>
          {label}
        </Text>
        {subtitle ? <Text style={[styles.rowSub, { color: colors.textSec }]}>{subtitle}</Text> : null}
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={toggleValue ? colors.textInverse : colors.textSec}
        />
      ) : value ? (
        <Text style={[styles.rowValue, { color: colors.textSec }]}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textSec} />
      ) : null}
    </TouchableOpacity>
  );
}

const soon = (feature: string) =>
  Alert.alert("Coming Soon", `${feature} is not yet available.`);

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [auditLog, setAuditLog] = useState(true);
  const [aiModel, setAiModel] = useState("dpn-v1.2.0");
  const [threshold, setThreshold] = useState("2.2");
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("system_config")
      .select("key, value")
      .in("key", ["maintenance_mode", "audit_log_enabled", "ai_model_version", "asymmetry_threshold"])
      .then(({ data, error }) => {
        if (error) {
          setConfigError("Failed to load system configuration.");
          return;
        }
        const loadedKeys = data?.map((r) => r.key) ?? [];
        const toSeed: { key: string; value: unknown; updated_at: string }[] = [];
        if (!loadedKeys.includes("ai_model_version"))
          toSeed.push({ key: "ai_model_version", value: "dpn-v1.2.0", updated_at: new Date().toISOString() });
        if (!loadedKeys.includes("asymmetry_threshold"))
          toSeed.push({ key: "asymmetry_threshold", value: 2.2, updated_at: new Date().toISOString() });
        if (toSeed.length > 0) {
          supabase.from("system_config").upsert(toSeed, { onConflict: "key", ignoreDuplicates: true });
        }
        data?.forEach((row) => {
          if (row.key === "maintenance_mode") setMaintenanceMode(row.value === true);
          if (row.key === "audit_log_enabled") setAuditLog(row.value === true);
          if (row.key === "ai_model_version") setAiModel(String(row.value));
          if (row.key === "asymmetry_threshold") setThreshold(String(row.value));
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
        rightIcon={
          <Text style={[styles.adminBadge, { color: colors.warning, borderColor: `${colors.warning}66`, backgroundColor: `${colors.warning}1A` }]}>
            ADMIN
          </Text>
        }
      />
      <View style={styles.container}>
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: `${colors.warning}26`, borderColor: `${colors.warning}66` }]}>
            <Text style={[styles.avatarText, { color: colors.warning }]}>
              {user?.full_name?.charAt(0) ?? "A"}
            </Text>
          </View>
          <View>
            <Text style={[styles.profileName, { color: colors.text }]}>{user?.full_name ?? "—"}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSec }]}>{user?.email ?? "—"}</Text>
            <Text style={[styles.profileRole, { color: colors.warning }]}>System Administrator</Text>
          </View>
        </View>

        {configError && (
          <Text style={[styles.configError, { color: colors.error }]}>{configError}</Text>
        )}

        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>System</Text>
        <Card style={styles.card}>
          <SettingRow
            icon="construct-outline"
            label="Maintenance Mode"
            subtitle="Disable access for non-admin users"
            toggle
            toggleValue={maintenanceMode}
            onToggle={handleMaintenanceToggle}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="clipboard-outline"
            label="Audit Log"
            subtitle="Track all user actions"
            toggle
            toggleValue={auditLog}
            onToggle={handleAuditLogToggle}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="hardware-chip-outline"
            label="AI Model Version"
            value={aiModel}
            onPress={() => soon("AI model configuration")}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="thermometer-outline"
            label="Asymmetry Threshold"
            value={`${threshold}°C`}
            onPress={() => soon("Threshold configuration")}
          />
        </Card>

        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>Account</Text>
        <Card style={styles.card}>
          <SettingRow
            icon="lock-closed-outline"
            label={S.auth.changePassword}
            onPress={() => router.push("/(auth)/update-password" as any)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="notifications-outline"
            label="Notifications"
            onPress={() => soon("Notification settings")}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="color-palette-outline"
            label="Dark Mode"
            toggle
            toggleValue={isDark}
            onToggle={() => toggleTheme()}
          />
        </Card>

        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>About</Text>
        <Card style={styles.card}>
          <SettingRow icon="information-circle-outline" label="App Version" value={S.app.version} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow icon="server-outline" label="Database" value="Supabase" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => soon("Privacy Policy")}
          />
        </Card>

        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>Danger Zone</Text>
        <Card style={styles.card}>
          <SettingRow
            icon="log-out-outline"
            label="Sign Out"
            danger
            onPress={handleSignOut}
          />
        </Card>

        <Text style={[styles.version, { color: colors.textSec }]}>
          {S.app.name} Admin · {S.app.version}
        </Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  adminBadge: {
    fontSize: 9,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1.5,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  container: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  configError: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
  },
  profileName: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
  },
  profileEmail: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    marginTop: 2,
  },
  profileRole: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
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
  },
  rowSub: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: 2,
  },
  rowValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg + 32 + Spacing.md,
  },
  version: {
    textAlign: "center",
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    marginTop: Spacing.xl,
    marginBottom: Spacing["2xl"],
    letterSpacing: 0.5,
  },
});
