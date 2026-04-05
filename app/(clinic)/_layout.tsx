// app/(clinic)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../constants/ThemeContext";
import { Spacing } from "../../constants/theme";

function TabIcon({
  icon,
  focused,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        tabStyles.iconWrap,
        focused && { backgroundColor: `${colors.accent}1F` },
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={focused ? colors.navActive : colors.navInactive}
      />
    </View>
  );
}

export default function ClinicLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.navBg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: Spacing.sm,
          paddingTop: Spacing.sm,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="home-outline" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="live-feed"
        options={{
          tabBarAccessibilityLabel: "Thermal Scan",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="camera-outline" label="Scan" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarAccessibilityLabel: "Session History",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="time-outline" label="History" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarAccessibilityLabel: "Settings",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="settings-outline" label="Settings" focused={focused} />
          ),
        }}
      />
      {/* Hidden screens (navigated to programmatically) */}
      <Tabs.Screen name="pairing"        options={{ href: null as any }} />
      <Tabs.Screen name="patient-select" options={{ href: null as any }} />
      <Tabs.Screen name="clinical-data"  options={{ href: null as any }} />
      <Tabs.Screen name="assessment"     options={{ href: null as any }} />
      <Tabs.Screen name="session"        options={{ href: null as any }} />
      <Tabs.Screen name="sync"           options={{ href: null as any }} />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: 10,
  },
});
