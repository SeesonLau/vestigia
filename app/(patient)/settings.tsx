// app/(patient)/settings.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";

type SettingsItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

export default function PatientSettingsScreen() {
  const router = useRouter();
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
        <View style={styles.card}>
          {items.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.row, i < items.length - 1 && styles.rowBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.destructive ? "#ef4444" : Colors.primary[300]}
                style={styles.rowIcon}
              />
              <Text
                style={[styles.rowLabel, item.destructive && styles.destructiveLabel]}
              >
                {item.label}
              </Text>
              {!item.destructive && (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.text.muted}
                />
              )}
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
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.xl,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  rowIcon: {
    marginRight: Spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.primary,
  },
  destructiveLabel: {
    color: "#ef4444",
  },
});
