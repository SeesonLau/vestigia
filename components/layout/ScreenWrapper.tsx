// components/layout/ScreenWrapper.tsx
import React from "react";
import {
  ScrollView,
  StatusBar,
  View,
  ViewStyle,
} from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../constants/ThemeContext";

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Edges to apply safe area insets. Defaults to top/left/right only —
   *  the tab bar handles the bottom inset so screens inside tabs don't need it. */
  edges?: Edge[];
}

export default function ScreenWrapper({
  children,
  scrollable = false,
  style,
  contentStyle,
  edges = ["top", "left", "right"],
}: ScreenWrapperProps) {
  const { colors, isDark } = useTheme();

  const content = scrollable ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ flexGrow: 1, paddingBottom: 32 }, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />
      {/* Subtle ambient glows — tinted to accent */}
      <View style={{ ...glowBase, top: -100, left: -100, backgroundColor: `${colors.accent}12` }} />
      <View style={{ ...glowBase, bottom: -120, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: `${colors.accent}0F` }} />
      {content}
    </SafeAreaView>
  );
}

const glowBase = {
  position: "absolute" as const,
  width: 350,
  height: 350,
  borderRadius: 175,
};
