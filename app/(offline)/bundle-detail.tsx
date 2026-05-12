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
      // Always land back on Saved Bundles, regardless of whether the user
      // arrived from there, from a clinic/patient Local tab, or from the
      // post-save Alert that replaced the navigation stack.
      onBack={() => router.replace("/(offline)/history" as any)}
    />
  )
}
