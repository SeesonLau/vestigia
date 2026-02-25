// components/ui/Button.tsx
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "teal";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export default function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth ? styles.fullWidth : undefined,
        isDisabled ? styles.disabled : undefined,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "ghost" ? Colors.primary[300] : Colors.text.primary
          }
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === "left" && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              textStyle,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === "right" && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  fullWidth: {
    width: "100%",
  },

  // Variants
  primary: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[400],
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  secondary: {
    backgroundColor: Colors.bg.glassLight,
    borderColor: Colors.border.strong,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: Colors.border.default,
  },
  danger: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  teal: {
    backgroundColor: Colors.teal[500],
    borderColor: Colors.teal[400],
    shadowColor: Colors.teal[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },

  // Sizes
  size_sm: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minHeight: 56,
  },

  disabled: { opacity: 0.4 },

  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconLeft: { marginRight: Spacing.sm },
  iconRight: { marginLeft: Spacing.sm },

  // Text
  text: {
    fontFamily: Typography.fonts.subheading,
    letterSpacing: 0.5,
  },
  text_primary: { color: Colors.text.primary },
  text_secondary: { color: Colors.text.primary },
  text_ghost: { color: Colors.primary[300] },
  text_danger: { color: "#ef4444" },
  text_teal: { color: Colors.text.primary },

  textSize_sm: { fontSize: Typography.sizes.sm },
  textSize_md: { fontSize: Typography.sizes.base },
  textSize_lg: { fontSize: Typography.sizes.md },
});
