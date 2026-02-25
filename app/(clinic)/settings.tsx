// app/(clinic)/settings.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { Card } from "../../components/ui/index";
import { Colors, Spacing, Typography } from "../../constants/theme";

interface SettingRowProps {
  label: string;
  subtitle?: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  icon?: string;
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
      {icon && (
        <View style={styles.settingIcon}>
          <Text style={styles.settingIconText}>{icon}</Text>
        </View>
      )}
      <View style={styles.settingTextGroup}>
        <Text
          style={[styles.settingLabel, danger ? styles.dangerText : undefined]}
        >
          {label}
        </Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{
            false: Colors.border.default,
            true: Colors.primary[500],
          }}
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

export default function SettingsScreen() {
  const [haptics, setHaptics] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [autoUpload, setAutoUpload] = useState(true);

  return (
    <ScreenWrapper scrollable>
      <Header title="Settings" subtitle="UI-07" />

      <View style={styles.container}>
        {/* Account */}
        <SectionHeader label="Account" />
        <Card style={styles.card}>
          <SettingRow
            icon="👤"
            label="Profile"
            subtitle="Manage your account info"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <SettingRow icon="🔒" label="Change Password" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="🔔" label="Notifications" onPress={() => {}} />
        </Card>

        {/* Device */}
        <SectionHeader label="Device" />
        <Card style={styles.card}>
          <SettingRow
            icon="◈"
            label="Paired Device"
            subtitle="DPN-Scanner-01"
            value="Connected"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="📡"
            label="Scan for New Device"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="🔁"
            label="Auto-Reconnect"
            toggle
            toggleValue={true}
            onToggle={() => {}}
          />
        </Card>

        {/* Data & Sync */}
        <SectionHeader label="Data & Sync" />
        <Card style={styles.card}>
          <SettingRow
            icon="☁"
            label="Auto-Upload"
            subtitle="Upload sessions when connected"
            toggle
            toggleValue={autoUpload}
            onToggle={setAutoUpload}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="📦"
            label="Offline Mode"
            subtitle="Store sessions locally for later upload"
            toggle
            toggleValue={offlineMode}
            onToggle={setOfflineMode}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="🗂"
            label="Pending Uploads"
            value="0"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <SettingRow icon="🗑" label="Clear Local Cache" onPress={() => {}} />
        </Card>

        {/* App */}
        <SectionHeader label="Application" />
        <Card style={styles.card}>
          <SettingRow
            icon="📳"
            label="Haptic Feedback"
            toggle
            toggleValue={haptics}
            onToggle={setHaptics}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="🎨"
            label="Theme"
            value="Dark (Default)"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="🌐"
            label="Language"
            value="English"
            onPress={() => {}}
          />
        </Card>

        {/* About */}
        <SectionHeader label="About" />
        <Card style={styles.card}>
          <SettingRow icon="ℹ" label="App Version" value="1.0.0" />
          <View style={styles.rowDivider} />
          <SettingRow icon="🤖" label="AI Model" value="dpn-v1.2.0" />
          <View style={styles.rowDivider} />
          <SettingRow icon="📄" label="Privacy Policy" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="📜" label="Terms of Service" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="📬" label="Contact Support" onPress={() => {}} />
        </Card>

        {/* Danger zone */}
        <SectionHeader label="Danger Zone" />
        <Card style={styles.card}>
          <SettingRow icon="🚪" label="Sign Out" danger onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="⛔"
            label="Delete Account"
            subtitle="Permanently remove your account and data"
            danger
            onPress={() => {}}
          />
        </Card>

        <Text style={styles.versionFooter}>
          DPN Thermal · v1.0.0 · Build 100
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
  settingIconText: { fontSize: 18 },
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
