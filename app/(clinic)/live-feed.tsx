// app/(clinic)/live-feed.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import ThermalMap, {
  generateMockThermalMatrix,
} from "../../components/thermal/ThermalMap";
import {
  FootGuidanceOverlay,
  ThermalAnnotation,
  ThermalScale,
} from "../../components/thermal/index";
import Button from "../../components/ui/Button";
import { StatusIndicator } from "../../components/ui/index";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";

const { width: SCREEN_W } = Dimensions.get("window");
const MAP_W = SCREEN_W - Spacing.lg * 2 - 40; // leave room for scale
const MAP_H = Math.round(MAP_W * (62 / 80));

export default function LiveFeedScreen() {
  const router = useRouter();
  const thermalStore = useThermalStore();
  const [matrix, setMatrix] = useState(() => generateMockThermalMatrix());
  const [minTemp] = useState(29.5);
  const [maxTemp] = useState(36.8);
  const [meanTemp] = useState(33.2);
  const [fps] = useState(12);
  const [showGuide, setShowGuide] = useState(true);
  const [captured, setCaptured] = useState(false);
  const [capturedMatrix, setCapturedMatrix] = useState<number[][] | null>(null);
  const [selectedFoot, setSelectedFoot] = useState<"left" | "right" | "bilateral">("bilateral");

  // Simulate live frame updates
  useEffect(() => {
    if (captured) return;
    const interval = setInterval(() => {
      setMatrix(generateMockThermalMatrix());
    }, 100);
    return () => clearInterval(interval);
  }, [captured]);

  // Capture pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleCapture = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.08,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    setCapturedMatrix(matrix);
    setCaptured(true);
    thermalStore.setLiveFrame(matrix, minTemp, maxTemp, meanTemp);
    thermalStore.capture(selectedFoot);
  };

  const handleDiscard = () => {
    setCaptured(false);
    setCapturedMatrix(null);
    thermalStore.discardCapture();
  };

  return (
    <ScreenWrapper>
      <Header
        title="Live Thermal Feed"
        subtitle="UI-03"
        rightIcon={
          <View style={styles.fpsTag}>
            <Text style={styles.fpsText}>{fps} fps</Text>
          </View>
        }
      />

      <View style={styles.container}>
        {/* Status bar */}
        <View style={styles.statusBar}>
          <StatusIndicator status="connected" label="Wi-Fi Active" />
          <StatusIndicator status="connected" label="BLE Active" />
          <TouchableOpacity
            onPress={() => setShowGuide((v) => !v)}
            style={[
              styles.guideToggle,
              showGuide ? styles.guideToggleActive : undefined,
            ]}
          >
            <Text style={styles.guideToggleText}>Guides</Text>
          </TouchableOpacity>
        </View>

        {/* Thermal viewer */}
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
                matrix={captured ? capturedMatrix! : matrix}
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
          <ThermalAnnotation
            minTemp={minTemp}
            maxTemp={maxTemp}
            meanTemp={meanTemp}
          />
        </Animated.View>

        {/* Foot selector */}
        <View style={styles.footSelector}>
          <Text style={styles.footLabel}>Capture Mode</Text>
          <View style={styles.footBtns}>
            {(["Left", "Right", "Bilateral"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.footBtn,
                  f === "Bilateral" ? styles.footBtnActive : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.footBtnText,
                    f === "Bilateral" ? styles.footBtnTextActive : undefined,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Capture controls */}
        <View style={styles.controls}>
          {!captured ? (
            <TouchableOpacity
              onPress={handleCapture}
              style={styles.captureBtn}
              activeOpacity={0.8}
            >
              <View style={styles.captureBtnOuter}>
                <View style={styles.captureBtnInner} />
              </View>
              <Text style={styles.captureBtnLabel}>CAPTURE</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.postCaptureRow}>
              <Button
                label="Discard"
                onPress={handleDiscard}
                variant="ghost"
                size="md"
                style={styles.halfBtn}
              />
              <Button
                label="Use This Frame →"
                onPress={() => router.push("/(clinic)/clinical-data")}
                variant="teal"
                size="md"
                style={styles.halfBtn}
              />
            </View>
          )}
        </View>

        {/* Hint */}
        {!captured && (
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

  // Thermal viewer
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

  // Foot selector
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

  // Capture button
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
