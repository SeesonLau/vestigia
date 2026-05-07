// app/(auth)/forgot-password.tsx
// Two paths, role-aware:
//
//   • Patient (default) — uses Supabase resetPasswordForEmail; Supabase
//     emails the patient a reset link that lands on the web app and
//     bounces back to the mobile update-password screen via a deep link.
//
//   • Clinic — clinics use fabricated emails (DOH LTOs aren't real
//     mailboxes) so Supabase email reset doesn't reach them. Instead
//     they file a request that the admin reviews on the web console; the
//     admin verifies identity by phone and sets a new password via the
//     `admin-set-clinic-password` Edge Function. Mobile only files the
//     request and shows a "we'll contact you" confirmation.

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
import { useAuthStore } from "../../store/authStore";

type Role = "patient" | "clinic";
type Step = "input" | "sent";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { forgotPassword } = useAuthStore();

  const [role, setRole]       = useState<Role>("patient");
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState<Step>("input");

  const handlePatientSubmit = async () => {
    if (!email.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);
    if (result.success) {
      setStep("sent");
    } else {
      setError(result.error ?? "Failed to send reset link. Please try again.");
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
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.back}
            activeOpacity={0.7}
          >
            <View style={styles.backRow}>
              <Ionicons name="arrow-back" size={16} color={colors.accent} />
              <Text style={[styles.backText, { color: colors.accent }]}>
                Back to login
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons
              name={step === "sent" ? "mail-outline" : "lock-closed-outline"}
              size={56}
              color={colors.accent}
            />
          </View>

          {/* Role toggle — only shown on the input step. The two roles
              follow different recovery flows. */}
          {step === "input" && (
            <View style={[styles.roleSeg, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {(["patient", "clinic"] as const).map((r) => {
                const active = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => { setRole(r); setError(""); }}
                    style={[styles.roleBtn, active && { backgroundColor: colors.accent }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.roleText, { color: active ? "#fff" : colors.textSec }]}>
                      {r === "patient" ? "Patient" : "Clinic"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {step === "input" ? (
              role === "patient" ? (
                <>
                  <Text style={[styles.title, { color: colors.text }]}>
                    Reset Password
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textSec }]}>
                    Enter the email address associated with your account and we'll
                    send you a reset link.
                  </Text>
                  <Input
                    placeholder="Email address"
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(""); }}
                    keyboardType="email-address"
                    error={error}
                    autoCapitalize="none"
                  />
                  <Button
                    label="Send Reset Link"
                    onPress={handlePatientSubmit}
                    loading={loading}
                    size="lg"
                  />
                </>
              ) : (
                // Clinic path — explain the admin-mediated flow + route to
                // the request screen instead of Supabase email.
                <>
                  <Text style={[styles.title, { color: colors.text }]}>
                    Clinic Password Reset
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textSec }]}>
                    Clinic accounts don't use real email inboxes, so password
                    resets are handled by an admin instead. Sign in with your
                    clinic account first, then file a reset request — an admin
                    will call the contact number on file to verify your
                    identity and provide a temporary password.
                  </Text>
                  <Button
                    label="I can sign in"
                    variant="secondary"
                    onPress={() => router.replace("/(auth)/login")}
                    size="lg"
                  />
                  <View style={{ height: Spacing.sm }} />
                  <Text style={[styles.subtitle, { color: colors.textSec, marginBottom: 0 }]}>
                    Already locked out and can't sign in? Contact your
                    administrator directly — they can verify your DOH LTO
                    over the phone and reset your password from the admin
                    console.
                  </Text>
                </>
              )
            ) : (
              <>
                <Text style={[styles.title, { color: colors.text }]}>
                  Check your inbox
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSec }]}>
                  We've sent a password reset link to{" "}
                  <Text style={[styles.emailHighlight, { color: colors.accent }]}>
                    {email}
                  </Text>
                  .{"\n\n"}Follow the link in the email to set a new password. It
                  expires in 60 minutes.
                </Text>
                <Button
                  label="Back to Sign In"
                  onPress={() => router.replace("/(auth)/login")}
                  variant="secondary"
                  size="lg"
                />
              </>
            )}
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
  back: { marginBottom: Spacing["2xl"] },
  backRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.xs,
  },
  backText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
  },
  iconWrap: { alignItems: "center", marginBottom: Spacing.xl },
  roleSeg: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.md,
    gap: 3,
  },
  roleBtn: {
    flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: Radius.sm,
  },
  roleText: {
    fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading, letterSpacing: 0.4,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emailHighlight: {
    fontFamily: Typography.fonts.subheading,
  },
});
