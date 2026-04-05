// components/layout/Header.tsx
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../constants/ThemeContext";
import { Spacing, Typography } from "../../constants/theme";

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  style?: ViewStyle;
}

export default function Header({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  style,
}: HeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {leftIcon && (
          <TouchableOpacity
            onPress={onLeftPress}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            {leftIcon}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSec }]}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightPress}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    position: "relative",
  },
  left: {
    width: 40,
    alignItems: "flex-start",
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  right: {
    width: 40,
    alignItems: "flex-end",
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  iconBtn: {
    padding: Spacing.xs,
  },
  divider: {
    position: "absolute",
    bottom: 0,
    left: Spacing.lg,
    right: Spacing.lg,
    height: 1,
  },
});
