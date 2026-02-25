// components/ui/index.tsx
import React from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";

// ── Card ──────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glow?: boolean;
  glowColor?: string;
}

export function Card({ children, style, glow, glowColor }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        glow && {
          shadowColor: glowColor ?? Colors.primary[400],
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── Badge ──────────────────────────────────────────────────────
type BadgeVariant = "positive" | "negative" | "warning" | "info" | "muted";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  label,
  variant = "info",
  size = "md",
  style,
  textStyle,
}: BadgeProps) {
  const variantStyle = badgeVariants[variant];
  return (
    <View
      style={[
        badgeStyles.base,
        badgeStyles[`size_${size}`],
        variantStyle.container,
        style,
      ]}
    >
      <View style={[badgeStyles.dot, variantStyle.dot]} />
      <Text
        style={[
          badgeStyles.text,
          badgeStyles[`textSize_${size}`],
          variantStyle.text,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ── StatusIndicator ────────────────────────────────────────────
type StatusType =
  | "connected"
  | "disconnected"
  | "connecting"
  | "scanning"
  | "error";

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  style?: ViewStyle;
}

const statusConfig: Record<StatusType, { color: string; label: string }> = {
  connected: { color: Colors.teal[400], label: "Connected" },
  disconnected: { color: Colors.text.muted, label: "Disconnected" },
  connecting: { color: Colors.warning, label: "Connecting..." },
  scanning: { color: Colors.info, label: "Scanning..." },
  error: { color: Colors.positive, label: "Error" },
};

export function StatusIndicator({
  status,
  label,
  style,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  return (
    <View style={[statusStyles.container, style]}>
      <View style={[statusStyles.dot, { backgroundColor: config.color }]} />
      <Text style={[statusStyles.label, { color: config.color }]}>
        {label ?? config.label}
      </Text>
    </View>
  );
}

// ── Disclaimer ─────────────────────────────────────────────────
interface DisclaimerProps {
  text: string;
  style?: ViewStyle;
}

export function Disclaimer({ text, style }: DisclaimerProps) {
  return (
    <View style={[disclaimerStyles.container, style]}>
      <Text style={disclaimerStyles.icon}>⚕</Text>
      <Text style={disclaimerStyles.text}>{text}</Text>
    </View>
  );
}

// ── Divider ────────────────────────────────────────────────────
interface DividerProps {
  label?: string;
  style?: ViewStyle;
}

export function Divider({ label, style }: DividerProps) {
  return (
    <View style={[dividerStyles.container, style]}>
      <View style={dividerStyles.line} />
      {label && <Text style={dividerStyles.label}>{label}</Text>}
      {label && <View style={dividerStyles.line} />}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    overflow: "hidden",
  },
});

const badgeVariants: Record<
  BadgeVariant,
  { container: ViewStyle; dot: ViewStyle; text: TextStyle }
> = {
  positive: {
    container: {
      backgroundColor: "rgba(239,68,68,0.15)",
      borderColor: "rgba(239,68,68,0.4)",
    },
    dot: { backgroundColor: "#ef4444" },
    text: { color: "#fca5a5" },
  },
  negative: {
    container: {
      backgroundColor: "rgba(20,176,142,0.15)",
      borderColor: "rgba(20,176,142,0.4)",
    },
    dot: { backgroundColor: Colors.teal[400] },
    text: { color: Colors.teal[300] },
  },
  warning: {
    container: {
      backgroundColor: "rgba(245,158,11,0.15)",
      borderColor: "rgba(245,158,11,0.4)",
    },
    dot: { backgroundColor: Colors.warning },
    text: { color: "#fcd34d" },
  },
  info: {
    container: {
      backgroundColor: "rgba(59,130,246,0.15)",
      borderColor: "rgba(59,130,246,0.4)",
    },
    dot: { backgroundColor: Colors.info },
    text: { color: "#93c5fd" },
  },
  muted: {
    container: {
      backgroundColor: "rgba(77,106,150,0.15)",
      borderColor: "rgba(77,106,150,0.3)",
    },
    dot: { backgroundColor: Colors.text.muted },
    text: { color: Colors.text.muted },
  },
};

const badgeStyles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.full,
    alignSelf: "flex-start",
  },
  size_sm: { paddingHorizontal: 8, paddingVertical: 3 },
  size_md: { paddingHorizontal: 12, paddingVertical: 5 },
  size_lg: { paddingHorizontal: 16, paddingVertical: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
  textSize_sm: { fontSize: Typography.sizes.xs },
  textSize_md: { fontSize: Typography.sizes.sm },
  textSize_lg: { fontSize: Typography.sizes.base },
});

const statusStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.3,
  },
});

const disclaimerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 60, 100, 0.2)",
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: "flex-start",
  },
  icon: {
    fontSize: 16,
    marginRight: Spacing.sm,
    color: Colors.text.muted,
    lineHeight: 20,
  },
  text: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    lineHeight: 18,
  },
});

const dividerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.subtle,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    marginHorizontal: Spacing.md,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
