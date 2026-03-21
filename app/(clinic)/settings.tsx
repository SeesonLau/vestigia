// app/(clinic)/settings.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { Colors, Spacing, Typography } from "../../constants/theme";
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
      style={styles.settingRow}
      activeOpacity={0.7}
    >
      <View style={styles.settingIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? "#f87171" : Colors.text.muted}
        />
      </View>
      <View style={styles.settingTextGroup}>
        <Text style={[styles.settingLabel, danger ? styles.dangerText : undefined]}>
          {label}
        </Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border.default, true: Colors.primary[500] }}
          thumbColor={toggleValue ? Colors.primary[200] : Colors.text.muted}
        />
      ) : value ? (
        <Text style={styles.settingValue}>{value}</Text>
      ) : onPress ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </TouchableOpacity>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

const soon = (feature: string) =>
  Alert.alert("Coming Soon", `${feature} is not yet available.`);

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const [haptics, setHaptics] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [autoUpload, setAutoUpload] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);

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

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently remove your account and all associated data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => soon("Account deletion") },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Local Cache",
      "This will remove all locally stored session data that hasn't been uploaded yet.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => soon("Clear local cache") },
      ]
    );
  };

  return (
    <ScreenWrapper scrollable>
      <Header title="Settings" subtitle="UI-07" />

      <View style={styles.container}>
        {/* Account */}
        <SectionHeader label="Account" />
        <Card style={styles.card}>
          <SettingRow
            icon="person-outline"
            label="Profile"
            subtitle="Manage your account info"
            onPress={() => soon("Profile management")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => router.push("/(auth)/update-password" as any)}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="notifications-outline"
            label="Notifications"
            onPress={() => soon("Notification settings")}
          />
        </Card>

        {/* Device */}
        <SectionHeader label="Device" />
        <Card style={styles.card}>
          <SettingRow
            icon="hardware-chip-outline"
            label="Paired Device"
            subtitle="DPN-Scanner-01"
            value="Connected"
            onPress={() => router.push("/(clinic)/pairing")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="wifi-outline"
            label="Scan for New Device"
            onPress={() => router.push("/(clinic)/pairing")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="refresh-outline"
            label="Auto-Reconnect"
            toggle
            toggleValue={autoReconnect}
            onToggle={setAutoReconnect}
          />
        </Card>

        {/* Data & Sync */}
        <SectionHeader label="Data & Sync" />
        <Card style={styles.card}>
          <SettingRow
            icon="cloud-upload-outline"
            label="Auto-Upload"
            subtitle="Upload sessions when connected"
            toggle
            toggleValue={autoUpload}
            onToggle={setAutoUpload}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="archive-outline"
            label="Offline Mode"
            subtitle="Store sessions locally for later upload"
            toggle
            toggleValue={offlineMode}
            onToggle={setOfflineMode}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="time-outline"
            label="Pending Uploads"
            value="0"
            onPress={() => soon("Pending uploads view")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="trash-outline"
            label="Clear Local Cache"
            onPress={handleClearCache}
          />
        </Card>

        {/* App */}
        <SectionHeader label="Application" />
        <Card style={styles.card}>
          <SettingRow
            icon="phone-portrait-outline"
            label="Haptic Feedback"
            toggle
            toggleValue={haptics}
            onToggle={setHaptics}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="color-palette-outline"
            label="Theme"
            value="Dark (Default)"
            onPress={() => soon("Theme selection")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="language-outline"
            label="Language"
            value="English"
            onPress={() => soon("Language selection")}
          />
        </Card>

        {/* About */}
        <SectionHeader label="About" />
        <Card style={styles.card}>
          <SettingRow icon="information-circle-outline" label="App Version" value="0.3.0" />
          <View style={styles.rowDivider} />
          <SettingRow icon="hardware-chip-outline" label="AI Model" value="dpn-v1.2.0" />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => soon("Privacy Policy")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="reader-outline"
            label="Terms of Service"
            onPress={() => soon("Terms of Service")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="mail-outline"
            label="Contact Support"
            onPress={() => soon("Contact Support")}
          />
        </Card>

        {/* Danger zone */}
        <SectionHeader label="Danger Zone" />
        <Card style={styles.card}>
          <SettingRow
            icon="log-out-outline"
            label="Sign Out"
            danger
            onPress={handleSignOut}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="close-circle-outline"
            label="Delete Account"
            subtitle="Permanently remove your account and data"
            danger
            onPress={handleDeleteAccount}
          />
        </Card>

        <Text style={styles.versionFooter}>
          DPN Thermal · v0.3.0 · Build 300
        </Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
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
  card: {
    padding: 0,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  settingIcon: {
    width: 32,
    alignItems: "center",
    marginRight: Spacing.md,
  },
  settingTextGroup: { flex: 1 },
  settingLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.primary,
  },
  dangerText: { color: "#f87171" },
  settingSubtitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: 2,
  },
  settingValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
    marginLeft: Spacing.sm,
  },
  chevron: {
    fontSize: 22,
    color: Colors.text.muted,
    marginLeft: Spacing.sm,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.border.subtle,
    marginLeft: Spacing.lg + 32 + Spacing.md,
  },
  versionFooter: {
    textAlign: "center",
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
    marginTop: Spacing.xl,
    marginBottom: Spacing["2xl"],
    letterSpacing: 0.5,
  },
});
