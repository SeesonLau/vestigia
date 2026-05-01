// app/(patient)/bundle-detail.tsx
import { useLocalSearchParams, useRouter } from "expo-router"
import React from "react"
import BundleDetailScreen from "../../components/thermal/BundleDetailScreen"

export default function PatientBundleDetailScreen() {
  const router = useRouter()
  const { code } = useLocalSearchParams<{ code: string }>()
  return (
    <BundleDetailScreen
      bundleCode={code ?? ""}
      onViewCsv={(side) => router.push(`/(patient)/csv-viewer?code=${code}&side=${side}` as any)}
    />
  )
}
