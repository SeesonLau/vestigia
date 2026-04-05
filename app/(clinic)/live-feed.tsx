// app/(clinic)/live-feed.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
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
import { getMatrixStats, parseY16Frame } from "../../lib/thermal/preprocessing";
import {
  connectCamera,
  disconnectCamera,
  onCameraConnected,
  onCameraDisconnected,
  onFrame,
} from "../../lib/thermal/uvcCamera";
import { supabase } from "../../lib/supabase";
import { useThermalStore } from "../../store/sessionStore";

const { width: SCREEN_W } = Dimensions.get("window");
const MAP_W = SCREEN_W - Spacing.lg * 2 - 40;
const MAP_H = Math.round(MAP_W * (120 / 160));

type CameraStatus = "disconnected" | "connecting" | "connected" | "error";

type LastResult = {
  classification: "POSITIVE" | "NEGATIVE";
  confidence_score: number;
  angiosomes_flagged?: string[];
  sessionDate: string;
};

export default function LiveFeedScreen() {
  const router = useRouter();
  const thermalStore = useThermalStore();
  const { lastSessionId } = useLocalSearchParams<{ lastSessionId?: string }>();

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
  const [selectedFoot, setSelectedFoot] = useState<"left" | "right" | "bilateral">("bilateral");

  //Last result panel
  const [lastResult, setLastResult] = useState<LastResult | null>(null);

  const frameTimestamps = useRef<number[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const capturedRef = useRef(false);

  //Fetch last session result once if navigated back from assessment
  useEffect(() => {
    if (!lastSessionId) return;
    supabase
      .from("screening_sessions")
      .select("started_at, classification:classification_results(classification, confidence_score, angiosomes_flagged)")
      .eq("id", lastSessionId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const raw = data as any;
        const cls = Array.isArray(raw.classification) ? raw.classification[0] : raw.classification;
        if (!cls) return;
        setLastResult({
          classification: cls.classification,
          confidence_score: cls.confidence_score,
          angiosomes_flagged: cls.angiosomes_flagged,
          sessionDate: raw.started_at,
        });
      });
  }, [lastSessionId]);

  const computeFps = useCallback(() => {
    const now = Date.now();
    frameTimestamps.current.push(now);
    if (frameTimestamps.current.length > 9) frameTimestamps.current.shift();
    const oldest = frameTimestamps.current[0];
    const count = frameTimestamps.current.length;
    if (count > 1) setFps(Math.round(((count - 1) / (now - oldest)) * 1000));
  }, []);

  //Camera setup
  useEffect(() => {
    let unsubFrame: (() => void) | null = null;
    let unsubConnect: (() => void) | null = null;
    let unsubDisconnect: (() => void) | null = null;

    async function setup() {
      setCameraStatus("connecting");
      setCameraError(null);
      unsubConnect = onCameraConnected(() => setCameraStatus("connected"));
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

  const statusLabel =
    cameraStatus === "connected" ? "Camera Connected"
    : cameraStatus === "connecting" ? "Connecting..."
    : cameraStatus === "error" ? (cameraError ?? "Camera Error")
    : "Camera Disconnected";

  const statusType =
    cameraStatus === "connected" ? "connected"
    : cameraStatus === "connecting" ? "connecting"
    : "error";

  const isPositive = lastResult?.classification === "POSITIVE";

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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status bar */}
        <View style={styles.statusBar}>
          <StatusIndicator status={statusType} label={statusLabel} />
          <TouchableOpacity
            onPress={() => setShowGuide((v) => !v)}
            style={[styles.guideToggle, showGuide && styles.guideToggleActive]}
            accessibilityLabel={showGuide ? "Hide foot position guides" : "Show foot position guides"}
            accessibilityRole="button"
          >
            <Text style={styles.guideToggleText}>Guides</Text>
          </TouchableOpacity>
        </View>

        {/* No camera state */}
        {cameraStatus !== "connected" && !captured && (
          <View style={styles.noCamera}>
            <Ionicons name="camera-outline" size={48} color={Colors.text.muted} style={{ marginBottom: Spacing.md }} />
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
              captured && styles.capturedFrame,
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
                  style={[styles.footBtn, active && styles.footBtnActive]}
                  activeOpacity={0.7}
                  disabled={captured}
                >
                  <Text style={[styles.footBtnText, active && styles.footBtnTextActive]}>{f}</Text>
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

        {/* Last session result panel */}
        {lastResult && (
          <View style={[styles.resultPanel, isPositive ? styles.resultPositive : styles.resultNegative]}>
            <View style={styles.resultHeader}>
              <View style={styles.resultTitleRow}>
                <Ionicons
                  name={isPositive ? "warning-outline" : "checkmark-circle-outline"}
                  size={16}
                  color={isPositive ? "#f87171" : Colors.teal[300]}
                />
                <Text style={[styles.resultTitle, isPositive ? styles.resultTitlePos : styles.resultTitleNeg]}>
                  {isPositive ? "DPN Indicators Detected" : "No DPN Indicators"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLastResult(null)} accessibilityLabel="Dismiss result">
                <Ionicons name="close-outline" size={18} color={Colors.text.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.resultMeta}>
              <Text style={styles.resultMetaText}>
                {(lastResult.confidence_score * 100).toFixed(1)}% confidence
              </Text>
              {lastResult.angiosomes_flagged && lastResult.angiosomes_flagged.length > 0 && (
                <>
                  <Text style={styles.resultMetaDot}>·</Text>
                  <Text style={styles.resultMetaText}>
                    Flagged: {lastResult.angiosomes_flagged.join(", ")}
                  </Text>
                </>
              )}
            </View>
            <Text style={styles.resultDate}>
              {new Date(lastResult.sessionDate).toLocaleString("en-PH", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  fpsTag: {
    backgroundColor: Colors.bg.glassLight,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  fpsText: { fontSize: 10, fontFamily: Typography.fonts.mono, color: Colors.teal[300], letterSpacing: 0.5 },
  statusBar: { flexDirection: "row", alignItems: "center", gap: Spacing.lg, marginBottom: Spacing.md },
  guideToggle: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  guideToggleActive: { borderColor: Colors.teal[400], backgroundColor: "rgba(20,176,142,0.1)" },
  guideToggleText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, color: Colors.text.secondary },
  noCamera: { alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xl, paddingVertical: Spacing["3xl"] },
  noCameraText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, color: Colors.text.muted, textAlign: "center", lineHeight: 22 },
  thermalContainer: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.md,
  },
  capturedFrame: { borderColor: Colors.teal[400] },
  thermalRow: { flexDirection: "row", alignItems: "stretch", backgroundColor: "#000" },
  mapWrapper: { position: "relative" },
  capturedOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(20,176,142,0.85)",
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  capturedLabel: { fontSize: 10, fontFamily: Typography.fonts.heading, color: "#fff", letterSpacing: 1.5 },
  footSelector: { marginBottom: Spacing.lg },
  footLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
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
    borderColor: Colors.border.default,
  },
  footBtnActive: { borderColor: Colors.primary[400], backgroundColor: "rgba(0,128,200,0.1)" },
  footBtnText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, color: Colors.text.muted },
  footBtnTextActive: { color: Colors.primary[300] },
  controls: { alignItems: "center", marginBottom: Spacing.md },
  captureBtn: { alignItems: "center" },
  captureBtnOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.primary[400],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
    elevation: 8,
  },
  captureBtnDisabled: { borderColor: Colors.border.default, elevation: 0 },
  captureBtnInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary[500] },
  captureBtnLabel: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.heading, color: Colors.text.secondary, letterSpacing: 2 },
  postCaptureRow: { flexDirection: "row", gap: Spacing.md, width: "100%" },
  halfBtn: { flex: 1 },
  hint: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, color: Colors.text.muted, textAlign: "center", lineHeight: 18, marginBottom: Spacing.md },
  //Last result panel
  resultPanel: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  resultPositive: { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)" },
  resultNegative: { backgroundColor: "rgba(20,176,142,0.08)", borderColor: "rgba(20,176,142,0.3)" },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resultTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  resultTitle: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading },
  resultTitlePos: { color: "#f87171" },
  resultTitleNeg: { color: Colors.teal[300] },
  resultMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  resultMetaText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono, color: Colors.text.muted },
  resultMetaDot: { color: Colors.text.muted },
  resultDate: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, color: Colors.text.muted },
});
