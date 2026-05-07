// components/profile/CropAvatarModal.tsx
// Custom in-app cropper for avatars. Square crop, pan + pinch via gesture
// handler + reanimated, then expo-image-manipulator does the actual pixel
// crop on confirm. Replaces the system OS crop UI which had no themed
// buttons / unclear proportions.
//
// Layout note: the crop region (square SCREEN_W × SQUARE_SIZE box) and the
// "pinch to zoom" hint are bundled in a single fixed-size column that the
// outer flex centers vertically. That keeps the hint flush below the crop
// circle even on tall devices. Footer padding-bottom comes from
// useSafeAreaInsets so it always clears the system nav bar / gesture bar.

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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Mask, Rect } from "react-native-svg";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";

const { width: SCREEN_W } = Dimensions.get("window");

// The crop region is a square inset from the screen edges so the dimmed
// surround is clearly visible. Output is downscaled to AVATAR_OUT pixels
// for upload — avatars don't need more than ~512 px on a side.
const SQUARE_SIZE = SCREEN_W - Spacing.lg * 4;
const AVATAR_OUT  = 512;
// The crop region's wrapper is exactly SQUARE_SIZE tall × SCREEN_W wide so
// the circular crop hole sits inside it with horizontal dim margins on
// each side and zero vertical margin (crop hole spans the full height).
const FRAME_W = SCREEN_W;
const FRAME_H = SQUARE_SIZE;

interface Props {
  /** Source image URI (from the picker). Modal becomes visible when set. */
  uri: string | null;
  onCancel: () => void;
  /** Receives a new file URI for the cropped JPEG. */
  onConfirm: (uri: string) => void;
}

export default function CropAvatarModal({ uri, onCancel, onConfirm }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // Pan + pinch shared values. translateX/Y are in screen pixels relative
  // to the crop window's centre; scale multiplies the base "fit" scale.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
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

  // The image is rendered at "fit-to-square" — the smaller dimension of the
  // image fills the SQUARE_SIZE crop hole, the other dimension extends past
  // it. Then `scale` multiplies for pinch zoom.
  const baseFit = imgSize
    ? Math.max(SQUARE_SIZE / imgSize.w, SQUARE_SIZE / imgSize.h)
    : 1;
  const renderedW = imgSize ? imgSize.w * baseFit : SQUARE_SIZE;
  const renderedH = imgSize ? imgSize.h * baseFit : SQUARE_SIZE;

  // Pan gesture — translates the image. Clamped via bounds at gesture end
  // so the crop hole can't be scrolled past empty space.
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
      const halfX = (renderedW * scale.value - SQUARE_SIZE) / 2;
      const halfY = (renderedH * scale.value - SQUARE_SIZE) / 2;
      tx.value = withSpring(Math.max(-halfX, Math.min(halfX, tx.value)), { damping: 18, stiffness: 220 });
      ty.value = withSpring(Math.max(-halfY, Math.min(halfY, ty.value)), { damping: 18, stiffness: 220 });
    });

  // Pinch gesture — multiplies scale. Clamp to [1, 6] so the user can't
  // zoom past the original resolution / past the crop becoming a single px.
  const pinchGesture = Gesture.Pinch()
    .onStart(() => { scaleStart.value = scale.value; })
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(6, scaleStart.value * e.scale));
    })
    .onEnd(() => {
      const halfX = (renderedW * scale.value - SQUARE_SIZE) / 2;
      const halfY = (renderedH * scale.value - SQUARE_SIZE) / 2;
      tx.value = withSpring(Math.max(-halfX, Math.min(halfX, tx.value)), { damping: 18, stiffness: 220 });
      ty.value = withSpring(Math.max(-halfY, Math.min(halfY, ty.value)), { damping: 18, stiffness: 220 });
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
  // the button handler, so no runOnJS needed for the manipulator call).
  const handleConfirm = async () => {
    if (!uri || !imgSize || busy) return;
    setBusy(true);
    try {
      const sx = scale.value;
      const dispW = renderedW * sx;
      const dispH = renderedH * sx;

      const cropLeftDisp = (dispW - SQUARE_SIZE) / 2 - tx.value;
      const cropTopDisp  = (dispH - SQUARE_SIZE) / 2 - ty.value;

      const srcScale = imgSize.w / dispW;
      const cropX = Math.max(0, Math.round(cropLeftDisp * srcScale));
      const cropY = Math.max(0, Math.round(cropTopDisp  * srcScale));
      const cropS = Math.round(SQUARE_SIZE * srcScale);
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
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <TouchableOpacity onPress={onCancel} hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crop photo</Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Crop area — vertically centred. The frame + hint move together
            because they live in the same fixed-height column. */}
        <View style={styles.cropArea}>
          <View style={styles.cropGroup}>
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
                        left: (FRAME_W - renderedW) / 2,
                        top:  (FRAME_H - renderedH) / 2,
                      },
                      animatedStyle,
                    ]}
                    resizeMode="cover"
                  />
                ) : (
                  <ActivityIndicator color="#fff" style={styles.loadingIndicator} />
                )}

                {/* Dim mask with a circular punch-out so the user sees a
                    preview of what the rendered (round) avatar will look
                    like. SVG mask is the cleanest cross-platform way. */}
                <Svg pointerEvents="none" width={FRAME_W} height={FRAME_H} style={StyleSheet.absoluteFill}>
                  <Defs>
                    <Mask id="cropMask" x="0" y="0" width={FRAME_W} height={FRAME_H}>
                      <Rect x="0" y="0" width={FRAME_W} height={FRAME_H} fill="white" />
                      <Circle cx={FRAME_W / 2} cy={FRAME_H / 2} r={SQUARE_SIZE / 2} fill="black" />
                    </Mask>
                  </Defs>
                  <Rect x="0" y="0" width={FRAME_W} height={FRAME_H} fill="rgba(0,0,0,0.62)" mask="url(#cropMask)" />
                </Svg>

                {/* Circular crop-window outline. */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.cropOutline,
                    {
                      left: (FRAME_W - SQUARE_SIZE) / 2,
                      top:  (FRAME_H - SQUARE_SIZE) / 2,
                      width: SQUARE_SIZE,
                      height: SQUARE_SIZE,
                      borderRadius: SQUARE_SIZE / 2,
                    },
                  ]}
                />
              </View>
            </GestureDetector>

            <Text style={styles.hint}>Pinch to zoom · drag to reposition</Text>
          </View>
        </View>

        {/* Footer with safe-area bottom padding so it clears the phone's
            system nav bar / gesture indicator. */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  headerTitle: {
    color: "#fff",
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
  },

  cropArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cropGroup: {
    // crop frame + hint are bundled so the hint always sits flush below
    // the circle regardless of available vertical space.
    alignItems: "center",
  },
  cropFrame: {
    width:  FRAME_W,
    height: FRAME_H,
    overflow: "hidden",
  },
  loadingIndicator: { alignSelf: "center", marginTop: FRAME_H / 2 - 12 },
  cropOutline: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.92)",
  },

  hint: {
    color: "rgba(255,255,255,0.78)",
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    paddingTop: Spacing.md,
  },

  footer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
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
