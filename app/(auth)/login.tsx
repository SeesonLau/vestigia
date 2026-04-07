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
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { S } from "../../constants/strings";
import { dbg } from "../../lib/debug";
import { useAuthStore } from "../../store/authStore";

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { login, error: storeError, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.includes("@")) e.email = "Enter a valid email address";
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
        case "clinic":   router.replace("/(clinic)"); break;
        case "patient":  router.replace("/(patient)"); break;
        case "admin":    router.replace("/(admin)"); break;
        default:         router.replace("/(auth)/login");
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
          {/* Brand */}
          <View style={styles.brandArea}>
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
            <Text style={[styles.appName, { color: colors.text }]}>
              {S.app.name}
            </Text>
            <Text style={[styles.tagline, { color: colors.textSec }]}>
              {S.app.tagline}
            </Text>
          </View>

          {/* Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Welcome back
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSec }]}>
              Sign in to continue
            </Text>

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
                    color={colors.textSec}
                  />
                }
                onRightIconPress={() => setShowPassword((v) => !v)}
              />

              <TouchableOpacity
                style={styles.forgotLink}
                activeOpacity={0.7}
                onPress={() => router.push("/(auth)/forgot-password")}
              >
                <Text style={[styles.forgotText, { color: colors.accent }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>

              {storeError ? (
                <Text style={[styles.generalError, { color: colors.error }]}>
                  {storeError}
                </Text>
              ) : null}

              <Button
                label={S.auth.signIn}
                onPress={handleLogin}
                loading={loading}
                size="lg"
                style={styles.loginBtn}
              />
            </View>
          </View>

          {/* Register link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSec }]}>
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={[styles.registerLink, { color: colors.accent }]}>
                Create account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Offline shortcut */}
          <TouchableOpacity
            style={styles.offlineLink}
            activeOpacity={0.7}
            onPress={() => router.replace("/mode-select" as any)}
          >
            <Ionicons name="camera-outline" size={14} color={colors.textSec} />
            <Text style={[styles.offlineLinkText, { color: colors.textSec }]}>
              Work Offline instead
            </Text>
          </TouchableOpacity>

          <Text style={[styles.version, { color: colors.textSec }]}>
            {S.auth.loginFooter} · {S.app.version}
          </Text>
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
  brandArea: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  appName: {
    fontSize: Typography.sizes["3xl"],
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    marginTop: Spacing.xs,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  cardTitle: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
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
  },
  loginBtn: { marginTop: Spacing.xs },
  generalError: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    marginBottom: Spacing.sm,
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
  registerLink: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
  offlineLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.lg,
  },
  offlineLinkText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
  },
  version: {
    textAlign: "center",
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    marginTop: Spacing["2xl"],
    letterSpacing: 0.5,
  },
});
