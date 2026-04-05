// components/ui/Input.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?:
    | "default"
    | "email-address"
    | "numeric"
    | "decimal-pad"
    | "phone-pad";
  error?: string;
  hint?: string;
  suffix?: string;
  prefix?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
}

export default function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  error,
  hint,
  suffix,
  prefix,
  icon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  style,
  autoCapitalize = "none",
  editable = true,
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, { color: colors.textSec }]}>{label}</Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: focused
              ? colors.borderFocus
              : error
              ? colors.error
              : colors.border,
          },
          !editable ? styles.disabled : undefined,
        ]}
      >
        {icon && <View style={styles.iconLeft}>{icon}</View>}
        {prefix && (
          <Text style={[styles.affix, { color: colors.textSec }]}>{prefix}</Text>
        )}

        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            icon ? styles.inputWithIcon : undefined,
            suffix || rightIcon ? styles.inputWithSuffix : undefined,
            multiline ? styles.multiline : undefined,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSec}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          editable={editable}
          selectionColor={colors.accent}
        />

        {suffix && (
          <Text style={[styles.affix, { color: colors.textSec }]}>{suffix}</Text>
        )}
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.iconRight}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={[styles.helperText, { color: colors.error }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.helperText, { color: colors.textSec }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    paddingVertical: Spacing.sm,
  },
  inputWithIcon: {
    paddingLeft: Spacing.sm,
  },
  inputWithSuffix: {
    paddingRight: Spacing.sm,
  },
  multiline: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: Spacing.sm,
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  affix: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.mono,
    marginHorizontal: Spacing.xs,
  },
  helperText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: Spacing.xs,
  },
});
