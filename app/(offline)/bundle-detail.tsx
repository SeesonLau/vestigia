// app/(offline)/bundle-detail.tsx
import { useLocalSearchParams, useRouter } from "expo-router"
import React from "react"
import BundleDetailScreen from "../../components/thermal/BundleDetailScreen"

export default function OfflineBundleDetailScreen() {
  const router = useRouter()
  const { code } = useLocalSearchParams<{ code: string }>()
  return (
    <BundleDetailScreen
      bundleCode={code ?? ""}
      onViewCsv={(side) => router.push(`/(offline)/csv-viewer?code=${code}&side=${side}` as any)}
    />
  )
}
