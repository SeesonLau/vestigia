// components/ui/Input.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";

export type InputFormat = "date" | "phone";

interface InputProps {
  /** Floating label. Falls back to `placeholder` if omitted. */
  label?: string;
  /** Hint shown inside the input while focused (e.g. "YYYY-MM-DD"). Auto-set for `format`. */
  placeholder?: string;
  /** Append " (optional)" to the floating label in dimmed style. */
  optional?: boolean;

  /** For `format`, this holds digits-only; the input renders the formatted display. */
  value: string;
  onChangeText: (text: string) => void;

  /** Auto-format mask. `date` → YYYY-MM-DD (8 digits). `phone` → 0000 000 0000 (11 digits). */
  format?: InputFormat;

  secureTextEntry?: boolean;
  keyboardType?:
    | "default"
    | "email-address"
    | "numeric"
    | "decimal-pad"
    | "phone-pad";
  error?: string;
  hint?: string;

  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;

  /** Override the focused-state border + label color (for role-based theming). */
  accentColor?: string;
}

const formatDate = (digits: string) => {
  const d = digits.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return d.slice(0, 4) + "-" + d.slice(4);
  return d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6);
};

const formatPhone = (digits: string) => {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 4) return d;
  if (d.length <= 7) return d.slice(0, 4) + " " + d.slice(4);
  return d.slice(0, 4) + " " + d.slice(4, 7) + " " + d.slice(7);
};

export default function Input({
  label,
  placeholder,
  optional,
  value,
  onChangeText,
  format,
  secureTextEntry = false,
  keyboardType,
  error,
  hint,
  prefix,
  suffix,
  icon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  style,
  autoCapitalize = "none",
  editable = true,
  accentColor,
}: InputProps) {
  const { colors } = useTheme();
  const accent = accentColor ?? colors.accent;
  const [focused, setFocused] = useState(false);

  const floatingLabel = label ?? placeholder ?? "";
  const focusedPlaceholder =
    label && placeholder ? placeholder
      : format === "date" ? "YYYY-MM-DD"
        : format === "phone" ? "0000 000 0000"
          : undefined;

  const isUp = focused || value !== "";
  const anim = useRef(new Animated.Value(isUp ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: isUp ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isUp, anim]);

  //Format-aware change handler: formatted text → raw digits
  const handleChange = (text: string) => {
    if (format === "date") {
      onChangeText(text.replace(/\D/g, "").slice(0, 8));
      return;
    }
    if (format === "phone") {
      onChangeText(text.replace(/\D/g, "").slice(0, 11));
      return;
    }
    onChangeText(text);
  };

  const displayed =
    format === "date" ? formatDate(value)
      : format === "phone" ? formatPhone(value)
        : value;

  const effectiveKeyboardType =
    format === "date" ? "numeric"
      : format === "phone" ? "phone-pad"
        : keyboardType ?? "default";

  const borderColor = focused ? accent : error ? colors.error : colors.border;

  //Multiline falls back to label-above-the-box (floating label doesn't fit a 100px tall box)
  if (multiline) {
    return (
      <View style={[styles.wrapper, style]}>
        {floatingLabel ? (
          <Text style={[styles.legacyLabel, { color: colors.textSec }]}>
            {floatingLabel}
            {optional ? (
              <Text style={[styles.optionalHint, { color: colors.textSec }]}> (optional)</Text>
            ) : null}
          </Text>
        ) : null}
        <View
          style={[
            styles.multiContainer,
            { backgroundColor: colors.surface, borderColor },
            !editable && styles.disabled,
          ]}
        >
          <TextInput
            style={[styles.multiInput, { color: colors.text }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textSec + "80"}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType ?? "default"}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            multiline
            numberOfLines={numberOfLines}
            autoCapitalize={autoCapitalize}
            editable={editable}
            selectionColor={accent}
          />
        </View>
        {error ? (
          <Text style={[styles.helperText, { color: colors.error }]}>{error}</Text>
        ) : hint ? (
          <Text style={[styles.helperText, { color: colors.textSec }]}>{hint}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.floatContainer,
          { backgroundColor: colors.surface, borderColor },
          !editable && styles.disabled,
        ]}
      >
        {icon ? <View style={styles.iconLeft}>{icon}</View> : null}
        {prefix ? <Text style={[styles.affix, { color: colors.textSec }]}>{prefix}</Text> : null}

        <Animated.Text
          pointerEvents="none"
          numberOfLines={1}
          style={[
            styles.floatLabel,
            {
              left: icon ? Spacing.md + 28 : Spacing.md,
              top: anim.interpolate({ inputRange: [0, 1], outputRange: [19, 6] }),
              fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] }),
              color: focused ? accent : colors.textSec,
            },
          ]}
        >
          {floatingLabel}
          {optional ? (
            <Text style={[styles.optionalHint, { color: colors.textSec }]}> (optional)</Text>
          ) : null}
        </Animated.Text>

        <TextInput
          style={[
            styles.floatInput,
            { color: colors.text },
            icon || prefix ? styles.inputWithLeft : null,
            suffix || rightIcon ? styles.inputWithRight : null,
          ]}
          value={displayed}
          onChangeText={handleChange}
          placeholder={focused ? focusedPlaceholder : undefined}
          placeholderTextColor={colors.textSec + "80"}
          secureTextEntry={secureTextEntry}
          keyboardType={effectiveKeyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={autoCapitalize}
          editable={editable}
          selectionColor={accent}
        />

        {suffix ? <Text style={[styles.affix, { color: colors.textSec }]}>{suffix}</Text> : null}
        {rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} style={styles.iconRight}>
            {rightIcon}
          </TouchableOpacity>
        ) : null}
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
  floatContainer: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    position: "relative",
  },
  multiContainer: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  disabled: { opacity: 0.5 },
  floatLabel: {
    position: "absolute",
    fontFamily: Typography.fonts.body,
  },
  optionalHint: {
    fontSize: 11,
    opacity: 0.7,
    fontFamily: Typography.fonts.body,
  },
  floatInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    paddingTop: 22,
    paddingBottom: 8,
  },
  multiInput: {
    height: 100,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    textAlignVertical: "top",
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  inputWithLeft: { paddingLeft: Spacing.sm },
  inputWithRight: { paddingRight: Spacing.sm },
  iconLeft: { marginRight: Spacing.sm },
  iconRight: { marginLeft: Spacing.sm, padding: Spacing.xs },
  affix: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.mono,
    marginHorizontal: Spacing.xs,
  },
  legacyLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  helperText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: Spacing.xs,
  },
});
