// app/(auth)/forgot-password.tsx
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

type Step = "input" | "sent";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { forgotPassword } = useAuthStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("input");

  const handleSubmit = async () => {
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

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {step === "input" ? (
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
                  onPress={handleSubmit}
                  loading={loading}
                  size="lg"
                />
              </>
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
