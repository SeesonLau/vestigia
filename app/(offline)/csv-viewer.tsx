// app/(offline)/csv-viewer.tsx
import { useLocalSearchParams } from "expo-router"
import React from "react"
import CsvViewerScreen from "../../components/thermal/CsvViewerScreen"

export default function OfflineCsvViewer() {
  const { code, side } = useLocalSearchParams<{ code: string; side: "left" | "right" }>()
  return <CsvViewerScreen bundleCode={code ?? ""} side={side ?? "left"} />
}
