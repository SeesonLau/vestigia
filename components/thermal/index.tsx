// components/thermal/index.tsx
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../../constants/ThemeContext";
import { Spacing, Typography } from "../../constants/theme";

// ── ThermalScale ───────────────────────────────────────────────
interface ThermalScaleProps {
  minTemp: number;
  maxTemp: number;
  height?: number;
  style?: ViewStyle;
}

export function ThermalScale({
  minTemp,
  maxTemp,
  height = 200,
  style,
}: ThermalScaleProps) {
  const { colors } = useTheme();
  const steps = 5;
  const labels = Array.from({ length: steps + 1 }, (_, i) => {
    const t = minTemp + ((maxTemp - minTemp) * (steps - i)) / steps;
    return t.toFixed(1);
  });

  return (
    <View style={[scaleStyles.container, style]}>
      <Svg width={20} height={height}>
        <Defs>
          <LinearGradient id="thermal" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="rgb(255,255,200)" />
            <Stop offset="25%" stopColor="rgb(255,180,0)" />
            <Stop offset="50%" stopColor="rgb(220,40,0)" />
            <Stop offset="75%" stopColor="rgb(100,0,100)" />
            <Stop offset="100%" stopColor="rgb(0,0,0)" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={20} height={height} fill="url(#thermal)" rx={4} />
      </Svg>

      <View style={scaleStyles.labels}>
        {labels.map((label, i) => (
          <Text key={i} style={[scaleStyles.label, { color: colors.textSec }]}>
            {label}°
          </Text>
        ))}
      </View>
    </View>
  );
}

// ── ThermalAnnotation ──────────────────────────────────────────
interface ThermalAnnotationProps {
  minTemp: number;
  maxTemp: number;
  meanTemp: number;
  style?: ViewStyle;
}

export function ThermalAnnotation({
  minTemp,
  maxTemp,
  meanTemp,
  style,
}: ThermalAnnotationProps) {
  const { colors } = useTheme();
  return (
    <View style={[annotStyles.container, { borderTopColor: colors.border }, style]}>
      <AnnotItem label="MIN" value={minTemp} color="#4dd9c0" textSecColor={colors.textSec} />
      <AnnotItem label="AVG" value={meanTemp} color="#fbbf24" textSecColor={colors.textSec} />
      <AnnotItem label="MAX" value={maxTemp} color="#f87171" textSecColor={colors.textSec} />
    </View>
  );
}

function AnnotItem({
  label,
  value,
  color,
  textSecColor,
}: {
  label: string;
  value: number;
  color: string;
  textSecColor: string;
}) {
  return (
    <View style={annotStyles.item}>
      <View style={[annotStyles.dot, { backgroundColor: color }]} />
      <View>
        <Text style={[annotStyles.itemLabel, { color: textSecColor }]}>{label}</Text>
        <Text style={[annotStyles.itemValue, { color }]}>
          {value.toFixed(1)}°C
        </Text>
      </View>
    </View>
  );
}

// ── FootGuidanceOverlay ────────────────────────────────────────
interface FootGuidanceOverlayProps {
  width: number;
  height: number;
  style?: ViewStyle;
}

export function FootGuidanceOverlay({
  width,
  height,
  style,
}: FootGuidanceOverlayProps) {
  const footW = width * 0.28;
  const footH = height * 0.8;
  const leftX = width * 0.1;
  const rightX = width * 0.62;
  const topY = height * 0.1;

  return (
    <View
      style={[{ position: "absolute", width, height }, style]}
      pointerEvents="none"
    >
      <Svg width={width} height={height}>
        <Rect x={leftX} y={topY} width={footW} height={footH} stroke="rgba(77,217,192,0.7)" strokeWidth={1.5} strokeDasharray="6,4" fill="rgba(77,217,192,0.04)" rx={footW / 2} />
        <Rect x={rightX} y={topY} width={footW} height={footH} stroke="rgba(77,217,192,0.7)" strokeWidth={1.5} strokeDasharray="6,4" fill="rgba(77,217,192,0.04)" rx={footW / 2} />
      </Svg>
      <View style={[guidanceStyles.labelLeft, { top: topY - 20, left: leftX }]}>
        <Text style={guidanceStyles.labelText}>LEFT</Text>
      </View>
      <View style={[guidanceStyles.labelRight, { top: topY - 20, left: rightX }]}>
        <Text style={guidanceStyles.labelText}>RIGHT</Text>
      </View>
    </View>
  );
}

const scaleStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "stretch",
    marginLeft: Spacing.sm,
  },
  labels: {
    justifyContent: "space-between",
    marginLeft: Spacing.xs,
    paddingVertical: 2,
  },
  label: {
    fontSize: 9,
    fontFamily: Typography.fonts.mono,
    lineHeight: 12,
  },
});

const annotStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(5, 13, 26, 0.75)",
    borderTopWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  itemLabel: {
    fontSize: 9,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
  },
  itemValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    letterSpacing: 0.5,
  },
});

const guidanceStyles = StyleSheet.create({
  labelLeft: { position: "absolute" },
  labelRight: { position: "absolute" },
  labelText: {
    fontSize: 9,
    fontFamily: Typography.fonts.label,
    color: "rgba(77,217,192,0.8)",
    letterSpacing: 1,
  },
});
