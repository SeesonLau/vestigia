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
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
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

  //Use primitive shared values for the gesture-start state.
  //Object-typed shared values can crash on Hermes when read during a
  //high-frequency worklet path; primitives are always safe.
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const pinchStartW  = useSharedValue(0);
  const pinchStartCX = useSharedValue(0);
  const pinchStartCY = useSharedValue(0);

  //Persist final rect to JS-thread store at gesture end. Wrapped so the
  //worklet only ever calls a stable JS function.
  const persistRect = (rect: RoiRect) => setRect(rect);

  const pan = Gesture.Pan()
    .enabled(!locked && visible)
    .onBegin(() => {
      "worklet";
      panStartX.value = x.value;
      panStartY.value = y.value;
    })
    .onUpdate((e) => {
      "worklet";
      const dx = e.translationX / frameWidth;
      const dy = e.translationY / frameHeight;
      const nx = panStartX.value + dx;
      const ny = panStartY.value + dy;
      const maxX = 1 - w.value;
      const maxY = 1 - h.value;
      x.value = nx < 0 ? 0 : nx > maxX ? maxX : nx;
      y.value = ny < 0 ? 0 : ny > maxY ? maxY : ny;
    })
    .onEnd(() => {
      "worklet";
      runOnJS(persistRect)({ x: x.value, y: y.value, w: w.value, h: h.value });
    });

  const pinch = Gesture.Pinch()
    .enabled(!locked && visible)
    .onBegin(() => {
      "worklet";
      pinchStartW.value  = w.value;
      pinchStartCX.value = x.value + w.value / 2;
      pinchStartCY.value = y.value + h.value / 2;
    })
    .onUpdate((e) => {
      "worklet";
      const scaled = pinchStartW.value * e.scale;
      const target = scaled < ROI_MIN_W ? ROI_MIN_W : scaled > ROI_MAX_W ? ROI_MAX_W : scaled;
      const newH   = target * ROI_ASPECT > 0.98 ? 0.98 : target * ROI_ASPECT;
      const newW   = target;
      w.value = newW;
      h.value = newH;
      const nx = pinchStartCX.value - newW / 2;
      const ny = pinchStartCY.value - newH / 2;
      const maxX = 1 - newW;
      const maxY = 1 - newH;
      x.value = nx < 0 ? 0 : nx > maxX ? maxX : nx;
      y.value = ny < 0 ? 0 : ny > maxY ? maxY : ny;
    })
    .onEnd(() => {
      "worklet";
      runOnJS(persistRect)({ x: x.value, y: y.value, w: w.value, h: h.value });
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  //Track whether the box is below the practical minimum size. Use a derived
  //shared value so the JS thread can render-time-read it without crossing
  //thread boundaries unsafely.
  const tooSmallSV = useDerivedValue(() => w.value < ROI_MIN_W + 0.005);
  const [tooSmall, setTooSmall] = React.useState(false);
  useDerivedValue(() => {
    runOnJS(setTooSmall)(tooSmallSV.value);
    return null;
  });

  //Position + opacity + scale only — read shared values in the worklet.
  //Border color / fill / dash style depend on JS booleans (locked, tooSmall)
  //so we apply them as regular RN styles in the JSX below.
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

  const borderColor = tooSmall
    ? colors.error
    : locked
      ? colors.success
      : colors.accent;
  const fillColor = `${borderColor}${tooSmall ? "33" : "1F"}`;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          animatedStyle,
          styles.box,
          {
            borderColor,
            backgroundColor: fillColor,
            borderStyle: locked ? "solid" : "dashed",
          },
        ]}
        pointerEvents={visible ? "auto" : "none"}
      >
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
