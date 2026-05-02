// app/(auth)/register.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { S } from "../../constants/strings";
import { useAuthStore } from "../../store/authStore";
import { Sex } from "../../types";

const SEX_OPTIONS: { value: Sex; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "male",   label: "Male",   icon: "male-outline" },
  { value: "female", label: "Female", icon: "female-outline" },
  { value: "other",  label: "Other",  icon: "person-outline" },
];

const isValidDob = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return false;
  //Reject obviously implausible dates
  const year = d.getFullYear();
  return year >= 1900 && d <= new Date();
};

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { registerPatient, error: storeError, clearError } = useAuthStore();

  //Identity
  const [firstName, setFirstName]   = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName]     = useState("");
  const [sex, setSex]               = useState<Sex | null>(null);
  const [dateOfBirth, setDob]       = useState("");
  const [contactNumber, setContact] = useState("");

  //Account
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);

  //UI
  const [loading, setLoading]     = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "Required";
    if (!lastName.trim())  e.lastName  = "Required";
    if (!sex)              e.sex       = "Select one";
    if (!isValidDob(dateOfBirth)) e.dateOfBirth = "Use format YYYY-MM-DD";
    if (!contactNumber.trim()) e.contactNumber = "Required";
    if (!email.includes("@")) e.email = "Enter a valid email address";
    const missing: string[] = [];
    if (password.length < 8) missing.push("8+ characters");
    if (!/[A-Z]/.test(password)) missing.push("uppercase letter");
    if (!/[0-9]/.test(password)) missing.push("number");
    if (missing.length) e.password = `Must include: ${missing.join(", ")}`;
    if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    const result = await registerPatient({
      email,
      password,
      firstName,
      middleName: middleName.trim() || undefined,
      lastName,
      sex: sex!,
      dateOfBirth,
      contactNumber,
    });
    setLoading(false);
    if (result.success && result.needsConfirmation) {
      setEmailSent(true);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoContainer,
                {
                  backgroundColor: `${colors.accent}1A`,
                  borderColor: colors.accent,
                  shadowColor: colors.accent,
                },
              ]}
            >
              <Ionicons name="pulse-outline" size={32} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {S.auth.register}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>
              Create your patient account
            </Text>
          </View>

          {emailSent ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Check your inbox</Text>
              <Text style={[styles.confirmSubtitle, { color: colors.textSec }]}>
                We've sent a confirmation link to{" "}
                <Text style={[styles.emailHighlight, { color: colors.accent }]}>{email}</Text>.
                {"\n\n"}Click the link in the email to activate your account, then sign in.
              </Text>
              <Button
                label="Back to Sign In"
                onPress={() => router.replace("/(auth)/login")}
                variant="secondary"
                size="lg"
              />
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Identity */}
              <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Your details</Text>
              <Input
                placeholder="First name"
                value={firstName}
                onChangeText={(v) => { setFirstName(v); clearError(); }}
                autoCapitalize="words"
                error={errors.firstName}
              />
              <Input
                placeholder="Middle name (optional)"
                value={middleName}
                onChangeText={setMiddleName}
                autoCapitalize="words"
              />
              <Input
                placeholder="Last name"
                value={lastName}
                onChangeText={(v) => { setLastName(v); clearError(); }}
                autoCapitalize="words"
                error={errors.lastName}
              />

              {/* Sex */}
              <Text style={[styles.fieldLabel, { color: colors.textSec }]}>Sex</Text>
              <View style={styles.sexRow}>
                {SEX_OPTIONS.map((opt) => {
                  const selected = sex === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setSex(opt.value)}
                      style={[
                        styles.sexBtn,
                        {
                          borderColor: selected ? colors.accent : colors.border,
                          backgroundColor: selected ? `${colors.accent}1F` : "transparent",
                        },
                      ]}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={selected ? colors.accent : colors.textSec}
                      />
                      <Text
                        style={[
                          styles.sexLabel,
                          { color: selected ? colors.accent : colors.textSec },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.sex ? (
                <Text style={[styles.fieldError, { color: colors.error }]}>{errors.sex}</Text>
              ) : null}

              {/* DOB + contact */}
              <Input
                placeholder="Date of birth (YYYY-MM-DD)"
                value={dateOfBirth}
                onChangeText={setDob}
                error={errors.dateOfBirth}
              />
              <Input
                placeholder="Contact number"
                value={contactNumber}
                onChangeText={setContact}
                keyboardType="phone-pad"
                error={errors.contactNumber}
              />

              {/* Account */}
              <Text style={[styles.sectionLabel, { color: colors.textSec, marginTop: Spacing.lg }]}>
                Account
              </Text>
              <Input
                placeholder="Email address"
                value={email}
                onChangeText={(v) => { setEmail(v); clearError(); }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />
              <Input
                placeholder="Password"
                value={password}
                onChangeText={(v) => { setPassword(v); clearError(); }}
                secureTextEntry={!showPassword}
                error={errors.password}
                rightIcon={
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSec}
                  />
                }
                onRightIconPress={() => setShowPassword((v) => !v)}
              />
              <Input
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                error={errors.confirmPassword}
              />

              {storeError ? (
                <Text style={[styles.generalError, { color: colors.error }]}>{storeError}</Text>
              ) : null}

              <Button
                label={S.auth.register}
                onPress={handleRegister}
                loading={loading}
                size="lg"
              />

              <Text style={[styles.terms, { color: colors.textSec }]}>
                By creating an account, you agree to our{" "}
                <Text style={{ color: colors.accent }}>Terms of Service</Text> and{" "}
                <Text style={{ color: colors.accent }}>Privacy Policy</Text>.
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSec }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.replace("/(auth)/login")}>
              <Text style={[styles.loginLink, { color: colors.accent }]}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["3xl"],
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    marginTop: Spacing.xs,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  cardTitle: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.sm,
  },
  confirmSubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emailHighlight: {
    fontFamily: Typography.fonts.subheading,
  },
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  fieldError: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sexRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sexBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  sexLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
  },
  generalError: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  terms: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  loginLink: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
  footerText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
  },
});
