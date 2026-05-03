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
  /** Notify the parent when an interaction begins/ends so it can disable
   *  ancestor ScrollView scrolling while the user is dragging the box. */
  onInteractionChange?: (active: boolean) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function distance(touches: GestureResponderEvent["nativeEvent"]["touches"]): number {
  if (touches.length < 2) return 0;
  const [a, b] = [touches[0], touches[1]];
  const dx = a.pageX - b.pageX;
  const dy = a.pageY - b.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function FootFrameOverlay({ frameWidth, frameHeight, onInteractionChange }: Props) {
  const { colors } = useTheme();
  const rect    = useRoiStore((s) => s.rect);
  const locked  = useRoiStore((s) => s.locked);
  const visible = useRoiStore((s) => s.visible);
  const setRect = useRoiStore((s) => s.setRect);

  //Local mirror of the ROI driven by gestures. Commits back to the store
  //on release so other consumers (capture pipeline) see the final value.
  const [draft, setDraft] = useState(rect);
  useEffect(() => { setDraft(rect); }, [rect]);

  //Refs that mirror the live state so the PanResponder callbacks (created
  //ONCE) always read the current values instead of a stale closure. This
  //is the root cause of the previous "drag from the original rect" bug.
  const draftRef       = useRef(draft);
  const interactiveRef = useRef(true);
  const frameWRef      = useRef(frameWidth);
  const frameHRef      = useRef(frameHeight);
  useEffect(() => { draftRef.current       = draft;          }, [draft]);
  useEffect(() => { interactiveRef.current = !locked && visible; }, [locked, visible]);
  useEffect(() => { frameWRef.current      = frameWidth;     }, [frameWidth]);
  useEffect(() => { frameHRef.current      = frameHeight;    }, [frameHeight]);

  //Pinch / pan starting state.
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

  const responder = useRef(PanResponder.create({
    //Use Capture variants so the box wins the gesture during the capture
    //phase -- otherwise the parent ScrollView's own onMoveShouldSetResponder
    //activates after a few pixels of vertical movement, terminates our
    //responder, and the box stops moving partway down. Capture-phase claim
    //preempts that.
    onStartShouldSetPanResponderCapture: () => interactiveRef.current,
    onMoveShouldSetPanResponderCapture:  () => interactiveRef.current,
    onStartShouldSetPanResponder:        () => interactiveRef.current,
    onMoveShouldSetPanResponder:         () => interactiveRef.current,
    onPanResponderTerminationRequest:    () => false,
    //Block the gesture from propagating to ancestors after we've claimed it.
    onShouldBlockNativeResponder:        () => true,
    onPanResponderGrant: (e) => {
      const t = e.nativeEvent.touches;
      const d = draftRef.current;
      startRef.current = {
        x: d.x, y: d.y, w: d.w, h: d.h,
        dist: t.length >= 2 ? distance(t) : 0,
        mode: t.length >= 2 ? "pinch" : "pan",
      };
      onInteractionChange?.(true);
    },
    onPanResponderMove: (e, gesture) => {
      const start = startRef.current;
      const t = e.nativeEvent.touches;
      const cur = draftRef.current;

      //Switch to pinch the moment a second finger lands.
      if (start.mode === "pan" && t.length >= 2) {
        start.mode = "pinch";
        start.dist = distance(t);
        start.x = cur.x; start.y = cur.y; start.w = cur.w; start.h = cur.h;
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
        const next = { x: newX, y: newY, w: newW, h: newH };
        draftRef.current = next;
        setDraft(next);
        return;
      }

      //Single-finger pan only. If the gesture started in pinch mode and
      //the user lifts one finger without releasing entirely, freeze the
      //box rather than teleporting it (gesture.dx/dy at this point is
      //relative to the original two-finger touchdown, not the current
      //single-finger position, so applying it would jump).
      if (start.mode !== "pan") return;

      const dx = gesture.dx / frameWRef.current;
      const dy = gesture.dy / frameHRef.current;
      const newX = clamp(start.x + dx, 0, 1 - start.w);
      const newY = clamp(start.y + dy, 0, 1 - start.h);
      const next = { x: newX, y: newY, w: start.w, h: start.h };
      draftRef.current = next;
      setDraft(next);
    },
    onPanResponderRelease: () => {
      startRef.current.mode = "idle";
      //Persist final draft to the store so the capture pipeline reads it.
      setRect(draftRef.current);
      onInteractionChange?.(false);
    },
    onPanResponderTerminate: () => {
      startRef.current.mode = "idle";
      setRect(draftRef.current);
      onInteractionChange?.(false);
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
