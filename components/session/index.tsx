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

type StatusConfig = { label: string; color: (colors: any) => string; bg: (colors: any) => string };

const statusConfig: Record<SessionStatus, StatusConfig> = {
  pending:    { label: "Pending",    color: (c) => c.textSec, bg: (c) => `${c.textSec}26` },
  capturing:  { label: "Capturing",  color: (c) => c.info,    bg: (c) => `${c.info}26` },
  uploading:  { label: "Uploading",  color: (c) => c.warning, bg: (c) => `${c.warning}26` },
  processing: { label: "Processing", color: (c) => c.accent,  bg: (c) => `${c.accent}26` },
  completed:  { label: "Completed",  color: (c) => c.success, bg: (c) => `${c.success}26` },
  failed:     { label: "Failed",     color: (_c) => "#f87171", bg: (_c) => "rgba(239,68,68,0.15)" },
  discarded:  { label: "Discarded",  color: (c) => c.textSec, bg: (c) => `${c.textSec}1A` },
};

export function SessionCard({ session, onPress, style }: SessionCardProps) {
  const { colors } = useTheme();
  const cfg = statusConfig[session.status];
  const date = new Date(session.started_at);
  const classification = session.classification?.classification;

  const accentBarColor =
    classification === "POSITIVE" ? colors.error
    : classification === "NEGATIVE" ? colors.success
    : colors.border;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[cardStyles.container, { backgroundColor: colors.card, borderColor: colors.border }, style]}
    >
      <View style={[cardStyles.accentBar, { backgroundColor: accentBarColor }]} />

      <View style={cardStyles.content}>
        <View style={cardStyles.topRow}>
          <Text style={[cardStyles.sessionId, { color: colors.textSec }]}>Session</Text>
          <View style={[cardStyles.statusPill, { backgroundColor: cfg.bg(colors) }]}>
            <Text style={[cardStyles.statusText, { color: cfg.color(colors) }]}>
              {cfg.label}
            </Text>
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
                {(session.classification.confidence_score * 100).toFixed(0)}%
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

