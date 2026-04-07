// app/(patient)/settings.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
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
      style={styles.row}
      activeOpacity={0.7}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={danger ? colors.error : colors.textSec} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: danger ? colors.error : colors.text }]}>{label}</Text>
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
        <Ionicons name="chevron-forward" size={18} color={danger ? colors.error : colors.textSec} />
      ) : null}
    </TouchableOpacity>
  );
}

function SectionHeader({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionHeader, { color: colors.textSec }]}>{label}</Text>;
}

export default function PatientSettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { logout } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert("Sign Out", S.auth.signOutConfirm, [
      { text: S.actions.cancel, style: "cancel" },
      {
        text: S.auth.signOut,
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
      <Header title={S.settings.title} />

      <View style={styles.container}>
        {/* Account */}
        <SectionHeader label={S.settings.sectionAccount} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="person-outline"
            label={S.settings.profile}
            subtitle="Manage your account info"
            onPress={() => router.push("/(patient)/profile" as any)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="lock-closed-outline"
            label={S.auth.changePassword}
            onPress={() => router.push("/(auth)/update-password" as any)}
          />
        </View>

        {/* Application */}
        <SectionHeader label={S.settings.sectionApplication} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="color-palette-outline"
            label="Dark Mode"
            toggle
            toggleValue={isDark}
            onToggle={() => toggleTheme()}
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
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="document-text-outline"
            label={S.settings.privacyPolicy}
            onPress={() => router.push("/(patient)/privacy-policy" as any)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="reader-outline"
            label={S.settings.termsOfService}
            onPress={() => router.push("/(patient)/terms-of-service" as any)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="mail-outline"
            label={S.settings.contactSupport}
            onPress={() => router.push("/(patient)/contact-support" as any)}
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
    borderRadius: Radius.xl,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
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
});
