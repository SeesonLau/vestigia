// components/ui/Picker.tsx
//Floating-label-style dropdown with a search modal. Backed by a
//FlatList so it stays smooth at 1k+ items (PSGC barangays etc.).

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";

export interface PickerOption {
  value: string;
  label: string;
}

interface PickerProps {
  label: string;
  value: string | null;
  options: PickerOption[];
  onChange: (value: string) => void;
  /** Title shown in the modal header. Defaults to `label`. */
  title?: string;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  optional?: boolean;
  /** Override focus / selected color (role-based theming). */
  accentColor?: string;
  style?: ViewStyle;
}

export default function Picker({
  label,
  value,
  options,
  onChange,
  title,
  loading = false,
  disabled = false,
  error,
  hint,
  optional,
  accentColor,
  style,
}: PickerProps) {
  const { colors } = useTheme();
  const accent = accentColor ?? colors.accent;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  //Floating label animation
  const isUp = !!value;
  const anim = useRef(new Animated.Value(isUp ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: isUp ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isUp, anim]);

  const borderColor = open ? accent : error ? colors.error : colors.border;

  return (
    <View style={[styles.wrapper, style]}>
      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.75}
        onPress={() => !disabled && !loading && setOpen(true)}
        style={[
          styles.fieldContainer,
          { backgroundColor: colors.surface, borderColor },
          (disabled || loading) && styles.disabled,
        ]}
      >
        <Animated.Text
          pointerEvents="none"
          numberOfLines={1}
          style={[
            styles.floatLabel,
            {
              top: anim.interpolate({ inputRange: [0, 1], outputRange: [19, 6] }),
              fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] }),
              color: open ? accent : colors.textSec,
            },
          ]}
        >
          {label}
          {optional ? (
            <Text style={[styles.optionalHint, { color: colors.textSec }]}> (optional)</Text>
          ) : null}
        </Animated.Text>

        <Text
          style={[styles.value, { color: colors.text }]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={colors.textSec} style={styles.iconRight} />
        ) : (
          <Ionicons
            name="chevron-down"
            size={18}
            color={colors.textSec}
            style={styles.iconRight}
          />
        )}
      </TouchableOpacity>

      {error ? (
        <Text style={[styles.helperText, { color: colors.error }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.helperText, { color: colors.textSec }]}>{hint}</Text>
      ) : null}

      {/* Modal */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {title ?? label}
              </Text>
              <TouchableOpacity
                onPress={() => { setOpen(false); setQuery(""); }}
                hitSlop={8}
              >
                <Ionicons name="close" size={24} color={colors.textSec} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textSec} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={`Search ${label.toLowerCase()}...`}
                placeholderTextColor={colors.textSec + "80"}
                style={[styles.searchInput, { color: colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textSec} />
                </TouchableOpacity>
              ) : null}
            </View>

            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSec }]}>
                  No matches
                </Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.value}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                renderItem={({ item }) => {
                  const selected = item.value === value;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={() => {
                        onChange(item.value);
                        setOpen(false);
                        setQuery("");
                      }}
                      style={[
                        styles.row,
                        { borderBottomColor: colors.border },
                        selected && { backgroundColor: `${accent}1A` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rowLabel,
                          { color: selected ? accent : colors.text },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={18} color={accent} />
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  fieldContainer: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    position: "relative",
  },
  disabled: { opacity: 0.5 },
  floatLabel: {
    position: "absolute",
    left: Spacing.md,
    fontFamily: Typography.fonts.body,
  },
  optionalHint: {
    fontSize: 11,
    opacity: 0.7,
    fontFamily: Typography.fonts.body,
  },
  value: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    paddingTop: 22,
    paddingBottom: 8,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  helperText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: Spacing.xs,
  },

  //Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    height: "75%",
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  emptyText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
  },
});
