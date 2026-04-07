// app/(clinic)/live-feed.tsx
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
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
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { getMatrixStats, parseCsvMatrix, parseY16Frame } from "../../lib/thermal/preprocessing";
import { thermalMatrixToPngB64 } from "../../lib/thermal/thermalPng";
import {
  connectCamera,
  disconnectCamera,
  onCameraConnected,
  onCameraDisconnected,
  onFrame,
} from "../../lib/thermal/uvcCamera";
import {
  connectWifi,
  disconnectWifi,
  onWifiFrame,
} from "../../lib/thermal/wifiCamera";
import { supabase } from "../../lib/supabase";
import { useDeviceStore, useThermalStore } from "../../store/sessionStore";

const { width: SCREEN_W } = Dimensions.get("window");
const MAP_W = SCREEN_W - Spacing.lg * 2 - 40;
const MAP_H = Math.round(MAP_W * (120 / 160));

type CameraStatus = "disconnected" | "connecting" | "connected" | "error";
type CaptureStep = "left" | "right";

type LastResult = {
  classification: "POSITIVE" | "NEGATIVE";
  confidence_score: number;
  angiosomes_flagged?: string[];
  sessionDate: string;
};

export default function LiveFeedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const thermalStore = useThermalStore();
  const { cameraSource, wifiIp, wifiPort } = useDeviceStore();
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

  //Bilateral capture steps
  const [captureStep, setCaptureStep] = useState<CaptureStep>("left");
  const [leftCaptured, setLeftCaptured] = useState(false);
  const [rightCaptured, setRightCaptured] = useState(false);

  //Last result panel
  const [lastResult, setLastResult] = useState<LastResult | null>(null);

  //Import
  const [importImageUri, setImportImageUri] = useState<string | null>(null);
  const [importImageName, setImportImageName] = useState<string | null>(null);
  const [importCsvName, setImportCsvName] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const frameTimestamps = useRef<number[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const capturedRef = useRef(false);

  const bothCaptured = leftCaptured && rightCaptured;

  //Reset import state between steps
  const resetImport = () => {
    setImportImageUri(null);
    setImportImageName(null);
    setImportCsvName(null);
  };

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

  //Camera setup — branches on active camera source
  useEffect(() => {
    setCameraStatus("connecting");
    setCameraError(null);
    frameTimestamps.current = [];

    if (cameraSource === "wifi") {
      if (!wifiIp) {
        setCameraStatus("error");
        setCameraError("No Wi-Fi IP configured. Set it in the Pairing screen.");
        return;
      }
      onWifiFrame((mat, min, max, mean) => {
        if (capturedRef.current) return;
        setMatrix(mat);
        setMinTemp(min);
        setMaxTemp(max);
        setMeanTemp(mean);
        computeFps();
      });
      connectWifi(
        wifiIp,
        wifiPort,
        () => setCameraStatus("connected"),
        () => {
          setCameraStatus("disconnected");
          setMatrix(null);
          setFps(0);
          frameTimestamps.current = [];
        },
      );
      return () => disconnectWifi();
    }

    //FLIR Lepton 3.5 — UVC via JST-SH → USB-C
    let unsubFrame: (() => void) | null = null;
    let unsubConnect: (() => void) | null = null;
    let unsubDisconnect: (() => void) | null = null;

    async function setupUvc() {
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

    setupUvc();
    return () => {
      unsubFrame?.();
      unsubConnect?.();
      unsubDisconnect?.();
      disconnectCamera();
    };
  }, [cameraSource, wifiIp, wifiPort]);

  //Build image b64 from matrix or imported file
  const getImageB64 = async (currentMatrix: number[][]): Promise<string> => {
    if (importImageUri) {
      try {
        return await FileSystem.readAsStringAsync(importImageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {
        // fall through to generated PNG
      }
    }
    return thermalMatrixToPngB64(currentMatrix, minTemp, maxTemp);
  };

  //Pulse animation helper
  const triggerPulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  //Capture live-camera frame for current step
  const handleCapture = async () => {
    if (!matrix) return;
    triggerPulse();
    const imageB64 = await getImageB64(matrix);

    if (captureStep === "left") {
      thermalStore.captureLeft(matrix, imageB64);
      thermalStore.setLiveFrame(matrix, minTemp, maxTemp, meanTemp);
      setLeftCaptured(true);
      setCaptureStep("right");
      capturedRef.current = false; // resume stream for right-foot positioning
      resetImport();
    } else {
      thermalStore.captureRight(matrix, imageB64);
      thermalStore.setLiveFrame(matrix, minTemp, maxTemp, meanTemp);
      thermalStore.capture("bilateral"); // keeps capturedMatrix for clinical-data Supabase insert
      setRightCaptured(true);
      capturedRef.current = true; // freeze feed — both feet captured
      resetImport();
    }
  };

  //Discard all captures and restart
  const handleDiscard = () => {
    capturedRef.current = false;
    setLeftCaptured(false);
    setRightCaptured(false);
    setCaptureStep("left");
    thermalStore.clearBilateral();
    thermalStore.discardCapture();
    resetImport();
  };

  //Import handlers
  const handlePickImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setImportImageUri(asset.uri);
    setImportImageName(asset.name);
  };

  const handlePickCsv = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/csv", "text/plain", "text/comma-separated-values", "*/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setImportLoading(true);
    try {
      const content = await fetch(asset.uri).then((r) => r.text());
      const parsed = parseCsvMatrix(content);
      const stats = getMatrixStats(parsed);
      setMatrix(parsed);
      setMinTemp(stats.min);
      setMaxTemp(stats.max);
      setMeanTemp(stats.mean);
      setImportCsvName(asset.name);
    } catch {
      Alert.alert("CSV Error", "Could not read temperature data. Ensure the file contains comma-separated °C values.");
    } finally {
      setImportLoading(false);
    }
  };

  //Use imported data for current capture step
  const handleUseImport = async () => {
    if (!matrix) return;
    triggerPulse();
    const imageB64 = await getImageB64(matrix);

    if (captureStep === "left") {
      thermalStore.captureLeft(matrix, imageB64);
      thermalStore.setLiveFrame(matrix, minTemp, maxTemp, meanTemp);
      setLeftCaptured(true);
      setCaptureStep("right");
      capturedRef.current = false;
      resetImport();
    } else {
      thermalStore.captureRight(matrix, imageB64);
      thermalStore.setLiveFrame(matrix, minTemp, maxTemp, meanTemp);
      thermalStore.capture("bilateral");
      setRightCaptured(true);
      capturedRef.current = true;
      resetImport();
    }
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
          <View style={[styles.fpsTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.fpsSource, { color: colors.textSec }]}>
              {cameraSource === "wifi" ? "ESP32" : "FLIR"}
            </Text>
            <Text style={[styles.fpsText, { color: colors.success }]}>
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
            style={[
              styles.guideToggle,
              { borderColor: colors.border },
              showGuide && { borderColor: colors.success, backgroundColor: `${colors.success}1A` },
            ]}
            accessibilityLabel={showGuide ? "Hide foot position guides" : "Show foot position guides"}
            accessibilityRole="button"
          >
            <Text style={[styles.guideToggleText, { color: colors.textSec }]}>Guides</Text>
          </TouchableOpacity>
        </View>

        {/* Bilateral capture step indicator */}
        <View style={[styles.stepRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <StepDot
            label="Left Foot"
            done={leftCaptured}
            active={!leftCaptured}
            colors={colors}
          />
          <View style={[styles.stepConnector, { backgroundColor: leftCaptured ? colors.success : colors.border }]} />
          <StepDot
            label="Right Foot"
            done={rightCaptured}
            active={leftCaptured && !rightCaptured}
            colors={colors}
          />
        </View>

        {/* No camera state */}
        {cameraStatus !== "connected" && !bothCaptured && (
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
        {matrix && (
          <Animated.View
            style={[
              styles.thermalContainer,
              { borderColor: bothCaptured ? colors.success : leftCaptured ? colors.warning : colors.border },
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.thermalRow}>
              <View style={styles.mapWrapper}>
                <ThermalMap
                  matrix={matrix}
                  minTemp={minTemp}
                  maxTemp={maxTemp}
                  width={MAP_W}
                  height={MAP_H}
                />
                {showGuide && !bothCaptured && (
                  <FootGuidanceOverlay width={MAP_W} height={MAP_H} />
                )}
                {/* Capture status overlay */}
                {leftCaptured && !rightCaptured && (
                  <View style={[styles.capturedOverlay, { backgroundColor: `${colors.warning}D9` }]}>
                    <Text style={styles.capturedLabel}>LEFT CAPTURED · POSITION RIGHT</Text>
                  </View>
                )}
                {bothCaptured && (
                  <View style={[styles.capturedOverlay, { backgroundColor: `${colors.success}D9` }]}>
                    <Text style={styles.capturedLabel}>BOTH FEET CAPTURED</Text>
                  </View>
                )}
              </View>
              <ThermalScale minTemp={minTemp} maxTemp={maxTemp} height={MAP_H} />
            </View>
            <ThermalAnnotation minTemp={minTemp} maxTemp={maxTemp} meanTemp={meanTemp} />
          </Animated.View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {!bothCaptured ? (
            <>
              <TouchableOpacity
                onPress={handleCapture}
                style={styles.captureBtn}
                activeOpacity={0.8}
                disabled={cameraStatus !== "connected" || !matrix}
              >
                <View style={[
                  styles.captureBtnOuter,
                  { borderColor: captureStep === "left" ? colors.accent : colors.warning },
                  (cameraStatus !== "connected" || !matrix) && { borderColor: colors.border, elevation: 0 },
                ]}>
                  <View style={[
                    styles.captureBtnInner,
                    { backgroundColor: captureStep === "left" ? colors.accent : colors.warning },
                  ]} />
                </View>
                <Text style={[styles.captureBtnLabel, { color: colors.textSec }]}>
                  CAPTURE {captureStep.toUpperCase()}
                </Text>
              </TouchableOpacity>
              {leftCaptured && (
                <TouchableOpacity
                  onPress={handleDiscard}
                  style={styles.discardLink}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.discardLinkText, { color: colors.textSec }]}>Restart both captures</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.postCaptureRow}>
              <Button label="Discard All" onPress={handleDiscard} variant="ghost" size="md" style={styles.halfBtn} />
              <Button
                label="Continue"
                onPress={() => router.push("/(clinic)/clinical-data")}
                variant="teal"
                size="md"
                style={styles.halfBtn}
              />
            </View>
          )}
        </View>

        {!bothCaptured && cameraStatus === "connected" && (
          <Text style={[styles.hint, { color: colors.textSec }]}>
            {captureStep === "left"
              ? "Position the LEFT foot within the guides, then tap Capture."
              : "Left foot captured. Now position the RIGHT foot and tap Capture."}
          </Text>
        )}

        {/* Import from files (hidden once both captured) */}
        {!bothCaptured && (
          <View style={[styles.importSection, { borderColor: colors.border }]}>
            <View style={styles.importDivider}>
              <View style={[styles.importLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.importDividerText, { color: colors.textSec }]}>or import from files</Text>
              <View style={[styles.importLine, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.importRow}>
              {/* Image picker */}
              <TouchableOpacity
                onPress={handlePickImage}
                style={[styles.importCard, { backgroundColor: colors.surface, borderColor: importImageName ? colors.accent : colors.border }]}
                activeOpacity={0.7}
              >
                <Ionicons name="image-outline" size={22} color={importImageName ? colors.accent : colors.textSec} />
                <Text style={[styles.importCardTitle, { color: importImageName ? colors.accent : colors.text }]}>
                  Thermal Image
                </Text>
                {importImageUri && (
                  <Image source={{ uri: importImageUri }} style={styles.importThumb} resizeMode="cover" />
                )}
                <Text style={[styles.importCardFile, { color: colors.textSec }]} numberOfLines={1}>
                  {importImageName ?? "JPG / PNG"}
                </Text>
                {importImageName && (
                  <TouchableOpacity
                    onPress={() => { setImportImageUri(null); setImportImageName(null); }}
                    style={styles.importClear}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Ionicons name="close-circle" size={16} color={colors.textSec} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* CSV picker */}
              <TouchableOpacity
                onPress={handlePickCsv}
                style={[styles.importCard, { backgroundColor: colors.surface, borderColor: importCsvName ? colors.success : colors.border }]}
                activeOpacity={0.7}
                disabled={importLoading}
              >
                <Ionicons name="document-text-outline" size={22} color={importCsvName ? colors.success : colors.textSec} />
                <Text style={[styles.importCardTitle, { color: importCsvName ? colors.success : colors.text }]}>
                  Temperature CSV
                </Text>
                <Text style={[styles.importCardFile, { color: colors.textSec }]} numberOfLines={1}>
                  {importLoading ? "Parsing…" : (importCsvName ?? "Comma-separated °C")}
                </Text>
                {importCsvName && (
                  <TouchableOpacity
                    onPress={() => { setImportCsvName(null); setMatrix(null); }}
                    style={styles.importClear}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Ionicons name="close-circle" size={16} color={colors.textSec} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* Use imported data CTA (visible when CSV loaded) */}
            {importCsvName && matrix && (
              <TouchableOpacity
                onPress={handleUseImport}
                style={[styles.importCta, { backgroundColor: captureStep === "left" ? colors.accent : colors.warning }]}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.importCtaText}>
                  Use as {captureStep === "left" ? "Left" : "Right"} Foot
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Last session result panel */}
        {lastResult && (
          <View style={[styles.resultPanel, isPositive ? styles.resultPositive : styles.resultNegative]}>
            <View style={styles.resultHeader}>
              <View style={styles.resultTitleRow}>
                <Ionicons
                  name={isPositive ? "warning-outline" : "checkmark-circle-outline"}
                  size={16}
                  color={isPositive ? "#f87171" : colors.success}
                />
                <Text style={[styles.resultTitle, { color: isPositive ? "#f87171" : colors.success }]}>
                  {isPositive ? "DPN Indicators Detected" : "No DPN Indicators"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLastResult(null)} accessibilityLabel="Dismiss result">
                <Ionicons name="close-outline" size={18} color={colors.textSec} />
              </TouchableOpacity>
            </View>
            <View style={styles.resultMeta}>
              <Text style={[styles.resultMetaText, { color: colors.textSec }]}>
                {(lastResult.confidence_score * 100).toFixed(1)}% confidence
              </Text>
              {lastResult.angiosomes_flagged && lastResult.angiosomes_flagged.length > 0 && (
                <>
                  <Text style={[styles.resultMetaDot, { color: colors.textSec }]}>·</Text>
                  <Text style={[styles.resultMetaText, { color: colors.textSec }]}>
                    Flagged: {lastResult.angiosomes_flagged.join(", ")}
                  </Text>
                </>
              )}
            </View>
            <Text style={[styles.resultDate, { color: colors.textSec }]}>
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

//Step dot sub-component
function StepDot({
  label,
  done,
  active,
  colors,
}: {
  label: string;
  done: boolean;
  active: boolean;
  colors: import("../../constants/theme").ThemeColors;
}) {
  const dotColor = done ? colors.success : active ? colors.accent : colors.border;
  return (
    <View style={stepStyles.container}>
      <View style={[stepStyles.dot, { borderColor: dotColor, backgroundColor: done ? dotColor : "transparent" }]}>
        {done && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={[stepStyles.label, { color: done ? colors.success : active ? colors.text : colors.textSec }]}>
        {label}
      </Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: { alignItems: "center", gap: 4 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  fpsTag: {
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    alignItems: "center",
  },
  fpsSource: { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 0.5, textTransform: "uppercase" },
  fpsText: { fontSize: 10, fontFamily: Typography.fonts.mono, letterSpacing: 0.5 },
  statusBar: { flexDirection: "row", alignItems: "center", gap: Spacing.lg, marginBottom: Spacing.md },
  guideToggle: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  guideToggleText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label },

  //Step indicator
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    gap: Spacing.lg,
  },
  stepConnector: { flex: 1, height: 2, borderRadius: 1 },

  noCamera: { alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xl, paddingVertical: Spacing["3xl"] },
  noCameraText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", lineHeight: 22 },
  thermalContainer: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  thermalRow: { flexDirection: "row", alignItems: "stretch", backgroundColor: "#000" },
  mapWrapper: { position: "relative" },
  capturedOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  capturedLabel: { fontSize: 10, fontFamily: Typography.fonts.heading, color: "#fff", letterSpacing: 1.5 },
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
  discardLink: { marginTop: Spacing.sm },
  discardLinkText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, textDecorationLine: "underline" },
  postCaptureRow: { flexDirection: "row", gap: Spacing.md, width: "100%" },
  halfBtn: { flex: 1 },
  hint: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, textAlign: "center", lineHeight: 18, marginBottom: Spacing.md },

  //Import section
  importSection: { marginBottom: Spacing.lg },
  importDivider: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.md },
  importLine: { flex: 1, height: 1 },
  importDividerText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
  importRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
  importCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  importCardTitle: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.heading, textAlign: "center" },
  importCardFile: { fontSize: 10, fontFamily: Typography.fonts.mono, textAlign: "center" },
  importThumb: { width: "100%", height: 56, borderRadius: Radius.sm, marginTop: 2 },
  importClear: { position: "absolute", top: 6, right: 6 },
  importCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  importCtaText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading, color: "#fff" },

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
  resultMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  resultMetaText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono },
  resultMetaDot: {},
  resultDate: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
});
