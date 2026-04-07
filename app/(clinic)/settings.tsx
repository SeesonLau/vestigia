// app/(clinic)/settings.tsx
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
import { useTheme } from "../../constants/ThemeContext";
import { Spacing, Typography } from "../../constants/theme";
import { S } from "../../constants/strings";
import { getUnsyncedCaptures } from "../../lib/db/offlineCaptures";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { useDeviceStore } from "../../store/sessionStore";

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

const soon = (feature: string) =>
  Alert.alert(S.settings.comingSoon, S.settings.comingSoonBody(feature));

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { logout, user } = useAuthStore();
  const pairedDevice = useDeviceStore((s) => s.pairedDevice);
  const [haptics, setHaptics] = useState(true);
  const [autoUpload, setAutoUpload] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [aiModel, setAiModel] = useState("dpn-v1.2.0");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    supabase
      .from("system_config")
      .select("key, value")
      .eq("key", "ai_model_version")
      .single()
      .then(({ data }) => { if (data?.value) setAiModel(String(data.value)); });
    getUnsyncedCaptures().then((captures) => setPendingCount(captures.length));
  }, []);

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

  const handleDeactivateAccount = () => {
    Alert.alert(S.settings.deactivateConfirmTitle, S.settings.deactivateConfirmBody, [
      { text: S.actions.cancel, style: "cancel" },
      {
        text: S.actions.deactivate,
        style: "destructive",
        onPress: async () => {
          if (user?.id) {
            await supabase.from("profiles").update({ is_active: false }).eq("id", user.id);
          }
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleClearCache = () => {
    Alert.alert(S.settings.clearCacheConfirmTitle, S.settings.clearCacheConfirmBody, [
      { text: S.actions.cancel, style: "cancel" },
      { text: S.actions.clear, style: "destructive", onPress: () => soon("Clear local cache") },
    ]);
  };

  return (
    <ScreenWrapper scrollable>
      <Header title={S.settings.title} />

      <View style={styles.container}>
        {/* Account */}
        <SectionHeader label={S.settings.sectionAccount} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="person-outline" label={S.settings.profile} subtitle={S.settings.profileSubtitle} onPress={() => soon("Profile management")} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="lock-closed-outline" label={S.auth.changePassword} onPress={() => router.push("/(auth)/update-password" as any)} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="notifications-outline" label={S.settings.notifications} onPress={() => soon("Notification settings")} />
        </View>

        {/* Device */}
        <SectionHeader label={S.settings.sectionDevice} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="hardware-chip-outline" label={S.settings.pairedDevice} subtitle={pairedDevice?.name ?? S.settings.noPairedDevice} value={S.settings.connected} onPress={() => router.push("/(clinic)/pairing")} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="laptop-outline" label={S.settings.registerUsbDevice} onPress={() => router.push("/(clinic)/pairing")} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="refresh-outline" label={S.settings.autoReconnect} toggle toggleValue={autoReconnect} onToggle={setAutoReconnect} />
        </View>

        {/* Data & Sync */}
        <SectionHeader label={S.settings.sectionDataSync} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="cloud-upload-outline" label={S.settings.autoUpload} subtitle={S.settings.autoUploadSubtitle} toggle toggleValue={autoUpload} onToggle={setAutoUpload} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="time-outline" label={S.settings.pendingUploads} value={String(pendingCount)} onPress={() => soon("Pending uploads view")} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="trash-outline" label={S.settings.clearCache} onPress={handleClearCache} />
        </View>

        {/* Application */}
        <SectionHeader label={S.settings.sectionApplication} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="phone-portrait-outline" label={S.settings.hapticFeedback} toggle toggleValue={haptics} onToggle={setHaptics} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="color-palette-outline" label="Dark Mode" toggle toggleValue={isDark} onToggle={() => toggleTheme()} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="language-outline" label={S.settings.language} value={S.settings.languageValue} onPress={() => soon("Language selection")} />
        </View>

        {/* About */}
        <SectionHeader label={S.settings.sectionAbout} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="information-circle-outline" label={S.settings.appVersion} value={S.app.version} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="hardware-chip-outline" label={S.settings.aiModel} value={aiModel} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="document-text-outline" label={S.settings.privacyPolicy} onPress={() => soon("Privacy Policy")} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="reader-outline" label={S.settings.termsOfService} onPress={() => soon("Terms of Service")} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="mail-outline" label={S.settings.contactSupport} onPress={() => soon("Contact Support")} />
        </View>

        {/* Danger zone */}
        <SectionHeader label={S.settings.sectionDanger} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="log-out-outline" label={S.settings.signOut} danger onPress={handleSignOut} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <SettingRow icon="close-circle-outline" label={S.settings.deactivateAccount} subtitle={S.settings.deactivateAccountSubtitle} danger onPress={handleDeactivateAccount} />
        </View>

        <Text style={[styles.versionFooter, { color: colors.textSec }]}>
          {S.app.versionFooter}
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
  versionFooter: {
    textAlign: "center",
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    marginTop: Spacing.xl,
    marginBottom: Spacing["2xl"],
    letterSpacing: 0.5,
  },
});
