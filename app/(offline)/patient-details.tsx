// app/(offline)/patient-details.tsx
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React from "react"
import { TouchableOpacity } from "react-native"
import PatientDetailsScreen from "../../components/thermal/PatientDetailsScreen"
import { useTheme } from "../../constants/ThemeContext"

export default function OfflinePatientDetailsScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  return (
    <PatientDetailsScreen
      returnRoute="/(offline)/live-feed"
      headerLeft={
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      }
    />
  )
}
