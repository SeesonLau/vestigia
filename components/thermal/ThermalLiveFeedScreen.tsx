// components/thermal/ThermalLiveFeedScreen.tsx
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "expo-router"
import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Alert, Animated, Dimensions, Image, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native"
import { useThermalStore } from "../../store/sessionStore"
import { ROI_MIN_W, useRoiStore } from "../../store/roiStore"
import Header from "../layout/Header"
import ScreenWrapper from "../layout/ScreenWrapper"
import CameraStatusPanel from "./CameraStatusPanel"
import FootFrameOverlay from "./FootFrameOverlay"
import Button from "../ui/Button"
import { useTheme } from "../../constants/ThemeContext"
import { Radius, Spacing, Typography } from "../../constants/theme"
import { processFrames } from "../../lib/thermal/captureProcessor"
import type { ProcessedCapture } from "../../lib/thermal/captureProcessor"
import { cropCsvText } from "../../store/roiStore"
import {
  clearStatsRoi as clearStatsRoiNative,
  connectCamera, disconnectCamera,
  onCameraConnected, onCameraDisconnected, onCameraFormats, onDisplayFrame,
  onFrameStats,
  pauseCamera, resumeCamera,
  setDisplayMode as setDisplayModeNative,
  setLiveProcessing as setLiveProcessingNative,
  setPalette as setPaletteNative,
  setStatsRoi as setStatsRoiNative,
} from "../../lib/thermal/uvcCamera"
import type { DisplayMode, FrameStats, MeasurementParams, PaletteType } from "../../lib/thermal/uvcCamera"
import { PALETTES } from "../../lib/thermal/palettes"
import {
  EMISSIVITY_MAX, EMISSIVITY_MIN, MEASUREMENT_PARAM_DEFAULTS,
  REFLECTED_MAX, REFLECTED_MIN,
  loadMeasurementParams, saveMeasurementParams,
} from "../../lib/thermal/measurementParams"
import ReadinessIndicator from "./ReadinessIndicator"

const { width: SCREEN_W } = Dimensions.get("window")
const MAP_W = SCREEN_W - Spacing.lg * 2
const MAP_H = Math.round(MAP_W * (120 / 160))

export { PALETTES }

type CameraStatus = "disconnected" | "connecting" | "connected" | "error"
export type Foot = "left" | "right" | "bilateral"
export type CaptureStep = "left" | "right" | "single"
export type { ProcessedCapture as ThermalCaptureResult }

interface Props {
  /** bilateral = clinic two-step; single = patient/offline one-step */
  captureMode: "bilateral" | "single"
  title?: string
  /** Called immediately after each successful processCapture. Parent updates store here. */
  onCapture: (result: ProcessedCapture, step: CaptureStep, foot: Foot) => Promise<void>
  /** Called when user taps Continue (bilateral) or Save (single). Parent navigates here. */
  onAllDone: () => void
  /** Called when user taps Discard. Parent resets store here. */
  onDiscard: () => void
  headerLeft?: React.ReactNode
  extraHeaderRight?: React.ReactNode
}

