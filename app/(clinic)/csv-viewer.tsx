// app/(clinic)/csv-viewer.tsx
import { useLocalSearchParams } from "expo-router";
import React from "react";
import OnlineCsvViewerScreen from "../../components/thermal/OnlineCsvViewerScreen";

export default function ClinicCsvViewer() {
  const { session_id, side } = useLocalSearchParams<{ session_id: string; side: "left" | "right" }>();
  return <OnlineCsvViewerScreen sessionId={session_id ?? ""} side={side ?? "left"} />;
}
