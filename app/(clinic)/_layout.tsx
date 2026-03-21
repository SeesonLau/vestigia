// app/(clinic)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Colors, Spacing } from "../../constants/theme";

function TabIcon({
  icon,
  focused,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapFocused]}>
      <Ionicons name={icon} size={22} color={focused ? Colors.primary[300] : Colors.text.muted} />
    </View>
  );
}

export default function ClinicLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="home-outline" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pairing"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="bluetooth-outline" label="Device" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="live-feed"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="camera-outline" label="Scan" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="time-outline" label="History" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="settings-outline" label="Settings" focused={focused} />
          ),
        }}
      />
      {/* Hidden screens (navigated to programmatically) */}
      <Tabs.Screen name="patient-select" options={{ href: null as any }} />
      <Tabs.Screen name="clinical-data" options={{ href: null as any }} />
      <Tabs.Screen name="assessment" options={{ href: null as any }} />
      <Tabs.Screen name="session" options={{ href: null as any }} />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    height: 64,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  iconWrap: {
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: 10,
  },
  iconWrapFocused: {
    backgroundColor: "rgba(0, 128, 200, 0.12)",
  },
});
