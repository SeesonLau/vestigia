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
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";

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
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          focused ? styles.focused : undefined,
          !!error ? styles.errorBorder : undefined,
          !editable ? styles.disabled : undefined,
        ]}
      >
        {icon && <View style={styles.iconLeft}>{icon}</View>}
        {prefix && <Text style={styles.affix}>{prefix}</Text>}

        <TextInput
          style={[
            styles.input,
            icon ? styles.inputWithIcon : undefined,
            suffix || rightIcon ? styles.inputWithSuffix : undefined,
            multiline ? styles.multiline : undefined,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          editable={editable}
          selectionColor={Colors.primary[400]}
        />

        {suffix && <Text style={styles.affix}>{suffix}</Text>}
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.iconRight}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
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
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg.input,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.md,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  focused: {
    borderColor: Colors.border.focus,
    backgroundColor: "rgba(10, 30, 60, 0.9)",
  },
  errorBorder: {
    borderColor: "rgba(239, 68, 68, 0.6)",
  },
  disabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.primary,
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
    color: Colors.text.muted,
    marginHorizontal: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: "#ef4444",
    marginTop: Spacing.xs,
  },
  hintText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: Spacing.xs,
  },
});
