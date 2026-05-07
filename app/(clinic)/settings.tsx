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
import { useTheme } from "../../constants/ThemeContext";
import { Spacing, Typography } from "../../constants/theme";
import { S } from "../../constants/strings";
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
      style={styles.settingRow}
      activeOpacity={0.7}
    >
      <View style={styles.settingIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? colors.error : colors.textSec}
        />
      </View>
      <View style={styles.settingTextGroup}>
        <Text style={[styles.settingLabel, { color: danger ? colors.error : colors.text }]}>
          {label}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textSec }]}>{subtitle}</Text>
        )}
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={toggleValue ? colors.textInverse : colors.textSec}
        />
      ) : value ? (
        <Text style={[styles.settingValue, { color: colors.textSec }]}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textSec} />
      ) : null}
    </TouchableOpacity>
  );
}

function SectionHeader({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionHeader, { color: colors.textSec }]}>{label}</Text>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { logout } = useAuthStore();
  const [autoUpload, setAutoUpload] = useState(true);

  const handleSignOut = () => {
    Alert.alert(S.settings.signOutConfirmTitle, S.auth.signOutConfirm, [
      { text: S.actions.cancel, style: "cancel" },
      {
        text: S.auth.signOut,
        style: "destructive",
        onPress: async () => { await logout(); router.replace("/(auth)/login"); },
      },
    ]);
  };

  return (
    <ScreenWrapper scrollable>
      <Header title={S.settings.title} />

      <View style={styles.container}>
        {/* Account */}
        <SectionHeader label={S.settings.sectionAccount} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="person-outline"
            label={S.settings.profile}
            subtitle={S.settings.profileSubtitle}
            onPress={() => router.push("/(clinic)/profile" as any)}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="lock-closed-outline"
            label={S.auth.changePassword}
            onPress={() => router.push("/(auth)/update-password" as any)}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="color-palette-outline"
            label="Dark Mode"
            toggle
            toggleValue={isDark}
            onToggle={() => toggleTheme()}
          />
        </View>

        {/* Device */}
        <SectionHeader label={S.settings.sectionDevice} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="hardware-chip-outline"
            label="Camera"
            subtitle="FLIR Lepton 3.5 via USB-C"
            onPress={() => router.push("/(clinic)/pairing")}
          />
        </View>

        {/* Data & Sync */}
        <SectionHeader label={S.settings.sectionDataSync} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="folder-open-outline"
            label="Import Capture"
            subtitle="Analyze a thermal capture from PNG + CSV files"
            onPress={() => router.push("/(clinic)/import" as any)}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="cloud-upload-outline"
            label={S.settings.autoUpload}
            subtitle={S.settings.autoUploadSubtitle}
            toggle
            toggleValue={autoUpload}
            onToggle={setAutoUpload}
          />
        </View>

        {/* About */}
        <SectionHeader label={S.settings.sectionAbout} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="information-circle-outline"
            label={S.settings.appVersion}
            value={S.app.version}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="document-text-outline"
            label={S.settings.privacyPolicy}
            onPress={() => router.push("/(clinic)/privacy-policy" as any)}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="reader-outline"
            label={S.settings.termsOfService}
            onPress={() => router.push("/(clinic)/terms-of-service" as any)}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="mail-outline"
            label={S.settings.contactSupport}
            onPress={() => router.push("/(clinic)/contact-support" as any)}
          />
        </View>

        {/* Danger Zone */}
        <SectionHeader label={S.settings.sectionDanger} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="log-out-outline"
            label={S.settings.signOut}
            danger
            onPress={handleSignOut}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
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
  card: {
    borderWidth: 1,
    borderRadius: 16,
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
  },
  settingSubtitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: 2,
  },
  settingValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    marginLeft: Spacing.sm,
  },
  rowDivider: {
    height: 1,
    marginLeft: Spacing.lg + 32 + Spacing.md,
  },
});
