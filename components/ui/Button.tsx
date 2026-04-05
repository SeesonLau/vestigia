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
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";

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
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyle = (): ViewStyle => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: colors.accent,
          borderColor: colors.accent,
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 12,
          elevation: 6,
        };
      case "teal":
        return {
          backgroundColor: colors.success,
          borderColor: colors.success,
          shadowColor: colors.success,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 12,
          elevation: 6,
        };
      case "secondary":
        return {
          backgroundColor: colors.accentSoft,
          borderColor: colors.border,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderColor: colors.border,
        };
      case "danger":
        return {
          backgroundColor: `${colors.error}26`, // 15% opacity
          borderColor: `${colors.error}80`,      // 50% opacity
        };
    }
  };

  const textColor = (): string => {
    switch (variant) {
      case "primary":
      case "teal":
        return colors.textInverse;
      case "secondary":
        return colors.text;
      case "ghost":
        return colors.accent;
      case "danger":
        return colors.error;
    }
  };

  const sizeStyle = (): ViewStyle => {
    switch (size) {
      case "sm": return { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, minHeight: 36 };
      case "md": return { paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg, minHeight: 48 };
      case "lg": return { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, minHeight: 56 };
    }
  };

  const textSize = (): number => {
    switch (size) {
      case "sm": return Typography.sizes.sm;
      case "md": return Typography.sizes.base;
      case "lg": return Typography.sizes.md;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        variantStyle(),
        sizeStyle(),
        fullWidth ? styles.fullWidth : undefined,
        isDisabled ? styles.disabled : undefined,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "ghost" ? colors.accent : colors.textInverse}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === "left" && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text
            style={[
              styles.text,
              { color: textColor(), fontSize: textSize() },
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
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.4 },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconLeft: { marginRight: Spacing.sm },
  iconRight: { marginLeft: Spacing.sm },
  text: {
    fontFamily: Typography.fonts.subheading,
    letterSpacing: 0.5,
  },
});
