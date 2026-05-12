// app/(clinic)/live-feed.tsx
import { useRouter } from "expo-router"
import React from "react"
import ThermalLiveFeedScreen from "../../components/thermal/ThermalLiveFeedScreen"
import type { ThermalCaptureResult, CaptureStep, Foot } from "../../components/thermal/ThermalLiveFeedScreen"
import { useThermalStore } from "../../store/sessionStore"

export default function ClinicLiveFeedScreen() {
  const router = useRouter()
  const thermalStore = useThermalStore()

  const stripDataUri = (uri: string | null) =>
    uri ? uri.replace(/^data:image\/[a-z]+;base64,/, "") : null

  const handleCapture = async (result: ThermalCaptureResult, step: CaptureStep, _foot: Foot) => {
    const slot1 = stripDataUri(result.slot1ImageUri) ?? ""
    const slot2 = stripDataUri(result.slot2ImageUri)
    const slot3 = stripDataUri(result.slot3ImageUri) ?? ""
    if (step === "left") {
      thermalStore.captureLeft([] as number[][], slot1, slot2, slot3, result.maskedCsvContent, result.stats)
      thermalStore.setLiveFrame([] as number[][], result.stats.min, result.stats.max, result.stats.mean)
    } else {
      thermalStore.captureRight([] as number[][], slot1, slot2, slot3, result.maskedCsvContent, result.stats)
      thermalStore.setLiveFrame([] as number[][], result.stats.min, result.stats.max, result.stats.mean)
    }
  }

  const handleAllDone = () => {
    router.replace("/(clinic)/patient-details" as any)
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
    />
  )
}
