// app/(offline)/live-feed.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import ThermalMap from "../../components/thermal/ThermalMap";
import {
  FootGuidanceOverlay,
  ThermalAnnotation,
  ThermalScale,
} from "../../components/thermal/index";
import { StatusIndicator } from "../../components/ui/index";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { getMatrixStats, parseY16Frame } from "../../lib/thermal/preprocessing";
import {
  connectCamera,
  disconnectCamera,
  onCameraConnected,
  onCameraDisconnected,
  onFrame,
} from "../../lib/thermal/uvcCamera";
import { useThermalStore } from "../../store/sessionStore";

const { width: SCREEN_W } = Dimensions.get("window");
const MAP_W = SCREEN_W - Spacing.lg * 2 - 40;
const MAP_H = Math.round(MAP_W * (120 / 160));

type CameraStatus = "disconnected" | "connecting" | "connected" | "error";

export default function OfflineLiveFeedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const thermalStore = useThermalStore();

  //Camera
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("disconnected");
  const [cameraError, setCameraError] = useState<string | null>(null);

  //Frame
  const [matrix, setMatrix] = useState<number[][] | null>(null);
  const [minTemp, setMinTemp] = useState(0);
  const [maxTemp, setMaxTemp] = useState(0);
  const [meanTemp, setMeanTemp] = useState(0);
  const [fps, setFps] = useState(0);

  //UI
  const [showGuide, setShowGuide] = useState(true);
  const [captured, setCaptured] = useState(false);
  const [capturedMatrix, setCapturedMatrix] = useState<number[][] | null>(null);
  const [capturedB64, setCapturedB64] = useState<string | null>(null);
  const [selectedFoot, setSelectedFoot] = useState<"left" | "right" | "bilateral">("bilateral");

  const frameTimestamps = useRef<number[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const capturedRef = useRef(false);
  const lastB64Ref = useRef<string | null>(null);

  const computeFps = useCallback(() => {
    const now = Date.now();
    frameTimestamps.current.push(now);
    if (frameTimestamps.current.length > 9) frameTimestamps.current.shift();
    const oldest = frameTimestamps.current[0];
    const count = frameTimestamps.current.length;
    if (count > 1) setFps(Math.round(((count - 1) / (now - oldest)) * 1000));
  }, []);

  useEffect(() => {
    let unsubFrame: (() => void) | null = null;
    let unsubConnect: (() => void) | null = null;
    let unsubDisconnect: (() => void) | null = null;

    async function setup() {
      setCameraStatus("connecting");
      unsubConnect = onCameraConnected(() => setCameraStatus("connected"));
      unsubDisconnect = onCameraDisconnected(() => {
        setCameraStatus("disconnected");
        setMatrix(null);
        setFps(0);
        frameTimestamps.current = [];
      });
      unsubFrame = onFrame((base64) => {
        lastB64Ref.current = base64;
        if (capturedRef.current) return;
        try {
          const parsed = parseY16Frame(base64);
          const stats = getMatrixStats(parsed);
          setMatrix(parsed);
          setMinTemp(stats.min);
          setMaxTemp(stats.max);
          setMeanTemp(stats.mean);
          computeFps();
        } catch (_) {}
      });
      try {
        await connectCamera();
      } catch (e: unknown) {
        setCameraStatus("error");
        setCameraError(e instanceof Error ? e.message : "Camera connection failed");
      }
    }

    setup();
    return () => {
      unsubFrame?.();
      unsubConnect?.();
      unsubDisconnect?.();
      disconnectCamera();
    };
  }, []);

  const handleCapture = () => {
    if (!matrix || !lastB64Ref.current) return;
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    capturedRef.current = true;
    setCaptured(true);
    setCapturedMatrix(matrix);
    setCapturedB64(lastB64Ref.current);
  };

  const handleDiscard = () => {
    capturedRef.current = false;
    setCaptured(false);
    setCapturedMatrix(null);
    setCapturedB64(null);
  };

  const handleUseFrame = () => {
    thermalStore.setLiveFrame(capturedMatrix!, minTemp, maxTemp, meanTemp);
    router.push({
      pathname: "/(offline)/save",
      params: {
        b64: capturedB64!,
        foot: selectedFoot,
        minTemp: String(minTemp),
        maxTemp: String(maxTemp),
        meanTemp: String(meanTemp),
      },
    } as any);
  };

  const statusLabel =
    cameraStatus === "connected" ? "Camera Connected"
    : cameraStatus === "connecting" ? "Connecting..."
    : cameraStatus === "error" ? (cameraError ?? "Camera Error")
    : "Camera Disconnected";

  const statusType =
    cameraStatus === "connected" ? "connected"
    : cameraStatus === "connecting" ? "connecting"
    : "error";

  return (
    <ScreenWrapper>
      <Header
        title="Offline Capture"
        leftIcon={
          <TouchableOpacity onPress={() => router.replace("/mode-select" as any)}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
        rightIcon={
          <View style={[styles.fpsTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.fpsText, { color: colors.success }]}>
              {cameraStatus === "connected" ? `${fps} fps` : "--"}
            </Text>
          </View>
        }
      />

      <View style={styles.container}>
        <View style={styles.statusBar}>
          <StatusIndicator status={statusType} label={statusLabel} />
          <TouchableOpacity
            onPress={() => setShowGuide((v) => !v)}
            style={[
              styles.guideToggle,
              { borderColor: colors.border },
              showGuide && { borderColor: colors.success, backgroundColor: `${colors.success}1A` },
            ]}
            accessibilityLabel={showGuide ? "Hide guides" : "Show guides"}
            accessibilityRole="button"
          >
            <Text style={[styles.guideToggleText, { color: colors.textSec }]}>Guides</Text>
          </TouchableOpacity>
        </View>

        {/* No camera state */}
        {cameraStatus !== "connected" && !captured && (
          <View style={styles.noCamera}>
            <Ionicons name="camera-outline" size={48} color={colors.textSec} style={{ marginBottom: Spacing.md }} />
            <Text style={[styles.noCameraText, { color: colors.textSec }]}>
              {cameraStatus === "connecting"
                ? "Waiting for PureThermal camera…\nPlug in via JST-SH → USB-C"
                : cameraStatus === "error"
                ? `${cameraError}\n\nPlug in the PureThermal and reopen this screen.`
                : "Camera disconnected.\nPlug in the PureThermal to begin."}
            </Text>
          </View>
        )}

        {/* Thermal viewer */}
        {(matrix || capturedMatrix) && (
          <Animated.View
            style={[
              styles.thermalContainer,
              { borderColor: captured ? colors.success : colors.border },
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.thermalRow}>
              <View>
                <ThermalMap
                  matrix={captured ? capturedMatrix! : matrix!}
                  minTemp={minTemp}
                  maxTemp={maxTemp}
                  width={MAP_W}
                  height={MAP_H}
                />
                {showGuide && !captured && (
                  <FootGuidanceOverlay width={MAP_W} height={MAP_H} />
                )}
                {captured && (
                  <View style={[styles.capturedOverlay, { backgroundColor: `${colors.success}D9` }]}>
                    <Text style={styles.capturedLabel}>CAPTURED</Text>
                  </View>
                )}
              </View>
              <ThermalScale minTemp={minTemp} maxTemp={maxTemp} height={MAP_H} />
            </View>
            <ThermalAnnotation minTemp={minTemp} maxTemp={maxTemp} meanTemp={meanTemp} />
          </Animated.View>
        )}

        {/* Foot selector */}
        <View style={styles.footSelector}>
          <Text style={[styles.footLabel, { color: colors.textSec }]}>Capture Mode</Text>
          <View style={styles.footBtns}>
            {(["Left", "Right", "Bilateral"] as const).map((f) => {
              const val = f.toLowerCase() as "left" | "right" | "bilateral";
              const active = selectedFoot === val;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setSelectedFoot(val)}
                  style={[
                    styles.footBtn,
                    { borderColor: active ? colors.accent : colors.border },
                    active && { backgroundColor: `${colors.accent}1A` },
                  ]}
                  activeOpacity={0.7}
                  disabled={captured}
                >
                  <Text style={[styles.footBtnText, { color: active ? colors.accent : colors.textSec }]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {!captured ? (
            <TouchableOpacity
              onPress={handleCapture}
              style={styles.captureBtn}
              activeOpacity={0.8}
              disabled={cameraStatus !== "connected" || !matrix}
            >
              <View style={[
                styles.captureBtnOuter,
                { borderColor: (cameraStatus !== "connected" || !matrix) ? colors.border : colors.accent },
              ]}>
                <View style={[
                  styles.captureBtnInner,
                  { backgroundColor: (cameraStatus !== "connected" || !matrix) ? colors.border : colors.accent },
                ]} />
              </View>
              <Text style={[styles.captureBtnLabel, { color: colors.textSec }]}>CAPTURE</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.postCaptureRow}>
              <TouchableOpacity
                onPress={handleDiscard}
                style={[styles.discardBtn, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.discardText, { color: colors.textSec }]}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUseFrame}
                style={[styles.saveBtn, { backgroundColor: colors.success }]}
                activeOpacity={0.8}
              >
                <Text style={styles.saveText}>Save Offline</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!captured && cameraStatus === "connected" && (
          <Text style={[styles.hint, { color: colors.textSec }]}>
            Position both feet within the dashed guides, then tap Capture.
          </Text>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  fpsTag: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  fpsText: { fontSize: 10, fontFamily: Typography.fonts.mono },
  statusBar: { flexDirection: "row", alignItems: "center", gap: Spacing.lg, marginBottom: Spacing.md },
  guideToggle: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  guideToggleText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label },
  noCamera: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xl },
  noCameraText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", lineHeight: 22 },
  thermalContainer: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  thermalRow: { flexDirection: "row", alignItems: "stretch", backgroundColor: "#000" },
  capturedOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  capturedLabel: { fontSize: 10, fontFamily: Typography.fonts.heading, color: "#fff", letterSpacing: 1.5 },
  footSelector: { marginBottom: Spacing.lg },
  footLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  footBtns: { flexDirection: "row", gap: Spacing.sm },
  footBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  footBtnText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body },
  controls: { alignItems: "center", marginBottom: Spacing.md },
  captureBtn: { alignItems: "center" },
  captureBtnOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
    elevation: 8,
  },
  captureBtnInner: { width: 52, height: 52, borderRadius: 26 },
  captureBtnLabel: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.heading, letterSpacing: 2 },
  postCaptureRow: { flexDirection: "row", gap: Spacing.md, width: "100%" },
  discardBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  discardText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.label },
  saveBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  saveText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.label, color: "#fff" },
  hint: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, textAlign: "center", lineHeight: 18 },
});
