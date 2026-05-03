// components/thermal/FootFrameOverlay.tsx
//Manual foot-framing rectangle overlaid on the live thermal feed.
//
//Implementation note: this component used to use Reanimated 4 + the
//new react-native-gesture-handler Gesture API for UI-thread pinch
//handling, but pinch consistently crashed the app on Hermes (suspected
//worklet/multitouch race). Replaced with the bog-standard React Native
//PanResponder + useState. The maths are 4 floats per move event so
//running it on the JS thread is comfortably within 60fps budget for
//a single rect overlay.

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  GestureResponderEvent,
  PanResponder,
  StyleSheet,
} from "react-native";
import { useTheme } from "../../constants/ThemeContext";
import { Radius } from "../../constants/theme";
import {
  ROI_ASPECT,
  ROI_MAX_W,
  ROI_MIN_W,
  useRoiStore,
} from "../../store/roiStore";

interface Props {
  /** Width of the rendered thermal feed in screen pixels. */
  frameWidth: number;
  /** Height of the rendered thermal feed in screen pixels. */
  frameHeight: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function distance(touches: GestureResponderEvent["nativeEvent"]["touches"]): number {
  if (touches.length < 2) return 0;
  const [a, b] = [touches[0], touches[1]];
  const dx = a.pageX - b.pageX;
  const dy = a.pageY - b.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function FootFrameOverlay({ frameWidth, frameHeight }: Props) {
  const { colors } = useTheme();
  const rect    = useRoiStore((s) => s.rect);
  const locked  = useRoiStore((s) => s.locked);
  const visible = useRoiStore((s) => s.visible);
  const setRect = useRoiStore((s) => s.setRect);

  //Local mirror of the ROI driven by gestures. Commits back to the store
  //on release so other consumers (capture pipeline) see the final value.
  const [draft, setDraft] = useState(rect);
  useEffect(() => { setDraft(rect); }, [rect]);

  //Pinch / pan starting state (refs so the responder closures stay stable).
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0, dist: 0, mode: "idle" as "idle" | "pan" | "pinch" });

  //Show/hide animation (plain Animated, no Reanimated worklets).
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scale   = useRef(new Animated.Value(visible ? 1 : 0.92)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(scale,   { toValue: visible ? 1 : 0.92, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, [visible, opacity, scale]);

  const interactive = !locked && visible;

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => interactive,
    onMoveShouldSetPanResponder:  () => interactive,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const t = e.nativeEvent.touches;
      startRef.current = {
        x: draft.x, y: draft.y, w: draft.w, h: draft.h,
        dist: t.length >= 2 ? distance(t) : 0,
        mode: t.length >= 2 ? "pinch" : "pan",
      };
    },
    onPanResponderMove: (e, gesture) => {
      const start = startRef.current;
      const t = e.nativeEvent.touches;

      //Switch to pinch the moment a second finger lands.
      if (start.mode === "pan" && t.length >= 2) {
        start.mode = "pinch";
        start.dist = distance(t);
        start.x = draft.x; start.y = draft.y; start.w = draft.w; start.h = draft.h;
        return;
      }

      if (start.mode === "pinch" && t.length >= 2) {
        const d = distance(t);
        if (start.dist <= 0) return;
        const factor = d / start.dist;
        const cx = start.x + start.w / 2;
        const cy = start.y + start.h / 2;
        const newW = clamp(start.w * factor, ROI_MIN_W, ROI_MAX_W);
        const newH = Math.min(0.98, newW * ROI_ASPECT);
        const newX = clamp(cx - newW / 2, 0, 1 - newW);
        const newY = clamp(cy - newH / 2, 0, 1 - newH);
        setDraft({ x: newX, y: newY, w: newW, h: newH });
        return;
      }

      //Single-finger pan.
      const dx = gesture.dx / frameWidth;
      const dy = gesture.dy / frameHeight;
      const newX = clamp(start.x + dx, 0, 1 - start.w);
      const newY = clamp(start.y + dy, 0, 1 - start.h);
      setDraft((d) => ({ ...d, x: newX, y: newY }));
    },
    onPanResponderRelease: () => {
      startRef.current.mode = "idle";
      //Persist final draft to the store so the capture pipeline reads it.
      setRect(draft);
    },
    onPanResponderTerminate: () => {
      startRef.current.mode = "idle";
      setRect(draft);
    },
  })).current;

  const tooSmall    = draft.w < ROI_MIN_W + 0.005;
  const borderColor = tooSmall ? colors.error : locked ? colors.success : colors.accent;
  const fillColor   = `${borderColor}${tooSmall ? "33" : "1F"}`;

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.box,
        {
          position: "absolute",
          left:   draft.x * frameWidth,
          top:    draft.y * frameHeight,
          width:  draft.w * frameWidth,
          height: draft.h * frameHeight,
          opacity,
          transform: [{ scale }],
          borderColor,
          backgroundColor: fillColor,
          borderStyle: locked ? "solid" : "dashed",
        },
      ]}
      {...responder.panHandlers}
    >
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
  );
}

function CornerMarker({ corner, color }: { corner: "tl" | "tr" | "bl" | "br"; color: string }) {
  const len = 14;
  const wpx = 2;
  const off = 0;
  const horiz = {
    position: "absolute" as const,
    backgroundColor: color,
    width: len,
    height: wpx,
    ...(corner.startsWith("t") ? { top: off } : { bottom: off }),
    ...(corner.endsWith("l")   ? { left: off } : { right: off }),
  };
  const vert = {
    position: "absolute" as const,
    backgroundColor: color,
    width: wpx,
    height: len,
    ...(corner.startsWith("t") ? { top: off } : { bottom: off }),
    ...(corner.endsWith("l")   ? { left: off } : { right: off }),
  };
  return (
    <>
      <Animated.View style={horiz} />
      <Animated.View style={vert} />
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
