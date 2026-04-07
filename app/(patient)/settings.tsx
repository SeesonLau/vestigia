// app/(patient)/settings.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";

type SettingsItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: () => void;
  destructive?: boolean;
};

export default function PatientSettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const items: SettingsItem[] = [
    {
      icon: "person-outline",
      label: "Edit Profile",
      onPress: () => Alert.alert("Coming Soon", "Profile editing is not yet available."),
    },
    {
      icon: "lock-closed-outline",
      label: "Change Password",
      onPress: () => router.push("/(auth)/update-password"),
    },
    {
      icon: "notifications-outline",
      label: "Notifications",
      onPress: () => Alert.alert("Coming Soon", "Notification settings are not yet available."),
    },
    {
      icon: "color-palette-outline",
      label: "Dark Mode",
      toggle: true,
      toggleValue: isDark,
      onToggle: toggleTheme,
    },
    {
      icon: "log-out-outline",
      label: "Sign Out",
      onPress: handleLogout,
      destructive: true,
    },
  ];

  return (
    <ScreenWrapper>
      <Header title="Settings" />
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {items.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.row, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={item.toggle ? item.onToggle : item.onPress}
              activeOpacity={item.toggle ? 1 : 0.7}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.destructive ? colors.error : colors.accent}
                style={styles.rowIcon}
              />
              <Text style={[styles.rowLabel, { color: item.destructive ? colors.error : colors.text }]}>
                {item.label}
              </Text>
              {item.toggle ? (
                <Switch
                  value={item.toggleValue}
                  onValueChange={item.onToggle}
                  trackColor={{ false: colors.border, true: `${colors.accent}80` }}
                  thumbColor={item.toggleValue ? colors.accent : colors.textSec}
                />
              ) : !item.destructive ? (
                <Ionicons name="chevron-forward" size={16} color={colors.textSec} />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowIcon: {
    marginRight: Spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
  },
});
