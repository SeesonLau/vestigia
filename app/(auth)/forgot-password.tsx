// app/(auth)/forgot-password.tsx
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
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";

type Step = "input" | "sent";

export default function ForgotPasswordScreen() {
  const router = useRouter();
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
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.back}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>← Back to login</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Text style={styles.icon}>{step === "sent" ? "📬" : "🔐"}</Text>
          </View>

          {step === "input" ? (
            <View style={styles.card}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter the email address associated with your account and we'll
                send you a reset link.
              </Text>

              <Input
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError("");
                }}
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
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.title}>Check your inbox</Text>
              <Text style={styles.subtitle}>
                We've sent a password reset link to{" "}
                <Text style={styles.emailHighlight}>{email}</Text>.{"\n\n"}
                Follow the link in the email to set a new password. It expires
                in 60 minutes.
              </Text>

              <Button
                label="Back to Sign In"
                onPress={() => router.replace("/(auth)/login")}
                variant="secondary"
                size="lg"
              />
            </View>
          )}
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
  backText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.primary[300],
  },
  iconWrap: { alignItems: "center", marginBottom: Spacing.xl },
  icon: { fontSize: 56 },
  card: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emailHighlight: {
    color: Colors.primary[300],
    fontFamily: Typography.fonts.subheading,
  },
});
