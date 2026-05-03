// components/session/index.tsx
import React from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { ScreeningSession, SessionStatus } from "../../types";

// ── SessionCard ────────────────────────────────────────────────
interface SessionCardProps {
  session: ScreeningSession;
  onPress?: () => void;
  style?: ViewStyle;
}

type ThemedColors = {
  text: string; textSec: string; accent: string;
  info: string; warning: string; success: string; error: string;
};
type StatusConfig = {
  label: string;
  color: (c: ThemedColors) => string;
  bg: (c: ThemedColors) => string;
};

const statusConfig: Record<SessionStatus, StatusConfig> = {
  draft:      { label: "Draft",      color: (c) => c.textSec, bg: (c) => `${c.textSec}26` },
  uploading:  { label: "Uploading",  color: (c) => c.warning, bg: (c) => `${c.warning}26` },
  completed:  { label: "Completed",  color: (c) => c.success, bg: (c) => `${c.success}26` },
  failed:     { label: "Failed",     color: (c) => c.error,   bg: (c) => `${c.error}26` },
  discarded:  { label: "Discarded",  color: (c) => c.textSec, bg: (c) => `${c.textSec}1A` },
};

export function SessionCard({ session, onPress, style }: SessionCardProps) {
  const { colors } = useTheme();
  const cfg = statusConfig[session.status];
  const date = new Date(session.started_at);
  const classification = session.classification?.classification;
  const analyzed = !!classification;

  //Border + accent bar reflect analysis state.
  // Analyzed → green; not analyzed → amber.
  // POSITIVE result overrides the accent bar to red so it pops in the list.
  const borderColor = analyzed ? colors.success : colors.warning;
  const accentBarColor =
    classification === "POSITIVE" ? colors.error
    : classification === "NEGATIVE" ? colors.success
    : colors.warning;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[cardStyles.container, { backgroundColor: colors.card, borderColor }, style]}
    >
      <View style={[cardStyles.accentBar, { backgroundColor: accentBarColor }]} />

      <View style={cardStyles.content}>
        <View style={cardStyles.topRow}>
          <Text style={[cardStyles.sessionId, { color: colors.textSec }]}>Session</Text>
          <View style={cardStyles.pillGroup}>
            <View style={[
              cardStyles.statusPill,
              {
                backgroundColor: analyzed ? `${colors.success}26` : `${colors.warning}26`,
              },
            ]}>
              <Text style={[
                cardStyles.statusText,
                { color: analyzed ? colors.success : colors.warning },
              ]}>
                {analyzed ? "Analyzed" : "Not Analyzed"}
              </Text>
            </View>
            <View style={[cardStyles.statusPill, { backgroundColor: cfg.bg(colors) }]}>
              <Text style={[cardStyles.statusText, { color: cfg.color(colors) }]}>
                {cfg.label}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[cardStyles.date, { color: colors.text }]}>
          {date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          {"  "}
          <Text style={[cardStyles.time, { color: colors.textSec }]}>
            {date.toLocaleTimeString("en-PH", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </Text>

        {classification && (
          <View style={cardStyles.resultRow}>
            <Text style={[cardStyles.resultText, { color: classification === "POSITIVE" ? colors.error : colors.success }]}>
              DPN {classification}
            </Text>
            {session.classification?.confidence_score != null && (
              <Text style={[cardStyles.confidence, { color: colors.textSec }]}>
                {Number(session.classification.confidence_score).toFixed(1)}%
              </Text>
            )}
          </View>
        )}
      </View>

      <Text style={[cardStyles.chevron, { color: colors.textSec }]}>›</Text>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const cardStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  accentBar: { width: 4, alignSelf: "stretch" },
  content: { flex: 1, padding: Spacing.md },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  pillGroup: {
    flexDirection: "row",
    gap: 4,
  },
  sessionId: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
  date: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
  time: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: Spacing.sm,
  },
  resultText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
    letterSpacing: 0.5,
  },
  confidence: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
  },
  chevron: {
    fontSize: 22,
    paddingRight: Spacing.md,
  },
});

