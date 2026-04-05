// components/ui/index.tsx
import React from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";

// ── Card ──────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glow?: boolean;
  glowColor?: string;
}

export function Card({ children, style, glow, glowColor }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: Radius.lg,
          padding: Spacing.lg,
          overflow: "hidden",
        },
        glow && {
          shadowColor: glowColor ?? colors.accent,
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
  const { colors } = useTheme();

  const variantColors: Record<
    BadgeVariant,
    { bg: string; dot: string; text: string }
  > = {
    positive: {
      bg:   `${colors.error}26`,
      dot:  colors.error,
      text: colors.error,
    },
    negative: {
      bg:   `${colors.success}26`,
      dot:  colors.success,
      text: colors.success,
    },
    warning: {
      bg:   `${colors.warning}26`,
      dot:  colors.warning,
      text: colors.warning,
    },
    info: {
      bg:   `${colors.info}26`,
      dot:  colors.info,
      text: colors.info,
    },
    muted: {
      bg:   `${colors.textSec}26`,
      dot:  colors.textSec,
      text: colors.textSec,
    },
  };

  const v = variantColors[variant];

  return (
    <View
      style={[
        badgeStyles.base,
        badgeStyles[`size_${size}`],
        {
          backgroundColor: v.bg,
          borderColor: `${v.dot}66`,
        },
        style,
      ]}
    >
      <View style={[badgeStyles.dot, { backgroundColor: v.dot }]} />
      <Text
        style={[
          badgeStyles.text,
          badgeStyles[`textSize_${size}`],
          { color: v.text },
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

export function StatusIndicator({
  status,
  label,
  style,
}: StatusIndicatorProps) {
  const { colors } = useTheme();

  const statusConfig: Record<StatusType, { color: string; label: string }> = {
    connected:    { color: colors.success,  label: "Connected" },
    disconnected: { color: colors.textSec,  label: "Disconnected" },
    connecting:   { color: colors.warning,  label: "Connecting..." },
    scanning:     { color: colors.info,     label: "Scanning..." },
    error:        { color: colors.error,    label: "Error" },
  };

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
  const { colors } = useTheme();
  return (
    <View
      style={[
        disclaimerStyles.container,
        { backgroundColor: `${colors.accent}14`, borderColor: colors.border },
        style,
      ]}
    >
      <Text style={[disclaimerStyles.icon, { color: colors.textSec }]}>⚕</Text>
      <Text style={[disclaimerStyles.text, { color: colors.textSec }]}>
        {text}
      </Text>
    </View>
  );
}

// ── Divider ────────────────────────────────────────────────────
interface DividerProps {
  label?: string;
  style?: ViewStyle;
}

export function Divider({ label, style }: DividerProps) {
  const { colors } = useTheme();
  return (
    <View style={[dividerStyles.container, style]}>
      <View style={[dividerStyles.line, { backgroundColor: colors.border }]} />
      {label && (
        <Text style={[dividerStyles.label, { color: colors.textSec }]}>
          {label}
        </Text>
      )}
      {label && (
        <View style={[dividerStyles.line, { backgroundColor: colors.border }]} />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const badgeStyles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.full,
    alignSelf: "flex-start",
  },
  size_sm: { paddingHorizontal: 8,  paddingVertical: 3 },
  size_md: { paddingHorizontal: 12, paddingVertical: 5 },
  size_lg: { paddingHorizontal: 16, paddingVertical: 7 },
  dot:  { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
  textSize_sm: { fontSize: Typography.sizes.xs },
  textSize_md: { fontSize: Typography.sizes.sm },
  textSize_lg: { fontSize: Typography.sizes.base },
});

const statusStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.3,
  },
});

const disclaimerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: "flex-start",
  },
  icon: { fontSize: 16, marginRight: Spacing.sm, lineHeight: 20 },
  text: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    lineHeight: 18,
  },
});

const dividerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  line: { flex: 1, height: 1 },
  label: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    marginHorizontal: Spacing.md,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
