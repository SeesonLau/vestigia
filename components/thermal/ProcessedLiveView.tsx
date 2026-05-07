// components/thermal/ProcessedLiveView.tsx
//A pared-down live thermal feed for casual viewing. Reuses the camera
//bridge from lib/thermal/uvcCamera but exposes only the processed
//(palette-mapped) preview, the display-mode tabs, and the palette
//chooser. No capture button, no framing rectangle, no readiness
//indicator, no step indicator.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import Header from "../layout/Header";
import ScreenWrapper from "../layout/ScreenWrapper";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { PALETTES } from "../../lib/thermal/palettes";
import {
  connectCamera, disconnectCamera,
  onCameraConnected, onCameraDisconnected, onCameraFormats, onDisplayFrame,
  onFrameStats, setDisplayMode as setDisplayModeNative, setPalette as setPaletteNative,
} from "../../lib/thermal/uvcCamera";
import type { DisplayMode, PaletteType } from "../../lib/thermal/uvcCamera";
import CameraStatusPanel from "./CameraStatusPanel";

const { width: SCREEN_W } = Dimensions.get("window");
const MAP_W = SCREEN_W - Spacing.lg * 2;
const MAP_H = Math.round(MAP_W * (120 / 160));

type CameraStatus = "disconnected" | "connecting" | "connected" | "error";

