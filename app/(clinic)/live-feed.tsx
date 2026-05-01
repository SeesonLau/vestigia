// app/(clinic)/live-feed.tsx
import { useRouter } from "expo-router"
import React from "react"
import ThermalLiveFeedScreen from "../../components/thermal/ThermalLiveFeedScreen"
import type { ThermalCaptureResult, CaptureStep, Foot } from "../../components/thermal/ThermalLiveFeedScreen"
import { useThermalStore } from "../../store/sessionStore"

export default function ClinicLiveFeedScreen() {
  const router = useRouter()
  const thermalStore = useThermalStore()

  const handleCapture = async (result: ThermalCaptureResult, step: CaptureStep, _foot: Foot) => {
    const rawB64       = result.rawImageUri.replace("data:image/jpeg;base64,", "")
    const processedB64 = result.displayPngUri.replace("data:image/png;base64,", "")
    const isolatedB64  = result.isolatedPngUri.replace("data:image/png;base64,", "")
    if (step === "left") {
      thermalStore.captureLeft([] as number[][], rawB64, processedB64, isolatedB64, result.maskedCsvContent, result.stats)
      thermalStore.setLiveFrame([] as number[][], result.stats.min, result.stats.max, result.stats.mean)
    } else {
      thermalStore.captureRight([] as number[][], rawB64, processedB64, isolatedB64, result.maskedCsvContent, result.stats)
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
