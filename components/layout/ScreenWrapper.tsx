// components/layout/ScreenWrapper.tsx
import React from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  edges?: ("top" | "bottom" | "left" | "right")[];
}

export default function ScreenWrapper({
  children,
  scrollable = false,
  style,
  contentStyle,
}: ScreenWrapperProps) {
  const content = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, style]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />
      <View style={styles.background}>
        {/* Subtle radial glow top-left */}
        <View style={styles.glowTL} />
        {/* Subtle radial glow bottom-right */}
        <View style={styles.glowBR} />
      </View>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  glowTL: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: "rgba(0, 128, 200, 0.07)",
  },
  glowBR: {
    position: "absolute",
    bottom: -120,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(20, 176, 142, 0.06)",
  },
  content: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
});
