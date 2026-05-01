// components/thermal/PatientDetailsScreen.tsx
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React, { useEffect, useRef, useState } from "react"
import {
  Alert, Animated, Dimensions, Image, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native"
import Header from "../layout/Header"
import ScreenWrapper from "../layout/ScreenWrapper"
import Button from "../ui/Button"
import { useTheme } from "../../constants/ThemeContext"
import { Radius, Spacing, Typography } from "../../constants/theme"
import type { ThemeColors } from "../../constants/theme"
import { saveBundle } from "../../lib/thermal/bundleStorage"
import {
  calculateAge, calculateBMI, bmiCategory,
  digitsToISO, fmtDateDigits,
} from "../../lib/thermal/bundleUtils"
import { useThermalStore } from "../../store/sessionStore"

const SCREEN_W = Dimensions.get("window").width
const THUMB_W  = (SCREEN_W - Spacing.lg * 2 - Spacing.md) / 2
const THUMB_H  = Math.round(THUMB_W * (120 / 160))

type Sex = "Male" | "Female"

interface FormState {
  firstName:      string
  middleName:     string
  lastName:       string
  sex:            Sex | ""
  birthdateDigits: string   // raw "MMDDYYYY"
  weightKg:       string
  heightCm:       string
}

interface Props {
  returnRoute: string
  headerLeft?: React.ReactNode
}

export default function PatientDetailsScreen({ returnRoute, headerLeft }: Props) {
  const router = useRouter()
  const { colors } = useTheme()
  const {
    leftRawB64, rightRawB64,
    leftProcessedB64, rightProcessedB64,
    leftIsolatedB64, rightIsolatedB64,
    leftCsvContent, rightCsvContent,
    leftStats, rightStats,
    capturedAt,
    clearBilateral,
  } = useThermalStore()

  const [form, setForm] = useState<FormState>({
    firstName: "", middleName: "", lastName: "",
    sex: "", birthdateDigits: "", weightKg: "", heightCm: "",
  })
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const update = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const setSex = (s: Sex) =>
    setForm((prev) => ({ ...prev, sex: prev.sex === s ? "" : s }))

  //Live preview calculations
  const isoDate = digitsToISO(form.birthdateDigits)
  const age     = isoDate ? calculateAge(isoDate) : null
  const weight  = parseFloat(form.weightKg)
  const height  = parseFloat(form.heightCm)
  const bmi     = (!isNaN(weight) && !isNaN(height) && weight > 0 && height > 0)
    ? calculateBMI(weight, height) : null

  function validate(): string | null {
    if (!form.firstName.trim()) return "First name is required."
    if (!form.lastName.trim())  return "Last name is required."
    if (!form.sex)              return "Sex is required."
    if (!isoDate)               return "Enter a valid birthdate (MM/DD/YYYY)."
    if (age === null || age < 0 || age > 120) return "Birthdate results in an invalid age."
    if (isNaN(weight) || weight <= 0) return "Enter a valid weight (kg)."
    if (isNaN(height) || height <= 0) return "Enter a valid height (cm)."
    if (!leftProcessedB64 || !rightProcessedB64) return "Both foot captures are required."
    if (!leftCsvContent || !rightCsvContent) return "Capture data is incomplete."
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setFormError(err); return }
    setFormError(null)
    setSaving(true)
    try {
      const at = capturedAt ?? new Date().toISOString()
      await saveBundle(
        {
          first_name:  form.firstName.trim(),
          middle_name: form.middleName.trim(),
          last_name:   form.lastName.trim(),
          gender:      form.sex as Sex,
          birthdate:   isoDate!,
          weight_kg:   weight,
          height_cm:   height,
        },
        { raw_image_b64: leftRawB64 ?? "",  processed_image_b64: leftProcessedB64!,  isolated_image_b64: leftIsolatedB64  ?? "", csv_content: leftCsvContent!,  stats: leftStats  ?? { min: 0, max: 0, mean: 0 } },
        { raw_image_b64: rightRawB64 ?? "", processed_image_b64: rightProcessedB64!, isolated_image_b64: rightIsolatedB64 ?? "", csv_content: rightCsvContent!, stats: rightStats ?? { min: 0, max: 0, mean: 0 } },
        at,
      )
      clearBilateral()
      Alert.alert(
        "Bundle Saved",
        "Thermal capture bundle saved to this device.",
        [{ text: "OK", onPress: () => router.replace(returnRoute as any) }],
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setFormError(`Save failed: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScreenWrapper>
      <Header
        title="Patient Details"
        leftIcon={headerLeft ?? (
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Capture thumbnails */}
          <View style={[styles.thumbRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <FootThumb label="Left Foot"  b64={leftProcessedB64}  stats={leftStats}  colors={colors} />
            <View style={[styles.thumbDivider, { backgroundColor: colors.border }]} />
            <FootThumb label="Right Foot" b64={rightProcessedB64} stats={rightStats} colors={colors} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <FloatInput label="First Name"   value={form.firstName}  onChangeText={update("firstName")}  colors={colors} />
            <FloatInput label="Middle Name"  value={form.middleName} onChangeText={update("middleName")} colors={colors} />
            <FloatInput label="Last Name"    value={form.lastName}   onChangeText={update("lastName")}   colors={colors} />

            {/* Sex */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.groupLabel, { color: colors.textSec }]}>Sex</Text>
              <View style={styles.sexRow}>
                {(["Male", "Female"] as Sex[]).map((s) => {
                  const active = form.sex === s
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setSex(s)}
                      style={[
                        styles.sexBtn,
                        { borderColor: active ? colors.accent : colors.border },
                        active && { backgroundColor: `${colors.accent}1A` },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.sexBtnText, { color: active ? colors.accent : colors.textSec }]}>{s}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <DateInput
              label="Birthdate"
              value={form.birthdateDigits}
              onChangeText={update("birthdateDigits")}
              colors={colors}
            />
            <FloatInput label="Weight (kg)" value={form.weightKg} onChangeText={update("weightKg")} keyboard="decimal-pad" colors={colors} />
            <FloatInput label="Height (cm)" value={form.heightCm} onChangeText={update("heightCm")} keyboard="decimal-pad" colors={colors} />

            {/* Live age / BMI preview */}
            {(age !== null || bmi !== null) && (
              <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {age !== null && (
                  <PreviewStat label="Age" value={`${age} yrs`} colors={colors} />
                )}
                {age !== null && bmi !== null && (
                  <View style={[styles.previewDivider, { backgroundColor: colors.border }]} />
                )}
                {bmi !== null && (
                  <PreviewStat label="BMI" value={`${bmi.toFixed(1)}  ·  ${bmiCategory(bmi)}`} colors={colors} />
                )}
              </View>
            )}
          </View>

          {formError && (
            <Text style={[styles.errorText, { color: colors.error }]}>{formError}</Text>
          )}

          <Button
            label="Save Bundle"
            onPress={handleSave}
            loading={saving}
            variant="teal"
            size="lg"
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  )
}

//FloatInput — standard floating label input
function FloatInput({
  label, value, onChangeText, keyboard, colors,
}: {
  label: string; value: string; onChangeText: (v: string) => void
  keyboard?: "numeric" | "decimal-pad"; colors: ThemeColors
}) {
  const [focused, setFocused] = useState(false)
  const anim = useRef(new Animated.Value(value !== "" ? 1 : 0)).current
  const isUp = focused || value !== ""

  useEffect(() => {
    Animated.timing(anim, { toValue: isUp ? 1 : 0, duration: 150, useNativeDriver: false }).start()
  }, [isUp])

  return (
    <View style={[floatStyles.container, { borderColor: focused ? colors.accent : colors.border, backgroundColor: colors.surface }]}>
      <Animated.Text
        style={[floatStyles.label, {
          top: anim.interpolate({ inputRange: [0, 1], outputRange: [19, 6] }),
          fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] }),
          color: focused ? colors.accent : colors.textSec,
        }]}
      >
        {label}
      </Animated.Text>
      <TextInput
        style={[floatStyles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={keyboard ?? "default"}
        autoCapitalize={keyboard ? "none" : "words"}
        returnKeyType="next"
      />
    </View>
  )
}

//DateInput — floating label input with MM/DD/YYYY auto-masking
function DateInput({
  label, value, onChangeText, colors,
}: {
  label: string; value: string; onChangeText: (digits: string) => void; colors: ThemeColors
}) {
  const [focused, setFocused] = useState(false)
  const anim    = useRef(new Animated.Value(value !== "" ? 1 : 0)).current
  const prevFmt = useRef(fmtDateDigits(value))
  const isUp    = focused || value !== ""

  useEffect(() => {
    Animated.timing(anim, { toValue: isUp ? 1 : 0, duration: 150, useNativeDriver: false }).start()
  }, [isUp])

  const handleChange = (text: string) => {
    const newDigits  = text.replace(/\D/g, "").slice(0, 8)
    const prevDisplay = prevFmt.current

    if (text.length < prevDisplay.length && newDigits === value) {
      // Backspace over an auto-inserted slash — remove last real digit too
      const reduced = value.slice(0, -1)
      onChangeText(reduced)
      prevFmt.current = fmtDateDigits(reduced)
    } else {
      onChangeText(newDigits)
      prevFmt.current = fmtDateDigits(newDigits)
    }
  }

  const displayed = fmtDateDigits(value)

  return (
    <View style={[floatStyles.container, { borderColor: focused ? colors.accent : colors.border, backgroundColor: colors.surface }]}>
      <Animated.Text
        style={[floatStyles.label, {
          top: anim.interpolate({ inputRange: [0, 1], outputRange: [19, 6] }),
          fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] }),
          color: focused ? colors.accent : colors.textSec,
        }]}
      >
        {label}
      </Animated.Text>
      <TextInput
        style={[floatStyles.input, { color: colors.text }]}
        value={displayed}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="numeric"
        returnKeyType="next"
        placeholder={focused ? "MM / DD / YYYY" : ""}
        placeholderTextColor={colors.textSec + "80"}
      />
    </View>
  )
}

//PreviewStat
function PreviewStat({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
  return (
    <View style={styles.previewStat}>
      <Text style={[styles.previewLabel, { color: colors.textSec }]}>{label}</Text>
      <Text style={[styles.previewValue, { color: colors.text }]}>{value}</Text>
    </View>
  )
}

//FootThumb
function FootThumb({
  label, b64, stats, colors,
}: {
  label: string; b64: string | null
  stats: { min: number; max: number; mean: number } | null; colors: ThemeColors
}) {
  return (
    <View style={styles.thumbCell}>
      <Text style={[styles.thumbLabel, { color: colors.textSec }]}>{label.toUpperCase()}</Text>
      {b64 ? (
        <Image
          source={{ uri: "data:image/png;base64," + b64 }}
          style={[styles.thumbImg, { borderColor: colors.border }]}
          resizeMode="contain"
          fadeDuration={0}
        />
      ) : (
        <View style={[styles.thumbImg, { borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }]}>
          <Ionicons name="image-outline" size={24} color={colors.border} />
        </View>
      )}
      {stats && (
        <Text style={[styles.thumbStats, { color: colors.textSec }]}>
          {stats.min.toFixed(1)}° – {stats.max.toFixed(1)}°  avg {stats.mean.toFixed(1)}°C
        </Text>
      )}
    </View>
  )
}

const floatStyles = StyleSheet.create({
  container: { height: 58, borderWidth: 1, borderRadius: Radius.md, position: "relative" },
  label: { position: "absolute", left: Spacing.md, fontFamily: Typography.fonts.body },
  input: {
    position: "absolute", left: 0, right: 0, bottom: 0, top: 0,
    paddingHorizontal: Spacing.md, paddingTop: 22, paddingBottom: 8,
    fontSize: Typography.sizes.base, fontFamily: Typography.fonts.body,
  },
})

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing["3xl"], gap: Spacing.lg },

  thumbRow:     { flexDirection: "row", borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.sm },
  thumbCell:    { flex: 1, alignItems: "center", gap: 4 },
  thumbDivider: { width: 1, marginHorizontal: Spacing.xs },
  thumbLabel:   { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1.5 },
  thumbImg:     { width: THUMB_W, height: THUMB_H, borderRadius: Radius.md, borderWidth: 1 },
  thumbStats:   { fontSize: 9, fontFamily: Typography.fonts.mono, textAlign: "center" },

  form:       { gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  groupLabel: { fontSize: 11, fontFamily: Typography.fonts.label, letterSpacing: 1, textTransform: "uppercase" },

  sexRow:     { flexDirection: "row", gap: Spacing.sm },
  sexBtn:     { flex: 1, alignItems: "center", paddingVertical: Spacing.sm + 2, borderRadius: Radius.md, borderWidth: 1 },
  sexBtnText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body },

  preview: {
    flexDirection: "row", borderWidth: 1, borderRadius: Radius.md,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  previewStat:    { flex: 1, alignItems: "center", gap: 2 },
  previewLabel:   { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 1, textTransform: "uppercase" },
  previewValue:   { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading },
  previewDivider: { width: 1, alignSelf: "stretch" },

  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center" },
  saveBtn:   { marginTop: Spacing.xs },
})
