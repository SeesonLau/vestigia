// app/(clinic)/csv-viewer.tsx
import { useLocalSearchParams } from "expo-router"
import React from "react"
import CsvViewerScreen from "../../components/thermal/CsvViewerScreen"

export default function ClinicCsvViewer() {
  const { code, side } = useLocalSearchParams<{ code: string; side: "left" | "right" }>()
  return <CsvViewerScreen bundleCode={code ?? ""} side={side ?? "left"} />
}
