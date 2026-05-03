// components/thermal/FootFrameOverlay.tsx
//Manual foot-framing rectangle overlaid on the live thermal feed. Pinch to
//resize (aspect-locked to the dataset 168/65 ratio), drag to reposition,
//and lock to disable accidental gesture changes during framing. The store
//holds normalized [0..1] coordinates so the same rect maps consistently
//to the sensor matrix at capture time.

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../constants/ThemeContext";
import { Radius } from "../../constants/theme";
import {
  ROI_ASPECT,
  ROI_MAX_W,
  ROI_MIN_W,
  useRoiStore,
  type RoiRect,
} from "../../store/roiStore";

interface Props {
  /** Width of the rendered thermal feed in screen pixels. */
  frameWidth: number;
  /** Height of the rendered thermal feed in screen pixels. */
  frameHeight: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function FootFrameOverlay({ frameWidth, frameHeight }: Props) {
  const { colors } = useTheme();
  const rect    = useRoiStore((s) => s.rect);
  const locked  = useRoiStore((s) => s.locked);
  const visible = useRoiStore((s) => s.visible);
  const setRect = useRoiStore((s) => s.setRect);

  //Shared values mirror the store so we can drive smooth gestures + springs
  //on the UI thread without triggering re-renders.
  const x = useSharedValue(rect.x);
  const y = useSharedValue(rect.y);
  const w = useSharedValue(rect.w);
  const h = useSharedValue(rect.h);
  const opacity = useSharedValue(visible ? 1 : 0);
  const scaleAnim = useSharedValue(visible ? 1 : 0.92);

  //External rect changes (Reset, store sets) → animate to them.
  useEffect(() => {
    x.value = withSpring(rect.x, { damping: 18, stiffness: 200 });
    y.value = withSpring(rect.y, { damping: 18, stiffness: 200 });
    w.value = withSpring(rect.w, { damping: 18, stiffness: 200 });
    h.value = withSpring(rect.h, { damping: 18, stiffness: 200 });
  }, [rect, x, y, w, h]);

  useEffect(() => {
    opacity.value   = withTiming(visible ? 1 : 0,    { duration: 220 });
    scaleAnim.value = withSpring (visible ? 1 : 0.92, { damping: 16, stiffness: 240 });
  }, [visible, opacity, scaleAnim]);

  //Pan gesture — tracks normalized delta against frame size.
  const panStart = useSharedValue({ x: 0, y: 0 });
  const pan = Gesture.Pan()
    .enabled(!locked && visible)
    .onBegin(() => {
      panStart.value = { x: x.value, y: y.value };
    })
    .onUpdate((e) => {
      const dx = e.translationX / frameWidth;
      const dy = e.translationY / frameHeight;
      x.value = clamp(panStart.value.x + dx, 0, 1 - w.value);
      y.value = clamp(panStart.value.y + dy, 0, 1 - h.value);
    })
    .onEnd(() => {
      runOnJS(setRect)({ x: x.value, y: y.value, w: w.value, h: h.value });
    });

  //Pinch gesture — aspect-locked. Anchor the resize at the box center so the
  //user doesn't lose their alignment while scaling.
  const pinchStart = useSharedValue({ w: 0, h: 0, cx: 0, cy: 0 });
  const pinch = Gesture.Pinch()
    .enabled(!locked && visible)
    .onBegin(() => {
      pinchStart.value = {
        w: w.value,
        h: h.value,
        cx: x.value + w.value / 2,
        cy: y.value + h.value / 2,
      };
    })
    .onUpdate((e) => {
      const target = clamp(pinchStart.value.w * e.scale, ROI_MIN_W, ROI_MAX_W);
      const newH = Math.min(0.98, target * ROI_ASPECT);
      const newW = Math.min(target, ROI_MAX_W);
      w.value = newW;
      h.value = newH;
      x.value = clamp(pinchStart.value.cx - newW / 2, 0, 1 - newW);
      y.value = clamp(pinchStart.value.cy - newH / 2, 0, 1 - newH);
    })
    .onEnd(() => {
      runOnJS(setRect)({ x: x.value, y: y.value, w: w.value, h: h.value });
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      left:   x.value * frameWidth,
      top:    y.value * frameHeight,
      width:  w.value * frameWidth,
      height: h.value * frameHeight,
      opacity: opacity.value,
      transform: [{ scale: scaleAnim.value }],
    };
  });

  //Border / fill colors react to lock state (and to too-small via min check).
  const animatedBorderStyle = useAnimatedStyle(() => {
    const tooSmall = w.value < ROI_MIN_W + 0.005;
    const borderColor = tooSmall
      ? colors.error
      : locked
        ? colors.success
        : colors.accent;
    const fillAlpha = interpolate(
      tooSmall ? 1 : 0,
      [0, 1],
      [0.10, 0.18],
      Extrapolation.CLAMP,
    );
    const fillColor = `${borderColor}${Math.round(fillAlpha * 255).toString(16).padStart(2, "0")}`;
    return {
      borderColor,
      backgroundColor: fillColor,
      borderStyle: locked ? "solid" : "dashed",
    };
  });

  if (!visible && opacity.value === 0) return null;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[animatedStyle, styles.box, animatedBorderStyle]} pointerEvents="auto">
        {/* Corner markers — fade out when locked to signal "no longer interactive" */}
        {!locked ? (
          <>
            <CornerMarker corner="tl" color={colors.accent} />
            <CornerMarker corner="tr" color={colors.accent} />
            <CornerMarker corner="bl" color={colors.accent} />
            <CornerMarker corner="br" color={colors.accent} />
          </>
        ) : (
          <Ionicons
            name="lock-closed"
            size={14}
            color={colors.success}
            style={styles.lockBadge}
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

function CornerMarker({ corner, color }: { corner: "tl" | "tr" | "bl" | "br"; color: string }) {
  const offset = 0;
  const len = 14;
  const wpx = 2;
  const baseStyle = { position: "absolute" as const, backgroundColor: color };
  return (
    <>
      {/* horizontal arm */}
      <Animated.View
        style={[
          baseStyle,
          { width: len, height: wpx },
          corner.startsWith("t") ? { top: offset } : { bottom: offset },
          corner.endsWith("l")   ? { left: offset } : { right: offset },
        ]}
      />
      {/* vertical arm */}
      <Animated.View
        style={[
          baseStyle,
          { width: wpx, height: len },
          corner.startsWith("t") ? { top: offset } : { bottom: offset },
          corner.endsWith("l")   ? { left: offset } : { right: offset },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderRadius: Radius.md,
  },
  lockBadge: {
    position: "absolute",
    top: 4,
    right: 4,
  },
});
