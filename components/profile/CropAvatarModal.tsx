// components/profile/CropAvatarModal.tsx
// Custom in-app cropper for avatars. Square crop, pan + pinch via gesture
// handler + reanimated, then expo-image-manipulator does the actual pixel
// crop on confirm. Replaces the system OS crop UI which had no themed
// buttons / unclear proportions.
//
// Math note: the displayed image is letterboxed to fit a SCREEN_W square
// preview (so the user sees the whole photo at scale 1). The dim overlay
// punches out a centered SQUARE_SIZE square that defines the crop window.
// The final crop rect (in source-image coords) is computed from the
// translation + scale shared values at confirm time.

import { Ionicons } from "@expo/vector-icons";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";

const { width: SCREEN_W } = Dimensions.get("window");

// The crop window is a square inset from the screen edges so the dimmed
// overlay around it is clearly visible. Output is downscaled to AVATAR_OUT
// pixels for upload (avatars don't need more than ~512px on a side).
const SQUARE_SIZE = SCREEN_W - Spacing.lg * 4;
const AVATAR_OUT = 512;

interface Props {
  /** Source image URI (from the picker). Modal becomes visible when set. */
  uri: string | null;
  onCancel: () => void;
  /** Receives a new file URI for the cropped JPEG. */
  onConfirm: (uri: string) => void;
}

