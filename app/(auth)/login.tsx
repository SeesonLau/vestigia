//app/(auth)/login.tsx
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

export default function LoginScreen() {
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
    if (password.length < 8)
      e.password = "Password must be at least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = () => {
    if (!validate()) return;
    setLoading(true);
    // TODO: Supabase auth
    setTimeout(() => setLoading(false), 1500);
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
                label="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                error={errors.email}
                autoCapitalize="none"
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                error={errors.password}
                rightIcon={
                  <Text style={styles.eyeIcon}>
                    {showPassword ? "🙈" : "👁"}
                  </Text>
                }
                onRightIconPress={() => setShowPassword((v) => !v)}
              />

              <TouchableOpacity style={styles.forgotLink} activeOpacity={0.7}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

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
            <TouchableOpacity activeOpacity={0.7}>
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
  eyeIcon: { fontSize: 16 },
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
