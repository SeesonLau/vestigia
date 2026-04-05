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
import ClinicPicker from "../../components/ui/ClinicPicker";
import Input from "../../components/ui/Input";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { S } from "../../constants/strings";
import { useAuthStore } from "../../store/authStore";

type Role = "patient" | "clinic";

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { register, error: storeError, clearError } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("patient");
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
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
    const result = await register(email, password, fullName, role, selectedClinicId ?? undefined);
    setLoading(false);
    if (result.success) {
      if (result.needsConfirmation) {
        setEmailSent(true);
      } else {
        switch (result.role) {
          case "clinic":   router.replace("/(clinic)"); break;
          case "patient":  router.replace("/(patient)"); break;
          case "admin":    router.replace("/(admin)"); break;
          default:         router.replace("/(auth)/login");
        }
      }
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
              Join the DPN Thermal platform
            </Text>
          </View>

          {emailSent ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Check your inbox
              </Text>
              <Text style={[styles.confirmSubtitle, { color: colors.textSec }]}>
                We've sent a confirmation link to{" "}
                <Text style={[styles.emailHighlight, { color: colors.accent }]}>
                  {email}
                </Text>
                .{"\n\n"}Click the link in the email to activate your account,
                then sign in.
              </Text>
              <Button
                label="Back to Sign In"
                onPress={() => router.replace("/(auth)/login")}
                variant="secondary"
                size="lg"
              />
            </View>
          ) : (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: colors.textSec }]}>
                Account Type
              </Text>
              <View style={styles.roleRow}>
                {(["patient", "clinic"] as Role[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => { setRole(r); setSelectedClinicId(null); }}
                    style={[
                      styles.roleBtn,
                      {
                        borderColor: role === r ? colors.accent : colors.border,
                        backgroundColor: role === r ? `${colors.accent}1F` : "transparent",
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={r === "patient" ? "person-outline" : "business-outline"}
                      size={18}
                      color={role === r ? colors.accent : colors.textSec}
                    />
                    <Text
                      style={[
                        styles.roleLabel,
                        { color: role === r ? colors.accent : colors.textSec },
                      ]}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {role === "clinic" && (
                <ClinicPicker
                  selectedId={selectedClinicId}
                  onSelect={setSelectedClinicId}
                />
              )}

              <View style={styles.form}>
                <Input
                  placeholder="Full name"
                  value={fullName}
                  onChangeText={(v) => { setFullName(v); clearError(); }}
                  error={errors.fullName}
                  autoCapitalize="words"
                />
                <Input
                  placeholder="Email address"
                  value={email}
                  onChangeText={(v) => { setEmail(v); clearError(); }}
                  keyboardType="email-address"
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
              </View>

              {storeError ? (
                <Text style={[styles.generalError, { color: colors.error }]}>
                  {storeError}
                </Text>
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
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text style={[styles.loginLink, { color: colors.accent }]}>
                Sign in
              </Text>
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
  roleRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  roleLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
  form: { marginBottom: Spacing.lg },
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
  footerText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
  },
  loginLink: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
});
