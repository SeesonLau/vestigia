// app/(auth)/login.tsx
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
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { dbg } from "../../lib/debug";
import { useAuthStore } from "../../store/authStore";

export default function LoginScreen() {
  const router = useRouter();
  const { login, error: storeError, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const validate = () => {
    const e: typeof errors = {};
    if (!email.includes("@")) e.email = "Enter a valid email address";
    // AUTH-08: Do not enforce password rules on login — only check field is not empty
    if (!password.trim()) e.password = "Enter your password";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    dbg("login", "handleLogin called");
    setLoading(true);
    const result = await login(email, password);
    dbg("login", `login() returned — success=${result.success} role=${result.role ?? "null"} error=${result.error ?? "none"}`);
    setLoading(false);
    if (result.success) {
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
        // AUTH-09: Unknown role — fall back to login with a store error
        default:
          router.replace("/(auth)/login");
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
          {/* Logo / Brand */}
          <View style={styles.brandArea}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoGlyph}>◈</Text>
            </View>
            <Text style={styles.appName}>Vestigia</Text>
            <Text style={styles.tagline}>
              Diabetic Peripheral Neuropathy Screening
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to continue</Text>

            <View style={styles.form}>
              <Input
                placeholder="Email address"
                value={email}
                onChangeText={(v) => { setEmail(v); clearError(); }}
                keyboardType="email-address"
                error={errors.email}
                autoCapitalize="none"
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
                    color={Colors.text.muted}
                  />
                }
                onRightIconPress={() => setShowPassword((v) => !v)}
              />

              <TouchableOpacity
                style={styles.forgotLink}
                activeOpacity={0.7}
                onPress={() => router.push("/(auth)/forgot-password")}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              {storeError ? (
                <Text style={styles.generalError}>{storeError}</Text>
              ) : null}

              <Button
                label="Sign In"
                onPress={handleLogin}
                loading={loading}
                size="lg"
                style={styles.loginBtn}
              />
            </View>
          </View>

          {/* Register link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={styles.registerLink}>Create account</Text>
            </TouchableOpacity>
          </View>

          {/* Version tag */}
          <Text style={styles.version}>Vestigia v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["4xl"],
  },

  // Brand
  brandArea: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.bg.glass,
    borderWidth: 1.5,
    borderColor: Colors.border.strong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGlyph: {
    fontSize: 36,
    color: Colors.primary[300],
  },
  appName: {
    fontSize: Typography.sizes["3xl"],
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: Spacing.xs,
    textAlign: "center",
    letterSpacing: 0.3,
  },

  // Card
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
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginBottom: Spacing.xl,
  },
  form: {},
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
  },
  forgotText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.primary[300],
  },
  loginBtn: {
    marginTop: Spacing.xs,
  },
  generalError: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  // Footer
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
  registerLink: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    color: Colors.primary[300],
  },

  version: {
    textAlign: "center",
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
    marginTop: Spacing["2xl"],
    letterSpacing: 0.5,
  },
});