export default function CropAvatarModal({ uri, onCancel, onConfirm }: Props) {
  const { colors } = useTheme();
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // Pan + pinch shared values. translateX/Y are in screen pixels relative
  // to the crop window's centre; scale multiplies the base "fit" scale.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  // Pre-gesture snapshots for additive transforms.
  const txStart    = useSharedValue(0);
  const tyStart    = useSharedValue(0);
  const scaleStart = useSharedValue(1);

  // Reset transforms whenever the source image changes.
  useEffect(() => {
    if (!uri) return;
    tx.value = 0; ty.value = 0; scale.value = 1;
    setImgSize(null);
    Image.getSize(
      uri,
      (w, h) => setImgSize({ w, h }),
      () => setImgSize(null),
    );
  }, [uri]);

  // The image is rendered at "fit-to-square" then scaled by `scale`. The
  // base size in pixels:
  const baseFit = imgSize
    ? Math.max(SQUARE_SIZE / imgSize.w, SQUARE_SIZE / imgSize.h)
    : 1;
  const renderedW = imgSize ? imgSize.w * baseFit : SQUARE_SIZE;
  const renderedH = imgSize ? imgSize.h * baseFit : SQUARE_SIZE;

  // Pan gesture — translates the image. Clamped via bounds() at gesture end
  // so the crop window can't be left empty.
  const panGesture = Gesture.Pan()
    .onStart(() => {
      txStart.value = tx.value;
      tyStart.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = txStart.value + e.translationX;
      ty.value = tyStart.value + e.translationY;
    })
    .onEnd(() => {
      const half = (renderedW * scale.value - SQUARE_SIZE) / 2;
      const halfH = (renderedH * scale.value - SQUARE_SIZE) / 2;
      const clampedX = Math.max(-half, Math.min(half, tx.value));
      const clampedY = Math.max(-halfH, Math.min(halfH, ty.value));
      tx.value = withSpring(clampedX, { damping: 18, stiffness: 220 });
      ty.value = withSpring(clampedY, { damping: 18, stiffness: 220 });
    });

  // Pinch gesture — multiplies scale. Clamp to [1, 6] so the user can't
  // zoom past the original resolution / past the crop becoming a single px.
  const pinchGesture = Gesture.Pinch()
    .onStart(() => { scaleStart.value = scale.value; })
    .onUpdate((e) => {
      const next = scaleStart.value * e.scale;
      scale.value = Math.max(1, Math.min(6, next));
    })
    .onEnd(() => {
      // After pinch, re-clamp pan so the crop window stays inside the image.
      const half = (renderedW * scale.value - SQUARE_SIZE) / 2;
      const halfH = (renderedH * scale.value - SQUARE_SIZE) / 2;
      const clampedX = Math.max(-half, Math.min(half, tx.value));
      const clampedY = Math.max(-halfH, Math.min(halfH, ty.value));
      tx.value = withSpring(clampedX, { damping: 18, stiffness: 220 });
      ty.value = withSpring(clampedY, { damping: 18, stiffness: 220 });
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  // Map the on-screen crop window back to source-image pixel coordinates,
  // then run expo-image-manipulator. Runs on the JS thread (called from
  // the button handler, so no runOnJS needed).
  const handleConfirm = async () => {
    if (!uri || !imgSize || busy) return;
    setBusy(true);
    try {
      const sx = scale.value;
      const dispW = renderedW * sx;
      const dispH = renderedH * sx;

      // Convert screen-coord crop window into displayed-image coords:
      // the crop window is centred at (SCREEN_W/2, ...). The image's
      // top-left in screen coords is (SCREEN_W/2 - dispW/2 + tx, ...).
      // So the crop window's top-left in image-display coords is:
      const cropLeftDisp = (dispW - SQUARE_SIZE) / 2 - tx.value;
      const cropTopDisp  = (dispH - SQUARE_SIZE) / 2 - ty.value;

      // Convert displayed coords back to source pixel coords.
      const srcScale = imgSize.w / dispW;
      const cropX = Math.max(0, Math.round(cropLeftDisp * srcScale));
      const cropY = Math.max(0, Math.round(cropTopDisp  * srcScale));
      const cropS = Math.round(SQUARE_SIZE * srcScale);

      // Final clamp so we never request a region outside the source.
      const safeS = Math.min(cropS, imgSize.w - cropX, imgSize.h - cropY);

      const result = await manipulateAsync(
        uri,
        [
          { crop: { originX: cropX, originY: cropY, width: safeS, height: safeS } },
          { resize: { width: AVATAR_OUT, height: AVATAR_OUT } },
        ],
        { compress: 0.9, format: SaveFormat.JPEG },
      );
      runOnJS(onConfirm)(result.uri);
    } catch (e) {
      console.warn("[CropAvatarModal] crop failed:", e);
    } finally {
      setBusy(false);
    }
  };

  const visible = !!uri;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crop photo</Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Crop area — image with pan/pinch + dimmed overlay punch-out */}
        <View style={styles.cropArea}>
          <GestureDetector gesture={composedGesture}>
            <View style={styles.cropFrame}>
              {imgSize ? (
                <Animated.Image
                  source={{ uri: uri! }}
                  style={[
                    {
                      width: renderedW,
                      height: renderedH,
                      position: "absolute",
                      left: (SCREEN_W - renderedW) / 2,
                      top: (SQUARE_SIZE - renderedH) / 2,
                    },
                    animatedStyle,
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <ActivityIndicator color="#fff" style={{ marginTop: SQUARE_SIZE / 2 - 12 }} />
              )}
            </View>
          </GestureDetector>

          {/* 4-piece dim overlay — top, bottom, left, right of the crop window */}
          <View pointerEvents="none" style={styles.overlayContainer}>
            <View style={[styles.dim, { height: (SCREEN_W - SQUARE_SIZE) / 2 }]} />
            <View style={styles.middleStrip}>
              <View style={[styles.dim, { width: (SCREEN_W - SQUARE_SIZE) / 2 }]} />
              <View style={[styles.cropWindow, { width: SQUARE_SIZE, height: SQUARE_SIZE }]} />
              <View style={[styles.dim, { width: (SCREEN_W - SQUARE_SIZE) / 2 }]} />
            </View>
            <View style={[styles.dim, { flex: 1 }]} />
          </View>
        </View>

        <Text style={styles.hint}>Pinch to zoom · drag to reposition</Text>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.85}
            style={[styles.footerBtn, styles.footerCancel]}
            disabled={busy}
          >
            <Text style={styles.footerCancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={!imgSize || busy}
            style={[
              styles.footerBtn,
              styles.footerConfirm,
              { backgroundColor: colors.accent, opacity: !imgSize || busy ? 0.6 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.footerConfirmText}>Use Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl + Spacing.md, paddingBottom: Spacing.md,
  },
  headerBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: {
    color: "#fff",
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
  },

  cropArea: {
    flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  cropFrame: {
    width: SCREEN_W,
    height: SQUARE_SIZE,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayContainer: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  middleStrip: { flexDirection: "row", height: SQUARE_SIZE },
  dim: { backgroundColor: "rgba(0,0,0,0.55)" },
  cropWindow: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: SQUARE_SIZE / 2, // circular, since avatar is round
  },

  hint: {
    color: "rgba(255,255,255,0.75)",
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    paddingVertical: Spacing.md,
  },

  footer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl + Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  footerBtn: {
    flex: 1, height: 50, borderRadius: Radius.lg,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 6,
  },
  footerCancel: { backgroundColor: "rgba(255,255,255,0.10)" },
  footerCancelText: {
    color: "#fff",
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
  footerConfirm: {},
  footerConfirmText: {
    color: "#fff",
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
});
