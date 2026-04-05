// constants/commonStyles.ts
// Shared StyleSheet fragments used across multiple screens.
// Import these and spread into local StyleSheet.create() calls, or use
// directly when the style is identical. Requires a ThemeColors object —
// call makeCommonStyles(colors) inside your component or at module level
// after resolving the theme.
//
// Usage:
//   const { colors } = useTheme();
//   const cs = makeCommonStyles(colors);
//   // then: style={cs.screenContainer}

import { StyleSheet } from "react-native";
import { Radius, Spacing, Typography } from "./theme";
import type { ThemeColors } from "./theme";

export function makeCommonStyles(c: ThemeColors) {
  return StyleSheet.create({
    // ── Screen / Layout ───────────────────────────────────────
    screenContainer: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
    },
    screenContainerFlex: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
    },
    scrollContent: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing["2xl"],
    },
    centeredContent: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },

    // ── Section Headers ───────────────────────────────────────
    sectionHeader: {
      fontSize: Typography.sizes.xs,
      fontFamily: Typography.fonts.heading,
      color: c.textSec,
      letterSpacing: 1.5,
      textTransform: "uppercase" as const,
      marginBottom: Spacing.sm,
      marginTop: Spacing.md,
      marginLeft: Spacing.xs,
    },
    sectionTitle: {
      fontSize: Typography.sizes.md,
      fontFamily: Typography.fonts.heading,
      color: c.text,
      marginBottom: Spacing.xs,
    },
    sectionSubtitle: {
      fontSize: Typography.sizes.sm,
      fontFamily: Typography.fonts.body,
      color: c.textSec,
      marginBottom: Spacing.md,
    },

    // ── Cards ─────────────────────────────────────────────────
    card: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      overflow: "hidden" as const,
    },
    cardNoPadding: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: Radius.lg,
      padding: 0,
      overflow: "hidden" as const,
      marginBottom: Spacing.sm,
    },

    // ── Row Divider (inside cards) ────────────────────────────
    rowDivider: {
      height: 1,
      backgroundColor: c.border,
    },
    rowDividerIndented: {
      height: 1,
      backgroundColor: c.border,
      marginLeft: Spacing.lg + 32 + Spacing.md,
    },

    // ── Empty States ──────────────────────────────────────────
    emptyState: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: Spacing["2xl"],
      paddingVertical: Spacing["3xl"],
    },
    emptyIcon: { marginBottom: Spacing.lg },
    emptyTitle: {
      fontSize: Typography.sizes.lg,
      fontFamily: Typography.fonts.heading,
      color: c.textSec,
      marginBottom: Spacing.sm,
      textAlign: "center" as const,
    },
    emptySubtitle: {
      fontSize: Typography.sizes.sm,
      fontFamily: Typography.fonts.body,
      color: c.textSec,
      textAlign: "center" as const,
      lineHeight: 22,
    },

    // ── Inputs ───────────────────────────────────────────────
    inputLabel: {
      fontSize: Typography.sizes.sm,
      fontFamily: Typography.fonts.label,
      color: c.textSec,
      marginBottom: Spacing.xs,
      letterSpacing: 0.3,
    },
    inputBase: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm + 2,
      fontSize: Typography.sizes.base,
      fontFamily: Typography.fonts.body,
      color: c.text,
      minHeight: 48,
    },

    // ── Metadata / Mono values ────────────────────────────────
    metaText: {
      fontSize: Typography.sizes.xs,
      fontFamily: Typography.fonts.mono,
      color: c.textSec,
    },
    metaRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },

    // ── Error / Success banners ───────────────────────────────
    errorText: {
      fontSize: Typography.sizes.sm,
      fontFamily: Typography.fonts.body,
      color: c.error,
      textAlign: "center" as const,
      marginBottom: Spacing.xs,
    },
    successBanner: {
      backgroundColor: `${c.accent}1A`, // 10% opacity tint
      borderWidth: 1,
      borderColor: `${c.accent}4D`, // 30% opacity
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      alignItems: "center" as const,
      gap: Spacing.md,
    },
    successText: {
      fontSize: Typography.sizes.base,
      fontFamily: Typography.fonts.subheading,
      color: c.accent,
    },

    // ── Version footer ────────────────────────────────────────
    versionFooter: {
      textAlign: "center" as const,
      fontSize: Typography.sizes.xs,
      fontFamily: Typography.fonts.mono,
      color: c.textSec,
      marginTop: Spacing.xl,
      marginBottom: Spacing["2xl"],
      letterSpacing: 0.5,
    },
  });
}