export default function ProcessedLiveView() {
  const router = useRouter();
  const { colors } = useTheme();

  const [cameraStatus,    setCameraStatus]    = useState<CameraStatus>("disconnected");
  const [cameraError,     setCameraError]     = useState<string | null>(null);
  const [supportedFormats,setSupportedFormats]= useState("");
  const [retryKey,        setRetryKey]        = useState(0);
  const [fps,             setFps]             = useState(0);
  const [displayUri,      setDisplayUri]      = useState<string | null>(null);

  const [displayMode, setDisplayMode] = useState<DisplayMode>("rgb");
  const [palette,     setPalette]     = useState<PaletteType>("ironbow");

  const frameTimestamps = useRef<number[]>([]);
  const computeFps = useCallback(() => {
    const now = Date.now();
    frameTimestamps.current.push(now);
    if (frameTimestamps.current.length > 9) frameTimestamps.current.shift();
    const oldest = frameTimestamps.current[0];
    const count  = frameTimestamps.current.length;
    if (count > 1) setFps(Math.round(((count - 1) / (now - oldest)) * 1000));
  }, []);

  useEffect(() => {
    setCameraStatus("connecting");
    setCameraError(null);
    setSupportedFormats("");
    frameTimestamps.current = [];

    let unsubDisplay:    (() => void) | null = null;
    let unsubConnect:    (() => void) | null = null;
    let unsubDisconnect: (() => void) | null = null;
    let unsubStats:      (() => void) | null = null;

    async function setup() {
      unsubConnect    = onCameraConnected(() => setCameraStatus("connected"));
      unsubDisconnect = onCameraDisconnected(() => {
        setCameraStatus("disconnected");
        setDisplayUri(null);
        setFps(0);
        frameTimestamps.current = [];
      });
      const unsubFormats = onCameraFormats(setSupportedFormats);
      unsubDisplay = onDisplayFrame((jpegB64) => {
        setDisplayUri("data:image/jpeg;base64," + jpegB64);
        computeFps();
      });
      unsubStats = onFrameStats(() => { /* readiness intentionally ignored */ });
      try {
        await connectCamera();
      } catch (e: unknown) {
        setCameraStatus("error");
        setCameraError(e instanceof Error ? e.message : "Camera connection failed");
        unsubDisconnect?.();
        unsubDisconnect = null;
      }
      return () => unsubFormats();
    }

    const cleanup = setup();
    return () => {
      cleanup.then((fn) => fn?.());
      unsubDisplay?.();
      unsubConnect?.();
      unsubDisconnect?.();
      unsubStats?.();
      disconnectCamera();
    };
  }, [retryKey, computeFps]);

  const handleSetMode = async (mode: DisplayMode) => {
    setDisplayMode(mode);
    try { await setDisplayModeNative(mode); } catch { /* swallow — UI state already updated */ }
  };

  const handleSetPalette = async (p: PaletteType) => {
    setPalette(p);
    try { await setPaletteNative(p); } catch { /* swallow — UI state already updated */ }
  };

  const frameDebug = displayUri
    ? `Y16→${displayMode.toUpperCase()}${displayMode === "rgb" ? ` · ${palette}` : ""} · 160×120`
    : "";

  return (
    <ScreenWrapper>
      <Header
        title="Thermal Preview"
        subtitle="Processed feed · view-only"
        leftIcon={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
        rightIcon={
          <View style={[styles.fpsTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="hardware-chip-outline" size={11} color={colors.textSec} />
            <Text style={[styles.fpsText, { color: colors.success }]}>
              {cameraStatus === "connected" ? `${fps} fps` : "--"}
            </Text>
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <CameraStatusPanel
          status={cameraStatus}
          cameraError={cameraError}
          fps={fps}
          frameWarning={false}
          supportedFormats={supportedFormats}
          frameDebug={frameDebug}
          onRetry={() => { disconnectCamera(); setRetryKey((k) => k + 1); }}
          colors={colors}
        />

        {!displayUri ? (
          <View style={[styles.placeholder, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Ionicons name="camera-outline" size={36} color={colors.border} />
            <Text style={[styles.placeholderText, { color: colors.textSec }]}>
              {cameraStatus === "connected" ? "Waiting for frame…" : "Camera feed will appear here"}
            </Text>
          </View>
        ) : (
          <View style={[styles.thermalWrap, { borderColor: colors.border }]}>
            <Image source={{ uri: displayUri }} style={{ width: MAP_W, height: MAP_H }} resizeMode="contain" fadeDuration={0} />
          </View>
        )}

        {cameraStatus === "connected" ? (
          <View style={[styles.controlPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modeRow}>
              {(["raw", "agc", "rgb"] as DisplayMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => handleSetMode(m)}
                  style={[
                    styles.modeTab,
                    { borderColor: displayMode === m ? colors.accent : colors.border },
                    displayMode === m && { backgroundColor: colors.accent },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modeTabText, { color: displayMode === m ? "#fff" : colors.textSec }]}>
                    {m === "raw" ? "16-bit RAW" : m === "agc" ? "8-bit AGC" : "24-bit RGB"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {displayMode === "rgb" ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteRow}>
                {PALETTES.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => handleSetPalette(p.id)}
                    style={[
                      styles.paletteChip,
                      { borderColor: palette === p.id ? colors.accent : colors.border },
                      palette === p.id && { backgroundColor: `${colors.accent}18` },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.paletteSwatch,
                      { backgroundColor: p.swatch },
                      p.id === "white_hot" && { borderWidth: 1, borderColor: colors.border },
                    ]} />
                    <Text style={[styles.paletteChipText, { color: palette === p.id ? colors.accent : colors.textSec }]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            <Text style={[styles.modeDesc, { color: colors.textSec }]}>
              {displayMode === "raw"
                ? "Full sensor range · linear grayscale · no clipping"
                : displayMode === "agc"
                  ? "Percentile-clipped grayscale · simulates camera AGC"
                  : PALETTES.find((p) => p.id === palette)?.desc ?? ""}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing["2xl"] },

  fpsTag:  { borderRadius: Radius.md, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  fpsText: { fontSize: 10, fontFamily: Typography.fonts.mono, letterSpacing: 0.5 },

  placeholder:     { width: MAP_W, height: MAP_H, borderWidth: 1.5, borderStyle: "dashed", borderRadius: Radius.lg, alignItems: "center", justifyContent: "center", gap: Spacing.sm, marginBottom: Spacing.md, alignSelf: "center" },
  placeholderText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, textAlign: "center" },

  thermalWrap: { borderRadius: Radius.lg, overflow: "hidden", borderWidth: 1, marginBottom: Spacing.md, alignSelf: "center", backgroundColor: "#000" },

  controlPanel: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: Spacing.md, gap: Spacing.xs },
  modeRow:      { flexDirection: "row", gap: Spacing.xs, alignItems: "center" },
  modeTab:      { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: Radius.sm, borderWidth: 1 },
  modeTabText:  { fontSize: 10, fontFamily: Typography.fonts.heading, letterSpacing: 0.5 },

  paletteRow:      { flexDirection: "row", gap: Spacing.xs, paddingVertical: 2 },
  paletteChip:     { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 4 },
  paletteSwatch:   { width: 10, height: 10, borderRadius: 5 },
  paletteChipText: { fontSize: 10, fontFamily: Typography.fonts.label },
  modeDesc:        { fontSize: 9, fontFamily: Typography.fonts.mono, lineHeight: 13 },
});
