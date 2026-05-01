// app/(clinic)/bundle-detail.tsx
import { useLocalSearchParams } from "expo-router"
import React from "react"
import BundleDetailScreen from "../../components/thermal/BundleDetailScreen"

export default function ClinicBundleDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  return <BundleDetailScreen bundleCode={code ?? ""} />
}
