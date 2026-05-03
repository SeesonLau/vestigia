// components/thermal/ImageLightbox.tsx
//Photos-app-style image lightbox with a shared-element-feel transition.
//
//Reanimated 4 dropped the v3 sharedTransitionTag API, so we hand-roll the
//effect: when a tile is pressed, ZoomableImage measures its on-screen
//bounds and hands them to the provider; the modal renders an Animated.Image
//that interpolates from those bounds to a fullscreen aspect-fit position
//over a spring curve. Tap to dismiss reverses it.

import React, {
  createContext, useCallback, useContext, useState,
} from "react";
import {
  Dimensions, Modal, Pressable, StyleSheet,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface SourceBounds { x: number; y: number; width: number; height: number }
interface OpenPayload { uri: string; bounds: SourceBounds }

interface LightboxContextValue {
  open: (payload: OpenPayload) => void;
}
const LightboxContext = createContext<LightboxContextValue | null>(null);

export function useLightbox() {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error("useLightbox must be inside <LightboxProvider>");
  return ctx;
}

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<OpenPayload | null>(null);
  //progress: 0 = sitting at the source bounds; 1 = fullscreen aspect-fit
  const progress = useSharedValue(0);

  const open = useCallback((p: OpenPayload) => {
    setPayload(p);
    //Reset before animating in to avoid a jump if a previous open is mid-flight
    progress.value = 0;
    requestAnimationFrame(() => {
      progress.value = withSpring(1, { mass: 0.6, damping: 18, stiffness: 220 });
    });
  }, [progress]);

  const close = useCallback(() => {
    progress.value = withTiming(
      0,
      { duration: 220, easing: Easing.bezier(0.42, 0, 0.58, 1) },
      (finished) => {
        if (finished) runOnJS(setPayload)(null);
      },
    );
  }, [progress]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const imageStyle = useAnimatedStyle(() => {
    if (!payload) return {};
    const b = payload.bounds;
    //Aspect-fit the image inside the screen
    const aspect = b.width > 0 && b.height > 0 ? b.width / b.height : 4 / 3;
    const screenAspect = SCREEN_W / SCREEN_H;
    const targetW = aspect > screenAspect ? SCREEN_W : SCREEN_H * aspect;
    const targetH = aspect > screenAspect ? SCREEN_W / aspect : SCREEN_H;
    const targetX = (SCREEN_W - targetW) / 2;
    const targetY = (SCREEN_H - targetH) / 2;
    return {
      position: "absolute" as const,
      width:  interpolate(progress.value, [0, 1], [b.width,  targetW]),
      height: interpolate(progress.value, [0, 1], [b.height, targetH]),
      left:   interpolate(progress.value, [0, 1], [b.x,      targetX]),
      top:    interpolate(progress.value, [0, 1], [b.y,      targetY]),
      borderRadius: interpolate(progress.value, [0, 1], [4, 0]),
    };
  });

  return (
    <LightboxContext.Provider value={{ open }}>
      {children}
      <Modal
        visible={!!payload}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={close}
      >
        {payload ? (
          <Pressable onPress={close} style={StyleSheet.absoluteFill}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "black" }, overlayStyle]} />
            <Animated.Image
              source={{ uri: payload.uri }}
              resizeMode="cover"
              style={imageStyle}
            />
          </Pressable>
        ) : null}
      </Modal>
    </LightboxContext.Provider>
  );
}
