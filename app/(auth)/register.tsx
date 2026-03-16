// app/(auth)/register.tsx
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
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";

type Role = "patient" | "clinic";

export default function RegisterScreen() {
  const router = useRouter();
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
    if (password.length < 8) e.password = "Minimum 8 characters required";
    if (!/[A-Z]/.test(password)) e.password = "Must include uppercase letter";
    if (!/[0-9]/.test(password)) e.password = "Must include a number";
    if (password !== confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    const result = await register(
      email,
      password,
      fullName,
      role,
      selectedClinicId ?? undefined,
    );
    setLoading(false);
    if (result.success) {
      if (result.needsConfirmation) {
        setEmailSent(true);
      } else {
        switch (result.role) {
          case "clinic":
            router.replace("/(clinic)");
            break;
          case "patient":
            router.replace("/(patient)");
            break;
          case "admin":
            router.replace("/(admin)");
            break;
          default:
            router.replace("/(auth)/login");
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
            <View style={styles.logoContainer}>
              <Text style={styles.logoGlyph}>◈</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the DPN Thermal platform</Text>
          </View>

          {emailSent ? (
            /* Email confirmation screen */
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Check your inbox</Text>
              <Text style={styles.confirmSubtitle}>
                We've sent a confirmation link to{" "}
                <Text style={styles.emailHighlight}>{email}</Text>.{"\n\n"}
                Click the link in the email to activate your account, then sign
                in.
              </Text>
              <Button
                label="Back to Sign In"
                onPress={() => router.replace("/(auth)/login")}
                variant="secondary"
                size="lg"
              />
            </View>
          ) : (
            /* Registration form */
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Account Type</Text>
              <View style={styles.roleRow}>
                {(["patient", "clinic"] as Role[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    style={[
                      styles.roleBtn,
                      role === r ? styles.roleBtnActive : undefined,
                    ]}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.roleIcon}>
                      {r === "patient" ? "👤" : "🏥"}
                    </Text>
                    <Text
                      style={[
                        styles.roleLabel,
                        role === r ? styles.roleLabelActive : undefined,
                      ]}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Clinic picker — shown only when role is clinic */}
              {role === "clinic" && (
                <ClinicPicker
                  selectedId={selectedClinicId}
                  onSelect={setSelectedClinicId}
                />
              )}

              {/* Form */}
              <View style={styles.form}>
                <Input
                  label="Full Name"
                  placeholder="Juan dela Cruz"
                  value={fullName}
                  onChangeText={(v) => { setFullName(v); clearError(); }}
                  error={errors.fullName}
                  autoCapitalize="words"
                />
                <Input
                  label="Email Address"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={(v) => { setEmail(v); clearError(); }}
                  keyboardType="email-address"
                  error={errors.email}
                />
                <Input
                  label="Password"
                  placeholder="Min. 8 chars, uppercase, number"
                  value={password}
                  onChangeText={(v) => { setPassword(v); clearError(); }}
                  secureTextEntry={!showPassword}
                  error={errors.password}
                  rightIcon={
                    <Text style={{ fontSize: 16 }}>
                      {showPassword ? "🙈" : "👁"}
                    </Text>
                  }
                  onRightIconPress={() => setShowPassword((v) => !v)}
                />
                <Input
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  error={errors.confirmPassword}
                />
              </View>

              {storeError ? (
                <Text style={styles.generalError}>{storeError}</Text>
              ) : null}

              <Button
                label="Create Account"
                onPress={handleRegister}
                loading={loading}
                size="lg"
              />

              <Text style={styles.terms}>
                By creating an account, you agree to our{" "}
                <Text style={styles.link}>Terms of Service</Text> and{" "}
                <Text style={styles.link}>Privacy Policy</Text>.
              </Text>
            </View>
          )}

          {/* Login link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text style={styles.loginLink}>Sign in</Text>
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
    backgroundColor: Colors.bg.glass,
    borderWidth: 1.5,
    borderColor: Colors.border.strong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    shadowColor: Colors.primary[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  logoGlyph: {
    fontSize: 28,
    color: Colors.primary[300],
  },
  title: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  cardTitle: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  confirmSubtitle: {
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
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
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
    borderColor: Colors.border.default,
    backgroundColor: "transparent",
  },
  roleBtnActive: {
    borderColor: Colors.primary[400],
    backgroundColor: "rgba(0, 128, 200, 0.12)",
  },
  roleIcon: { fontSize: 18 },
  roleLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    color: Colors.text.muted,
  },
  roleLabelActive: { color: Colors.primary[300] },
  form: { marginBottom: Spacing.lg },
  generalError: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  terms: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    textAlign: "center",
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  link: { color: Colors.primary[300] },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
  },
  loginLink: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    color: Colors.primary[300],
  },
});
