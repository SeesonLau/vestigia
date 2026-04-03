// app/(clinic)/live-feed.tsx
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useThermalStore } from "../../store/sessionStore";
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
import Button from "../../components/ui/Button";
import { StatusIndicator } from "../../components/ui/index";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import {
  connectCamera,
  disconnectCamera,
  onFrame,
  onCameraConnected,
  onCameraDisconnected,
} from "../../lib/thermal/uvcCamera";
import { parseY16Frame, getMatrixStats } from "../../lib/thermal/preprocessing";

const { width: SCREEN_W } = Dimensions.get("window");
const MAP_W = SCREEN_W - Spacing.lg * 2 - 40;
const MAP_H = Math.round(MAP_W * (120 / 160)); // Lepton 3.5 — 160×120

type CameraStatus = "disconnected" | "connecting" | "connected" | "error";

export default function LiveFeedScreen() {
  const router = useRouter();
  const thermalStore = useThermalStore();

  //Camera state
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("disconnected");
  const [cameraError, setCameraError] = useState<string | null>(null);

  //Frame state
  const [matrix, setMatrix] = useState<number[][] | null>(null);
  const [minTemp, setMinTemp] = useState(0);
  const [maxTemp, setMaxTemp] = useState(0);
  const [meanTemp, setMeanTemp] = useState(0);
  const [fps, setFps] = useState(0);

  //UI state
  const [showGuide, setShowGuide] = useState(true);
  const [captured, setCaptured] = useState(false);
  const [capturedMatrix, setCapturedMatrix] = useState<number[][] | null>(null);
  const [selectedFoot, setSelectedFoot] = useState<"left" | "right" | "bilateral">("bilateral");

  //FPS tracking
  const frameTimestamps = useRef<number[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const capturedRef = useRef(false);

  //FPS calculator — rolling average over last 9 frames
  const computeFps = useCallback(() => {
    const now = Date.now();
    frameTimestamps.current.push(now);
    if (frameTimestamps.current.length > 9) frameTimestamps.current.shift();
    const oldest = frameTimestamps.current[0];
    const count = frameTimestamps.current.length;
    if (count > 1) {
      setFps(Math.round(((count - 1) / (now - oldest)) * 1000));
    }
  }, []);

  //Connect on mount
  useEffect(() => {
    let unsubFrame: (() => void) | null = null;
    let unsubConnect: (() => void) | null = null;
    let unsubDisconnect: (() => void) | null = null;

    async function setup() {
      setCameraStatus("connecting");
      setCameraError(null);

      unsubConnect = onCameraConnected(() => {
        setCameraStatus("connected");
      });

      unsubDisconnect = onCameraDisconnected(() => {
        setCameraStatus("disconnected");
        setMatrix(null);
        setFps(0);
        frameTimestamps.current = [];
      });

      unsubFrame = onFrame((base64) => {
        if (capturedRef.current) return;
        try {
          const parsed = parseY16Frame(base64);
          const stats = getMatrixStats(parsed);
          setMatrix(parsed);
          setMinTemp(stats.min);
          setMaxTemp(stats.max);
          setMeanTemp(stats.mean);
          computeFps();
        } catch (_) {
          // Drop malformed frames silently
        }
      });

      try {
        await connectCamera();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Camera connection failed";
        setCameraStatus("error");
        setCameraError(msg);
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

  //Capture
  const handleCapture = () => {
    if (!matrix) return;
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    setCapturedMatrix(matrix);
    capturedRef.current = true;
    setCaptured(true);
    thermalStore.setLiveFrame(matrix, minTemp, maxTemp, meanTemp);
    thermalStore.capture(selectedFoot);
  };

  const handleDiscard = () => {
    capturedRef.current = false;
    setCaptured(false);
    setCapturedMatrix(null);
    thermalStore.discardCapture();
  };

  //Status label
  const statusLabel =
    cameraStatus === "connected" ? "Camera Connected"
    : cameraStatus === "connecting" ? "Connecting..."
    : cameraStatus === "error" ? (cameraError ?? "Camera Error")
    : "Camera Disconnected";

  const statusType =
    cameraStatus === "connected" ? "connected"
    : cameraStatus === "connecting" ? "connecting"
    : "error";

  //Render
  return (
    <ScreenWrapper>
      <Header
        title="Live Thermal Feed"
        rightIcon={
          <View style={styles.fpsTag}>
            <Text style={styles.fpsText}>
              {cameraStatus === "connected" ? `${fps} fps` : "--"}
            </Text>
          </View>
        }
      />

      <View style={styles.container}>
        {/* Status bar */}
        <View style={styles.statusBar}>
          <StatusIndicator status={statusType} label={statusLabel} />
          <TouchableOpacity
            onPress={() => setShowGuide((v) => !v)}
            style={[styles.guideToggle, showGuide ? styles.guideToggleActive : undefined]}
            accessibilityLabel={showGuide ? "Hide foot position guides" : "Show foot position guides"}
            accessibilityRole="button"
          >
            <Text style={styles.guideToggleText}>Guides</Text>
          </TouchableOpacity>
        </View>

        {/* No camera state */}
        {cameraStatus !== "connected" && !captured && (
          <View style={styles.noCamera}>
            <Text style={styles.noCameraText}>
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
              captured ? styles.capturedFrame : undefined,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.thermalRow}>
              <View style={styles.mapWrapper}>
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
                  <View style={styles.capturedOverlay}>
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
          <Text style={styles.footLabel}>Capture Mode</Text>
          <View style={styles.footBtns}>
            {(["Left", "Right", "Bilateral"] as const).map((f) => {
              const val = f.toLowerCase() as "left" | "right" | "bilateral";
              const active = selectedFoot === val;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setSelectedFoot(val)}
                  style={[styles.footBtn, active ? styles.footBtnActive : undefined]}
                  activeOpacity={0.7}
                  disabled={captured}
                >
                  <Text style={[styles.footBtnText, active ? styles.footBtnTextActive : undefined]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Capture controls */}
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
                (cameraStatus !== "connected" || !matrix) && styles.captureBtnDisabled,
              ]}>
                <View style={styles.captureBtnInner} />
              </View>
              <Text style={styles.captureBtnLabel}>CAPTURE</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.postCaptureRow}>
              <Button label="Discard" onPress={handleDiscard} variant="ghost" size="md" style={styles.halfBtn} />
              <Button
                label="Use This Frame"
                onPress={() => router.push("/(clinic)/clinical-data")}
                variant="teal"
                size="md"
                style={styles.halfBtn}
              />
            </View>
          )}
        </View>

        {!captured && cameraStatus === "connected" && (
          <Text style={styles.hint}>
            Position both feet within the dashed guides, then tap Capture.
          </Text>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  fpsTag: {
    backgroundColor: Colors.bg.glassLight,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  fpsText: {
    fontSize: 10,
    fontFamily: Typography.fonts.mono,
    color: Colors.teal[300],
    letterSpacing: 0.5,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  guideToggle: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: "transparent",
  },
  guideToggleActive: {
    borderColor: Colors.teal[400],
    backgroundColor: "rgba(20,176,142,0.1)",
  },
  guideToggleText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.secondary,
  },
  noCamera: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  noCameraText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  thermalContainer: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.md,
  },
  capturedFrame: {
    borderColor: Colors.teal[400],
  },
  thermalRow: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#000",
  },
  mapWrapper: {
    position: "relative",
  },
  capturedOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(20,176,142,0.85)",
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  capturedLabel: {
    fontSize: 10,
    fontFamily: Typography.fonts.heading,
    color: "#fff",
    letterSpacing: 1.5,
  },
  footSelector: {
    marginBottom: Spacing.lg,
  },
  footLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  footBtns: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  footBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: "transparent",
  },
  footBtnActive: {
    borderColor: Colors.primary[400],
    backgroundColor: "rgba(0,128,200,0.1)",
  },
  footBtnText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
  },
  footBtnTextActive: { color: Colors.primary[300] },
  controls: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  captureBtn: {
    alignItems: "center",
  },
  captureBtnOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.primary[400],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
    shadowColor: Colors.primary[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  captureBtnDisabled: {
    borderColor: Colors.border.default,
    shadowOpacity: 0,
    elevation: 0,
  },
  captureBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary[500],
  },
  captureBtnLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.secondary,
    letterSpacing: 2,
  },
  postCaptureRow: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  halfBtn: { flex: 1 },
  hint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    textAlign: "center",
    lineHeight: 18,
  },
});