export default function ThermalLiveFeedScreen({
  captureMode, title = "Thermal Live Capture",
  onCapture, onAllDone, onDiscard,
  headerLeft, extraHeaderRight,
}: Props) {
  const { colors } = useTheme()

  //Camera
  const [cameraStatus,     setCameraStatus]     = useState<CameraStatus>("disconnected")
  const [cameraError,      setCameraError]       = useState<string | null>(null)
  const [supportedFormats, setSupportedFormats]  = useState("")
  const [retryKey,         setRetryKey]          = useState(0)
  const [fps,              setFps]               = useState(0)
  const [displayUri,       setDisplayUri]        = useState<string | null>(null)

  //Display controls
  const [displayMode,  setDisplayMode]  = useState<DisplayMode>("rgb")
  const [palette,      setPalette]      = useState<PaletteType>("medical")
  const [cameraPaused, setCameraPaused] = useState(false)

  //Single capture-mode toggle. false (default) = Raw: native 160×120 with
  //zero processing; true = Enhanced: 320×240 bilinear upscale + median + EMA
  //+ CLAHE + unsharp on both the live preview and the captured artifacts.
  const [captureEnhanced, setCaptureEnhanced] = useState<boolean>(false)

  //Crosshair overlay mode (radio-style). "off" hides it; "hot" / "cold" show
  //one crosshair at the hottest / coldest pixel; "all" shows hot + cold +
  //mean simultaneously.
  type CrosshairMode = "off" | "hot" | "cold" | "all"
  const [crosshairMode, setCrosshairMode] = useState<CrosshairMode>("off")

  //Capture
  const [captureStep,   setCaptureStep]   = useState<"left" | "right">("left")
  const [leftCaptured,  setLeftCaptured]  = useState(false)
  const [rightCaptured, setRightCaptured] = useState(false)
  const [foot,          setFoot]          = useState<Foot>("left")
  const [capturing,     setCapturing]     = useState(false)
  const [allDone,       setAllDone]       = useState(false)

  //Settings sheet
  const [showSettings, setShowSettings] = useState(false)
  const [sheetView,    setSheetView]    = useState<"uvc" | "measurement">("uvc")

  //Radiometric correction parameters — persisted per-device. Loaded once on
  //mount and re-pushed to native every time the camera connects.
  const [measurement, setMeasurement] = useState<MeasurementParams>(MEASUREMENT_PARAM_DEFAULTS)
  const [emissivityDraft,  setEmissivityDraft]  = useState<string>(MEASUREMENT_PARAM_DEFAULTS.emissivity.toFixed(2))
  const [reflectedDraft,   setReflectedDraft]   = useState<string>(MEASUREMENT_PARAM_DEFAULTS.reflectedTempC.toFixed(1))
  useEffect(() => {
    let cancelled = false
    loadMeasurementParams().then((p) => {
      if (cancelled) return
      setMeasurement(p)
      setEmissivityDraft(p.emissivity.toFixed(2))
      setReflectedDraft(p.reflectedTempC.toFixed(1))
    })
    return () => { cancelled = true }
  }, [])
  const persistMeasurement = async (p: MeasurementParams) => {
    const clamped = await saveMeasurementParams(p)
    setMeasurement(clamped)
    setEmissivityDraft(clamped.emissivity.toFixed(2))
    setReflectedDraft(clamped.reflectedTempC.toFixed(1))
  }

  //Suppress ScrollView vertical scrolling while the user is dragging the
  //foot-frame overlay. Without this, after a few pixels of finger movement
  //the parent ScrollView's responder takes over and stops the box mid-drag.
  const [overlayDragging, setOverlayDragging] = useState(false)

  //Foot-framing rectangle
  const roiRect       = useRoiStore((s) => s.rect)
  const roiLocked     = useRoiStore((s) => s.locked)
  const roiVisible    = useRoiStore((s) => s.visible)
  const isolatedBg    = useRoiStore((s) => s.isolatedBg)
  const setRoiLocked  = useRoiStore((s) => s.setLocked)
  const setRoiVisible = useRoiStore((s) => s.setVisible)
  const setIsolatedBg = useRoiStore((s) => s.setIsolatedBg)
  const resetRoi      = useRoiStore((s) => s.reset)
  const roiTooSmall = roiRect.w < ROI_MIN_W + 0.005

  //Readiness + crosshair stats from native (per frame).
  const ZERO_STATS: FrameStats = {
    variance: 0, frameDiff: 0, frameIndex: 0,
    hotX: 0,  hotY: 0,  hotTemp: 0,
    coldX: 0, coldY: 0, coldTemp: 0,
    meanTemp: 0,
  }
  const [readiness, setReadiness] = useState<FrameStats>(ZERO_STATS)

  //Reset local capture UI whenever this screen regains focus and the thermal
  //store no longer holds any capture (i.e. the parent cleared it after a save).
  //Without this, returning to live-feed after a save keeps the stale "Discard /
  //Continue" prompt and last-foot thumbnail.
  const leftStatsForFocus  = useThermalStore((s) => s.leftStats)
  const rightStatsForFocus = useThermalStore((s) => s.rightStats)
  useFocusEffect(
    useCallback(() => {
      if (leftStatsForFocus === null && rightStatsForFocus === null) {
        setCaptureStep("left")
        setLeftCaptured(false)
        setRightCaptured(false)
        setFoot("left")
        setAllDone(false)
        setCapturing(false)
        //Drop the stale last frame so the user doesn't see a frozen
        //image while waiting for new frames to arrive.
        setDisplayUri(null)
        capturedRef.current = false
        //Force a fresh camera connection so frames start streaming again
        //(otherwise we're still on the post-capture pause from the prior
        //session and the live feed stays frozen).
        setRetryKey((k) => k + 1)
      }
    }, [leftStatsForFocus, rightStatsForFocus]),
  )

  const frameTimestamps = useRef<number[]>([])
  const pulseAnim       = useRef(new Animated.Value(1)).current
  const capturedRef     = useRef(false)

  const bothCaptured = leftCaptured && rightCaptured

  const computeFps = useCallback(() => {
    const now = Date.now()
    frameTimestamps.current.push(now)
    if (frameTimestamps.current.length > 9) frameTimestamps.current.shift()
    const oldest = frameTimestamps.current[0]
    const count  = frameTimestamps.current.length
    if (count > 1) setFps(Math.round(((count - 1) / (now - oldest)) * 1000))
  }, [])

  //Camera lifecycle
  useEffect(() => {
    setCameraStatus("connecting")
    setCameraError(null)
    setSupportedFormats("")
    setCameraPaused(false)
    frameTimestamps.current = []

    let unsubDisplay:    (() => void) | null = null
    let unsubConnect:    (() => void) | null = null
    let unsubDisconnect: (() => void) | null = null
    let unsubStats:      (() => void) | null = null

    async function setup() {
      unsubConnect    = onCameraConnected(() => setCameraStatus("connected"))
      unsubDisconnect = onCameraDisconnected(() => {
        setCameraStatus("disconnected")
        setDisplayUri(null)
        setFps(0)
        frameTimestamps.current = []
        setReadiness(ZERO_STATS)
      })
      const unsubFormats = onCameraFormats(setSupportedFormats)
      unsubDisplay = onDisplayFrame((jpegB64) => {
        if (capturedRef.current) return
        setDisplayUri("data:image/jpeg;base64," + jpegB64)
        computeFps()
      })
      unsubStats = onFrameStats((s) => setReadiness(s))
      try {
        await connectCamera()
      } catch (e: unknown) {
        setCameraStatus("error")
        setCameraError(e instanceof Error ? e.message : "Camera connection failed")
        unsubDisconnect?.()
        unsubDisconnect = null
      }
      return () => unsubFormats()
    }

    const cleanup = setup()
    return () => {
      cleanup.then((fn) => fn?.())
      unsubDisplay?.()
      unsubConnect?.()
      unsubDisconnect?.()
      unsubStats?.()
      disconnectCamera()
    }
  }, [retryKey])

  //Handlers
  const handleSetMode = async (mode: DisplayMode) => {
    setDisplayMode(mode)
    try { await setDisplayModeNative(mode) } catch {}
  }

  const handleSetPalette = async (p: PaletteType) => {
    setPalette(p)
    try { await setPaletteNative(p) } catch {}
  }

  const handleSetCaptureEnhanced = async (enhanced: boolean) => {
    setCaptureEnhanced(enhanced)
    try { await setLiveProcessingNative(enhanced) } catch {}
  }

  //Re-sync native flags + measurement parameters whenever the camera
  //reconnects (the volatiles reset on the native side, so non-default JS
  //state needs to be re-applied after a reconnect).
  useEffect(() => {
    if (cameraStatus === "connected") {
      setLiveProcessingNative(captureEnhanced).catch(() => {})
      saveMeasurementParams(measurement).catch(() => {})
    }
  }, [cameraStatus, captureEnhanced, measurement])

  // Constrain the on-screen crosshair scan to the framing rectangle when
  // it's visible, so hot/cold/mean markers stay inside the user's ROI.
  // Falls back to whole-frame scanning when the rect is hidden.
  useEffect(() => {
    if (cameraStatus !== "connected") return
    if (roiVisible) {
      setStatsRoiNative(roiRect.x, roiRect.y, roiRect.w, roiRect.h).catch(() => {})
    } else {
      clearStatsRoiNative().catch(() => {})
    }
  }, [cameraStatus, roiVisible, roiRect.x, roiRect.y, roiRect.w, roiRect.h])

  const handleToggleCamera = async () => {
    const pausing = !cameraPaused
    setCameraPaused(pausing)
    try {
      if (pausing) await pauseCamera()
      else         await resumeCamera()
    } catch { setCameraPaused(!pausing) }
  }

  const triggerPulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start()
  }

  const handleCapture = async () => {
    if (!displayUri || capturing || cameraPaused) return
    triggerPulse()
    setCapturing(true)

    const isBilateral = captureMode === "bilateral"
    const step: CaptureStep = isBilateral ? captureStep : "single"
    const footArg: Foot     = isBilateral ? (captureStep as Foot) : foot

    try {
      //Pass ROI + isolated-bg + scale + feedMode to native. The native
      //processor runs the configurable pipeline (average → median → optional
      //bilinear upscale → palette → isolation) and returns the slot artifacts
      //already cropped to the framing rect when one is supplied. CSVs come
      //back full-frame at the working resolution; we crop them on the JS
      //side so the cell coordinates stay aligned with the cropped images.
      const cropArg = roiVisible ? roiRect : null
      const result = await processFrames({
        crop: cropArg,
        isolatedBg,
        enhanced: captureEnhanced,
      })
      const finalResult: ProcessedCapture = cropArg
        ? {
            ...result,
            csvContent:       cropCsvText(result.csvContent,       cropArg),
            maskedCsvContent: cropCsvText(result.maskedCsvContent, cropArg),
          }
        : result
      await onCapture(finalResult, step, footArg)

      if (isBilateral) {
        if (captureStep === "left") {
          setLeftCaptured(true)
          setCaptureStep("right")
          capturedRef.current = false
        } else {
          setRightCaptured(true)
          capturedRef.current = true
          setAllDone(true)
        }
      } else {
        capturedRef.current = true
        setAllDone(true)
      }
    } catch (err) {
      Alert.alert("Capture Failed", err instanceof Error ? err.message : "Processing error")
      capturedRef.current = false
    } finally {
      setCapturing(false)
    }
  }

  const handleDiscard = () => {
    capturedRef.current = false
    setLeftCaptured(false)
    setRightCaptured(false)
    setCaptureStep("left")
    setAllDone(false)
    onDiscard()
  }

  const liveResLabel = captureEnhanced ? "320×240" : "160×120"
  const enhancementChain = captureEnhanced ? "median · EMA · CLAHE · unsharp" : "raw"
  const frameDebug = displayUri
    ? `Y16→${displayMode.toUpperCase()}${displayMode === "rgb" ? ` · ${palette}` : ""} · ${liveResLabel} · ${enhancementChain}`
    : ""

  //Disable capture when the framing rectangle is collapsed below the
  //minimum usable size (the model needs enough pixels post-resample).
  const captureDisabled = cameraStatus !== "connected" || !displayUri || capturing || cameraPaused || (roiVisible && roiTooSmall)
  const captureColor = captureMode === "bilateral" && captureStep === "right" ? colors.warning : colors.accent

  return (
    <ScreenWrapper>
      <Header
        title={title}
        leftIcon={headerLeft}
        rightIcon={
          <View style={styles.headerRight}>
            {extraHeaderRight}
            <TouchableOpacity onPress={() => setShowSettings(true)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="settings-outline" size={20} color={colors.textSec} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!overlayDragging}
      >
        <CameraStatusPanel
          status={cameraStatus}
          cameraError={cameraError}
          fps={fps}
          frameWarning={false}
          supportedFormats={supportedFormats}
          frameDebug={frameDebug}
          onRetry={() => { disconnectCamera(); setRetryKey((k) => k + 1) }}
          colors={colors}
        />

        {/* Capture readiness indicator — shown only while camera is live and capture not yet done */}
        {cameraStatus === "connected" && !allDone && !cameraPaused && (
          <ReadinessIndicator readiness={readiness} colors={colors} />
        )}

        {/* Bilateral step indicator */}
        {captureMode === "bilateral" && (
          <View style={[styles.stepRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <StepDot label="Left Foot"  done={leftCaptured}  active={!leftCaptured} colors={colors} />
            <View style={[styles.stepLine, { backgroundColor: leftCaptured ? colors.success : colors.border }]} />
            <StepDot label="Right Foot" done={rightCaptured} active={leftCaptured && !rightCaptured} colors={colors} />
          </View>
        )}

        {/* Thermal display */}
        {!displayUri ? (
          <View style={[styles.placeholder, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Ionicons name="camera-outline" size={36} color={colors.border} />
            <Text style={[styles.placeholderText, { color: colors.textSec }]}>
              {cameraStatus === "connected" ? "Waiting for frame…" : "Camera feed will appear here"}
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.thermalWrap,
              { borderColor: bothCaptured ? colors.success : leftCaptured ? colors.warning : colors.border },
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Image source={{ uri: displayUri }} style={{ width: MAP_W, height: MAP_H }} resizeMode="contain" fadeDuration={0} />
            <CrosshairOverlay
              mode={crosshairMode}
              stats={readiness}
              width={MAP_W}
              height={MAP_H}
            />
            {!allDone && (
              <FootFrameOverlay
                frameWidth={MAP_W}
                frameHeight={MAP_H}
                onInteractionChange={setOverlayDragging}
              />
            )}
            {cameraPaused && (
              <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                <Ionicons name="pause-circle-outline" size={36} color="#fff" />
                <Text style={styles.overlayLabel}>PAUSED</Text>
              </View>
            )}
            {leftCaptured && !rightCaptured && captureMode === "bilateral" && (
              <View style={[styles.badgeOverlay, { backgroundColor: `${colors.warning}D9` }]}>
                <Text style={styles.badgeText}>LEFT CAPTURED · POSITION RIGHT</Text>
              </View>
            )}
            {bothCaptured && (
              <View style={[styles.badgeOverlay, { backgroundColor: `${colors.success}D9` }]}>
                <Text style={styles.badgeText}>BOTH FEET CAPTURED</Text>
              </View>
            )}
            {captureMode === "single" && allDone && (
              <View style={[styles.badgeOverlay, { backgroundColor: `${colors.success}D9` }]}>
                <Text style={styles.badgeText}>CAPTURED</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Foot-frame controls — lock / hide / reset the rectangle */}
        {cameraStatus === "connected" && !allDone && (
          <View style={[styles.roiBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.roiHint, { color: roiTooSmall ? colors.error : colors.textSec }]}>
              {!roiVisible
                ? "Frame hidden"
                : roiTooSmall
                  ? "Frame too small for accurate analysis"
                  : roiLocked
                    ? "Frame locked"
                    : "Pinch to resize · drag to position"}
            </Text>
            <View style={styles.roiBtnRow}>
              <RoiBtn
                icon={roiLocked ? "lock-closed" : "lock-open-outline"}
                active={roiLocked}
                onPress={() => setRoiLocked(!roiLocked)}
                colors={colors}
                accessibilityLabel={roiLocked ? "Unlock frame" : "Lock frame"}
              />
              <RoiBtn
                icon={roiVisible ? "eye-outline" : "eye-off-outline"}
                active={!roiVisible}
                onPress={() => setRoiVisible(!roiVisible)}
                colors={colors}
                accessibilityLabel={roiVisible ? "Hide frame" : "Show frame"}
              />
              <RoiBtn
                icon="refresh-outline"
                onPress={resetRoi}
                colors={colors}
                accessibilityLabel="Reset frame"
              />
              <RoiBtn
                icon={isolatedBg === "black" ? "square" : "ellipse-outline"}
                active={isolatedBg === "black"}
                onPress={() => setIsolatedBg(isolatedBg === "black" ? "transparent" : "black")}
                colors={colors}
                accessibilityLabel={
                  isolatedBg === "black"
                    ? "Isolated image: black background (tap for transparent)"
                    : "Isolated image: transparent background (tap for black)"
                }
              />
            </View>
          </View>
        )}

        {/* Control panel: mode tabs + camera toggle + palette */}
        {cameraStatus === "connected" && (
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
              <TouchableOpacity
                onPress={handleToggleCamera}
                style={[
                  styles.camToggle,
                  { borderColor: cameraPaused ? colors.error : colors.success },
                  cameraPaused && { backgroundColor: `${colors.error}15` },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cameraPaused ? "videocam-off-outline" : "videocam-outline"}
                  size={18}
                  color={cameraPaused ? colors.error : colors.success}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  //Hard refresh: drop the stale frame, disconnect, and
                  //bump the retryKey so the camera lifecycle effect
                  //re-runs from scratch.
                  setDisplayUri(null)
                  capturedRef.current = false
                  setReadiness(ZERO_STATS)
                  disconnectCamera()
                  setRetryKey((k) => k + 1)
                }}
                style={[styles.camToggle, { borderColor: colors.accent }]}
                activeOpacity={0.7}
                accessibilityLabel="Refresh camera"
              >
                <Ionicons name="refresh-outline" size={18} color={colors.accent} />
              </TouchableOpacity>
            </View>

            {displayMode === "rgb" && (
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
            )}

            <Text style={[styles.modeDesc, { color: colors.textSec }]}>
              {displayMode === "raw"
                ? "Full sensor range · linear grayscale · no clipping"
                : displayMode === "agc"
                ? "Percentile-clipped grayscale · simulates camera AGC"
                : PALETTES.find((p) => p.id === palette)?.desc ?? ""}
            </Text>
          </View>
        )}

        {/* Single mode: foot selector */}
        {captureMode === "single" && !allDone && (
          <View style={styles.footRow}>
            {(["Left", "Right"] as const).map((f) => {
              const val = f.toLowerCase() as Foot
              const active = foot === val
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFoot(val)}
                  style={[
                    styles.footBtn,
                    { borderColor: active ? colors.accent : colors.border },
                    active && { backgroundColor: `${colors.accent}1A` },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.footBtnText, { color: active ? colors.accent : colors.textSec }]}>{f}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Capture options — single Raw/Enhanced toggle + crosshair selector.
            Hidden once both feet are captured (allDone). */}
        {!allDone && (
          <View style={[styles.captureOptsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.captureOptsRow}>
              <Text style={[styles.captureOptsLabel, { color: colors.textSec }]}>MODE</Text>
              <View style={styles.captureOptsSeg}>
                {([
                  [false, "Raw"],
                  [true,  "Enhanced"],
                ] as const).map(([val, label]) => {
                  const active = captureEnhanced === val
                  return (
                    <TouchableOpacity
                      key={String(val)}
                      onPress={() => handleSetCaptureEnhanced(val)}
                      style={[
                        styles.captureOptsSegBtn,
                        { backgroundColor: active ? colors.accent : "transparent" },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.captureOptsSegText, { color: active ? "#fff" : colors.textSec }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <View style={styles.captureOptsRow}>
              <Text style={[styles.captureOptsLabel, { color: colors.textSec }]}>SPOTS</Text>
              <View style={styles.captureOptsSeg}>
                {([
                  ["off",  "Off"],
                  ["hot",  "Hot"],
                  ["cold", "Cold"],
                  ["all",  "All 3"],
                ] as const).map(([val, label]) => {
                  const active = crosshairMode === val
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setCrosshairMode(val)}
                      style={[
                        styles.captureOptsSegBtn,
                        { backgroundColor: active ? colors.accent : "transparent" },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.captureOptsSegText, { color: active ? "#fff" : colors.textSec }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <Text style={[styles.captureOptsHint, { color: colors.textSec }]}>
              {captureEnhanced
                ? "Enhanced · 320×240 + median · EMA · CLAHE · unsharp"
                : "Raw · native 160×120, no processing"}
            </Text>
          </View>
        )}

        {/* Capture / post-capture */}
        <View style={styles.controls}>
          {!allDone ? (
            <>
              <TouchableOpacity
                onPress={handleCapture}
                style={styles.captureBtn}
                activeOpacity={0.8}
                disabled={captureDisabled}
              >
                <View style={[
                  styles.captureBtnOuter,
                  { borderColor: captureDisabled ? colors.border : captureColor, elevation: captureDisabled ? 0 : 8 },
                ]}>
                  <View style={[
                    styles.captureBtnInner,
                    { backgroundColor: captureDisabled ? colors.border : captureColor },
                  ]} />
                </View>
                <Text style={[styles.captureBtnLabel, { color: colors.textSec }]}>
                  {capturing ? "PROCESSING…"
                    : cameraPaused ? "PAUSED"
                    : captureMode === "bilateral" ? `CAPTURE ${captureStep.toUpperCase()}`
                    : "CAPTURE"}
                </Text>
              </TouchableOpacity>
              {leftCaptured && captureMode === "bilateral" && (
                <TouchableOpacity onPress={handleDiscard} style={styles.discardLink} activeOpacity={0.7}>
                  <Text style={[styles.discardLinkText, { color: colors.textSec }]}>Restart both captures</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.postRow}>
              <Button label="Discard" onPress={handleDiscard} variant="ghost" size="md" style={styles.halfBtn} />
              <Button
                label={captureMode === "bilateral" ? "Continue" : "Save"}
                onPress={onAllDone}
                variant="teal"
                size="md"
                style={styles.halfBtn}
              />
            </View>
          )}
        </View>

        {!allDone && cameraStatus === "connected" && !cameraPaused && (
          <Text style={[styles.hint, { color: colors.textSec }]}>
            {captureMode === "bilateral"
              ? captureStep === "left"
                ? "Frame the LEFT foot inside the rectangle, then tap Capture."
                : "Left foot captured. Frame the RIGHT foot inside the rectangle."
              : "Frame the foot inside the rectangle, then tap Capture."}
          </Text>
        )}
      </ScrollView>

      {/* Settings bottom sheet */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowSettings(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Camera Settings</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={22} color={colors.textSec} />
            </TouchableOpacity>
          </View>

          {/* Paged view toggle */}
          <View style={[styles.sheetTabs, { backgroundColor: colors.surface }]}>
            {([
              ["uvc",         "UVC Parameters"],
              ["measurement", "Measurement"],
            ] as const).map(([val, label]) => {
              const active = sheetView === val
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => setSheetView(val)}
                  style={[styles.sheetTabBtn, active && { backgroundColor: colors.accent }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sheetTabText, { color: active ? "#fff" : colors.textSec }]}>{label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {sheetView === "uvc" ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSec }]}>UVC PARAMETERS</Text>
              {([
                ["Packets Per Request",  "4"],
                ["Active URBs",          "4"],
                ["Max Packet Size",      "1,024 bytes"],
                ["Frame Size",           "160 × 120 × 2 = 38,400 bytes"],
                ["Camera Format Index",  "2  (Y16 radiometric)"],
                ["Camera Frame Index",   "1"],
                ["Image Size",           "160 × 120 px"],
                ["Frame Interval",       "1,111,111 μs  (9 fps)"],
              ] as [string, string][]).map(([label, value]) => (
                <View key={label} style={[styles.paramRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.paramLabel, { color: colors.textSec }]}>{label}</Text>
                  <Text style={[styles.paramValue, { color: colors.text }]}>{value}</Text>
                </View>
              ))}

              <Text style={[styles.sectionLabel, { color: colors.textSec, marginTop: Spacing.md }]}>CONNECTION</Text>
              <View style={[styles.connBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.connText, { color: colors.textSec }]}>
                  Status:{" "}
                  <Text style={{ color: cameraStatus === "connected" ? colors.success : cameraStatus === "error" ? colors.error : colors.warning }}>
                    {cameraStatus.toUpperCase()}
                  </Text>
                </Text>
                {supportedFormats.length > 0 && (
                  <Text style={[styles.connText, { color: colors.textSec }]} numberOfLines={2}>{supportedFormats}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.reconnectBtn, { backgroundColor: colors.accent }]}
                onPress={() => { setShowSettings(false); disconnectCamera(); setRetryKey((k) => k + 1) }}
              >
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={styles.reconnectText}>Reconnect Camera</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSec }]}>MEASUREMENT</Text>
              <Text style={[styles.measurementHelp, { color: colors.textSec }]}>
                Applied to live preview AND captured artifacts. Defaults are tuned
                for skin against typical clinic ambient.
              </Text>

              <View style={styles.measurementRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.measurementLabel, { color: colors.textSec }]}>Emissivity (ε)</Text>
                  <Text style={[styles.measurementHint,  { color: colors.textSec }]}>
                    {EMISSIVITY_MIN.toFixed(2)} – {EMISSIVITY_MAX.toFixed(2)}; skin ≈ 0.98
                  </Text>
                </View>
                <TextInput
                  value={emissivityDraft}
                  onChangeText={setEmissivityDraft}
                  onBlur={() => {
                    const v = parseFloat(emissivityDraft)
                    if (!Number.isFinite(v)) {
                      setEmissivityDraft(measurement.emissivity.toFixed(2))
                      return
                    }
                    persistMeasurement({ ...measurement, emissivity: v })
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  style={[styles.measurementInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                />
              </View>

              <View style={styles.measurementRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.measurementLabel, { color: colors.textSec }]}>Reflected Temp (°C)</Text>
                  <Text style={[styles.measurementHint,  { color: colors.textSec }]}>
                    {REFLECTED_MIN} – {REFLECTED_MAX}; ambient ≈ 22 °C
                  </Text>
                </View>
                <TextInput
                  value={reflectedDraft}
                  onChangeText={setReflectedDraft}
                  onBlur={() => {
                    const v = parseFloat(reflectedDraft)
                    if (!Number.isFinite(v)) {
                      setReflectedDraft(measurement.reflectedTempC.toFixed(1))
                      return
                    }
                    persistMeasurement({ ...measurement, reflectedTempC: v })
                  }}
                  keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                  selectTextOnFocus
                  style={[styles.measurementInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                />
              </View>

              <TouchableOpacity
                style={[styles.measurementResetBtn, { borderColor: colors.border }]}
                onPress={() => persistMeasurement(MEASUREMENT_PARAM_DEFAULTS)}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={14} color={colors.textSec} />
                <Text style={[styles.measurementResetText, { color: colors.textSec }]}>Reset to defaults</Text>
              </TouchableOpacity>

              <Text style={[styles.measurementApplied, { color: colors.success }]}>
                Active: ε = {measurement.emissivity.toFixed(2)} · T_refl = {measurement.reflectedTempC.toFixed(1)} °C
              </Text>
            </>
          )}
        </View>
      </Modal>
    </ScreenWrapper>
  )
}

// Crosshair overlay — absolute-positioned over the live preview Image,
// renders 1-3 markers at the per-frame hottest / coldest / mean spots.
// Coordinates from native are normalized [0..1] over the sensor matrix so
// they map cleanly to whatever pixel size the preview is currently rendered
// at (160x120 raw or 320x240 enhanced). The crosshair geometry: 16-px
// horizontal + vertical lines centered on the spot, plus a small temperature
// pill 14 px above the intersection.
function CrosshairOverlay({
  mode, stats, width, height,
}: {
  mode: "off" | "hot" | "cold" | "all"
  stats: {
    hotX: number; hotY: number; hotTemp: number
    coldX: number; coldY: number; coldTemp: number
    meanTemp: number
  }
  width: number
  height: number
}) {
  if (mode === "off") return null
  const showHot  = mode === "hot"  || mode === "all"
  const showCold = mode === "cold" || mode === "all"
  const showMean = mode === "all"
  return (
    <View pointerEvents="none" style={[crosshairStyles.layer, { width, height }]}>
      {showHot  ? <CrosshairMarker color="#FF3B30" x={stats.hotX  * width} y={stats.hotY  * height} label={`H ${stats.hotTemp.toFixed(1)}°`} /> : null}
      {showCold ? <CrosshairMarker color="#0A84FF" x={stats.coldX * width} y={stats.coldY * height} label={`C ${stats.coldTemp.toFixed(1)}°`} /> : null}
      {showMean ? <CrosshairMarker color="#FFFFFF" x={width / 2}            y={height / 2}             label={`μ ${stats.meanTemp.toFixed(1)}°`} dashed /> : null}
    </View>
  )
}

function CrosshairMarker({
  color, x, y, label, dashed,
}: { color: string; x: number; y: number; label: string; dashed?: boolean }) {
  const ARM = 14
  const borderStyle = dashed ? "dashed" : "solid"
  return (
    <>
      <View style={[crosshairStyles.hLine, { left: x - ARM, top: y - 0.5, width: ARM * 2, borderTopColor: color, borderStyle }]} />
      <View style={[crosshairStyles.vLine, { left: x - 0.5, top: y - ARM, height: ARM * 2, borderLeftColor: color, borderStyle }]} />
      <View style={[crosshairStyles.dot,   { left: x - 2,   top: y - 2,   backgroundColor: color }]} />
      <View style={[crosshairStyles.label, { left: x + 6,   top: y - 18,  borderColor: color }]}>
        <Text style={[crosshairStyles.labelText, { color }]}>{label}</Text>
      </View>
    </>
  )
}

const crosshairStyles = StyleSheet.create({
  layer:     { position: "absolute", top: 0, left: 0 },
  hLine:     { position: "absolute", height: 1, borderTopWidth: 1 },
  vLine:     { position: "absolute", width: 1,  borderLeftWidth: 1 },
  dot:       { position: "absolute", width: 4, height: 4, borderRadius: 2 },
  label:     { position: "absolute", paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.65)" },
  labelText: { fontSize: 9, fontFamily: Typography.fonts.mono, fontWeight: "bold" },
})

function RoiBtn({
  icon, active, onPress, colors, accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap
  active?: boolean
  onPress: () => void
  colors: import("../../constants/theme").ThemeColors
  accessibilityLabel: string
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.75}
      style={[
        roiBtnStyles.btn,
        {
          borderColor: active ? colors.accent : colors.border,
          backgroundColor: active ? `${colors.accent}1F` : "transparent",
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={active ? colors.accent : colors.textSec} />
    </TouchableOpacity>
  )
}

const roiBtnStyles = StyleSheet.create({
  btn: {
    width: 32, height: 32,
    borderRadius: Radius.full, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
})

function StepDot({ label, done, active, colors }: {
  label: string; done: boolean; active: boolean
  colors: import("../../constants/theme").ThemeColors
}) {
  const dotColor = done ? colors.success : active ? colors.accent : colors.border
  return (
    <View style={stepStyles.wrap}>
      <View style={[stepStyles.dot, { borderColor: dotColor, backgroundColor: done ? dotColor : "transparent" }]}>
        {done && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={[stepStyles.label, { color: done ? colors.success : active ? colors.text : colors.textSec }]}>
        {label}
      </Text>
    </View>
  )
}

const stepStyles = StyleSheet.create({
  wrap:  { alignItems: "center", gap: 4 },
  dot:   { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  label: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
})

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing["2xl"] },

  headerRight: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },

  stepRow:  { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: Radius.lg, borderWidth: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, gap: Spacing.lg },
  stepLine: { flex: 1, height: 2, borderRadius: 1 },

  placeholder:     { width: MAP_W, height: MAP_H, borderWidth: 1.5, borderStyle: "dashed", borderRadius: Radius.lg, alignItems: "center", justifyContent: "center", gap: Spacing.sm, marginBottom: Spacing.md, alignSelf: "center" },
  placeholderText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, textAlign: "center" },

  thermalWrap:  { borderRadius: Radius.lg, overflow: "hidden", borderWidth: 1, marginBottom: Spacing.md, alignSelf: "center", backgroundColor: "#000" },
  overlay:      { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 6 },
  overlayLabel: { fontSize: 12, fontFamily: Typography.fonts.heading, color: "#fff", letterSpacing: 3 },
  badgeOverlay: { position: "absolute", top: 8, right: 8, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText:    { fontSize: 10, fontFamily: Typography.fonts.heading, color: "#fff", letterSpacing: 1.5 },

  roiBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderRadius: Radius.lg,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  roiHint:   { fontSize: 11, fontFamily: Typography.fonts.body, flex: 1, marginRight: Spacing.sm },
  roiBtnRow: { flexDirection: "row", gap: 6 },

  controlPanel: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: Spacing.md, gap: Spacing.xs },
  modeRow:      { flexDirection: "row", gap: Spacing.xs, alignItems: "center" },
  modeTab:      { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: Radius.sm, borderWidth: 1 },
  modeTabText:  { fontSize: 10, fontFamily: Typography.fonts.heading, letterSpacing: 0.5 },
  camToggle:    { borderWidth: 1.5, borderRadius: Radius.sm, padding: 5, alignItems: "center", justifyContent: "center" },

  paletteRow:      { flexDirection: "row", gap: Spacing.xs, paddingVertical: 2 },
  paletteChip:     { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 4 },
  paletteSwatch:   { width: 10, height: 10, borderRadius: 5 },
  paletteChipText: { fontSize: 10, fontFamily: Typography.fonts.label },
  modeDesc:        { fontSize: 9, fontFamily: Typography.fonts.mono, lineHeight: 13 },

  footRow:     { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  footBtn:     { flex: 1, alignItems: "center", paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  footBtnText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body },

  captureOptsCard:    { borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: Spacing.md, gap: Spacing.xs },
  captureOptsRow:     { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  captureOptsLabel:   { fontSize: 10, fontFamily: Typography.fonts.heading, letterSpacing: 1.5, width: 50 },
  captureOptsSeg:     { flex: 1, flexDirection: "row", gap: Spacing.xs },
  captureOptsSegBtn:  { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: Radius.sm },
  captureOptsSegText: { fontSize: 10, fontFamily: Typography.fonts.heading, letterSpacing: 0.5 },
  captureOptsHint:    { fontSize: 9, fontFamily: Typography.fonts.mono, marginTop: Spacing.xs },

  controls:       { alignItems: "center", marginBottom: Spacing.md },
  captureBtn:     { alignItems: "center" },
  captureBtnOuter:{ width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: "center", justifyContent: "center", marginBottom: Spacing.xs },
  captureBtnInner:{ width: 52, height: 52, borderRadius: 26 },
  captureBtnLabel:{ fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.heading, letterSpacing: 2 },
  discardLink:    { marginTop: Spacing.sm },
  discardLinkText:{ fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, textDecorationLine: "underline" },
  postRow:        { flexDirection: "row", gap: Spacing.md, width: "100%" },
  halfBtn:        { flex: 1 },
  hint:           { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, textAlign: "center", lineHeight: 18, marginBottom: Spacing.md },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  // paddingBottom raised so the sheet clears the phone's system nav bar /
  // gesture bar; was 40 (overlapped on devices with thicker nav surfaces).
  sheet:    { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, paddingBottom: 64 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: Spacing.md },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  sheetTitle:  { fontSize: Typography.sizes.md, fontFamily: Typography.fonts.heading },
  sectionLabel:{ fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: Spacing.sm },

  paramRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  paramLabel: { fontSize: 11, fontFamily: Typography.fonts.body, flex: 1 },
  paramValue: { fontSize: 11, fontFamily: Typography.fonts.mono, textAlign: "right" },

  connBox:      { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, gap: 4, marginBottom: Spacing.sm },
  connText:     { fontSize: 11, fontFamily: Typography.fonts.mono },
  reconnectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: Spacing.md, borderRadius: Radius.md },
  reconnectText:{ fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading, color: "#fff" },

  sheetTabs:    { flexDirection: "row", borderRadius: Radius.md, padding: 3, marginBottom: Spacing.md, gap: 3 },
  sheetTabBtn:  { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: Radius.sm },
  sheetTabText: { fontSize: 11, fontFamily: Typography.fonts.heading, letterSpacing: 0.4 },

  measurementHelp:    { fontSize: 11, fontFamily: Typography.fonts.body, marginBottom: Spacing.sm, lineHeight: 15 },
  measurementRow:     { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: 8 },
  measurementLabel:   { fontSize: 12, fontFamily: Typography.fonts.heading },
  measurementHint:    { fontSize: 10, fontFamily: Typography.fonts.mono, marginTop: 2 },
  measurementInput:   { width: 90, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderRadius: Radius.sm, fontSize: 13, fontFamily: Typography.fonts.mono, textAlign: "right" },
  measurementResetBtn:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderWidth: 1, borderRadius: Radius.md, marginTop: Spacing.sm },
  measurementResetText:{ fontSize: 11, fontFamily: Typography.fonts.body },
  measurementApplied: { fontSize: 10, fontFamily: Typography.fonts.mono, textAlign: "center", marginTop: Spacing.sm },
})
