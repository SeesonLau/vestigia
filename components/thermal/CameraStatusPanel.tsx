// components/thermal/CameraStatusPanel.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ThemeColors } from "../../constants/theme";
import { Radius, Spacing, Typography } from "../../constants/theme";

export type CameraStatus = "disconnected" | "connecting" | "connected" | "error";

interface Props {
  status: CameraStatus;
  cameraError: string | null;
  fps: number;
  frameWarning: boolean;
  supportedFormats: string;
  frameDebug: string;
  onRetry: () => void;
  colors: ThemeColors;
}

export default function CameraStatusPanel({
  status,
  cameraError,
  fps,
  frameWarning,
  supportedFormats,
  frameDebug,
  onRetry,
  colors,
}: Props) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (status === "connecting") {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
    return () => { loop?.stop(); pulseAnim.stopAnimation(); };
  }, [status]);

  const dotColor =
    status === "connected"
      ? frameWarning ? colors.warning : colors.success
      : status === "connecting" ? colors.warning
      : status === "error" ? colors.error
      : colors.textSec;

  const isPermissionError = cameraError?.toLowerCase().includes("permission");

  const detailText =
    status === "connected"
      ? "FLIR Lepton 3.5 · 160×120 · 9 Hz"
      : status === "connecting"
      ? "Plug in via USB-C to begin"
      : status === "error"
      ? isPermissionError
        ? "USB access denied · Tap App Settings → Storage → Clear Data, then retry"
        : (cameraError ?? "Connection failed")
      : "Camera unplugged · Reconnect to continue";

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: dotColor + "50" }]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <Animated.View style={[styles.dot, { backgroundColor: dotColor, opacity: pulseAnim }]} />
        <Ionicons name="hardware-chip-outline" size={14} color={colors.textSec} />
        <Text style={[styles.sourceLabel, { color: colors.text }]} numberOfLines={1}>
          {status === "connecting" ? "Searching for camera…" : "FLIR Lepton 3.5"}
        </Text>
        <View style={styles.topRight}>
          {status === "connected" && (
            <View style={[styles.fpsChip, { backgroundColor: colors.success + "20" }]}>
              <Text style={[styles.fpsValue, { color: colors.success }]}>{fps} fps</Text>
            </View>
          )}
          {status === "error" && (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity onPress={onRetry} style={[styles.retryBtn, { borderColor: colors.accent }]}>
                <Ionicons name="refresh-outline" size={12} color={colors.accent} />
                <Text style={[styles.retryText, { color: colors.accent }]}>Retry</Text>
              </TouchableOpacity>
              {isPermissionError && (
                <TouchableOpacity
                  onPress={() => Linking.openSettings()}
                  style={[styles.retryBtn, { borderColor: colors.error }]}
                >
                  <Ionicons name="settings-outline" size={12} color={colors.error} />
                  <Text style={[styles.retryText, { color: colors.error }]}>App Settings</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Detail row */}
      <View style={styles.detailRow}>
        <View style={[styles.statusBadge, { backgroundColor: dotColor + "20" }]}>
          <Text style={[styles.statusBadgeText, { color: dotColor }]}>
            {status === "connected" ? "CONNECTED"
              : status === "connecting" ? "SEARCHING"
              : status === "error" ? "ERROR"
              : "DISCONNECTED"}
          </Text>
        </View>
        <Text style={[styles.detailText, { color: colors.textSec }]} numberOfLines={1}>
          {detailText}
        </Text>
      </View>

      {/* Frame format warning */}
      {frameWarning && status === "connected" && (
        <View style={[styles.warningRow, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
          <Ionicons name="warning-outline" size={12} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            Temperature data may be inaccurate — frame format not confirmed as Y16
          </Text>
        </View>
      )}

      {/* Frame debug */}
      {frameDebug.length > 0 && (
        <View style={[styles.formatsRow, { borderTopColor: colors.border }]}>
          <Ionicons name="pulse-outline" size={11} color={colors.textSec} />
          <Text style={[styles.formatsText, { color: colors.textSec }]} numberOfLines={2}>
            {frameDebug}
          </Text>
        </View>
      )}

      {/* Supported formats */}
      {supportedFormats.length > 0 && status === "connected" && (
        <View style={[styles.formatsRow, { borderTopColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={11} color={colors.textSec} />
          <Text style={[styles.formatsText, { color: colors.textSec }]} numberOfLines={2}>
            {supportedFormats}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sourceLabel: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.heading,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  fpsChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  fpsValue: {
    fontSize: 11,
    fontFamily: Typography.fonts.mono,
    letterSpacing: 0.5,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 11,
    fontFamily: Typography.fonts.label,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusBadgeText: {
    fontSize: 9,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1,
  },
  detailText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 10,
    fontFamily: Typography.fonts.body,
    lineHeight: 14,
  },
  formatsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    borderTopWidth: 1,
    paddingTop: Spacing.xs,
    marginTop: 2,
  },
  formatsText: {
    flex: 1,
    fontSize: 9,
    fontFamily: Typography.fonts.mono,
    lineHeight: 13,
  },
});
