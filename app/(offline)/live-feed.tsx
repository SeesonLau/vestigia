// app/(offline)/live-feed.tsx
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { TouchableOpacity } from "react-native"
import ThermalLiveFeedScreen from "../../components/thermal/ThermalLiveFeedScreen"
import type { ThermalCaptureResult, CaptureStep, Foot } from "../../components/thermal/ThermalLiveFeedScreen"
import { useTheme } from "../../constants/ThemeContext"
import { useThermalStore } from "../../store/sessionStore"

export default function OfflineLiveFeedScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const thermalStore = useThermalStore()

  const stripDataUri = (uri: string | null) =>
    uri ? uri.replace(/^data:image\/[a-z]+;base64,/, "") : null

  const handleCapture = async (result: ThermalCaptureResult, step: CaptureStep, _foot: Foot) => {
    const slot1 = stripDataUri(result.slot1ImageUri) ?? ""
    const slot2 = stripDataUri(result.slot2ImageUri)
    const slot3 = stripDataUri(result.slot3ImageUri) ?? ""
    if (step === "left") {
      thermalStore.captureLeft([] as number[][], slot1, slot2, slot3, result.maskedCsvContent, result.stats, result.feedMode)
      thermalStore.setLiveFrame([] as number[][], result.stats.min, result.stats.max, result.stats.mean)
    } else {
      thermalStore.captureRight([] as number[][], slot1, slot2, slot3, result.maskedCsvContent, result.stats, result.feedMode)
      thermalStore.setLiveFrame([] as number[][], result.stats.min, result.stats.max, result.stats.mean)
    }
  }

  const handleAllDone = () => {
    router.replace("/(offline)/patient-details" as any)
  }

  const handleDiscard = () => {
    thermalStore.clearBilateral()
  }

  return (
    <ThermalLiveFeedScreen
      captureMode="bilateral"
      title="Thermal Live Capture"
      onCapture={handleCapture}
      onAllDone={handleAllDone}
      onDiscard={handleDiscard}
      headerLeft={
        <TouchableOpacity onPress={() => router.replace("/mode-select" as any)}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      }
      extraHeaderRight={
        <TouchableOpacity onPress={() => router.push("/(offline)/history" as any)}>
          <Ionicons name="albums-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      }
    />
  )
}
