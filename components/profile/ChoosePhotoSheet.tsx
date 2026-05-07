// components/profile/ChoosePhotoSheet.tsx
// Themed bottom-sheet replacement for the native Alert.alert "Choose a
// source" dialog. Two large primary buttons (Camera / Library) plus a
// Cancel row, properly proportioned and matching the rest of the app.

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";

export type PhotoSource = "camera" | "library";

interface Props {
  visible: boolean;
  onPick: (source: PhotoSource) => void;
  onCancel: () => void;
}

export default function ChoosePhotoSheet({ visible, onPick, onCancel }: Props) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onCancel}
      />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.handle} />
        <Text style={[styles.title, { color: colors.text }]}>Update Profile Photo</Text>
        <Text style={[styles.subtitle, { color: colors.textSec }]}>
          Choose where the photo comes from. You'll get a chance to crop after.
        </Text>

        <View style={styles.optionRow}>
          <Option
            icon="camera"
            label="Camera"
            description="Take a new photo"
            onPress={() => onPick("camera")}
            colors={colors}
          />
          <Option
            icon="images"
            label="Library"
            description="Pick from gallery"
            onPress={() => onPick("library")}
            colors={colors}
          />
        </View>

        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.8}
          style={[styles.cancelBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelText, { color: colors.textSec }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function Option({
  icon, label, description, onPress, colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  colors: import("../../constants/theme").ThemeColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.option, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.optionIcon, { backgroundColor: `${colors.accent}1A` }]}>
        <Ionicons name={icon} size={26} color={colors.accent} />
      </View>
      <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.optionDesc, { color: colors.textSec }]}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl + Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(120,120,120,0.45)",
    alignSelf: "center", marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    lineHeight: 16,
  },
  optionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  option: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  optionIcon: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  optionLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.heading,
  },
  optionDesc: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
  },
  cancelBtn: {
    borderWidth: 1, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, alignItems: "center",
  },
  cancelText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
});
