// app/(auth)/update-password.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { supabase } from "../../lib/supabase";

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [generalError, setGeneralError] = useState("");

  // AUTH-11: Verify a valid session exists (set by the deep link handler).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setGeneralError(
          "This link has expired or is invalid. Please request a new password reset.",
        );
      }
    });
  }, []);

  const validate = () => {
    const e: typeof errors = {};
    if (password.length < 8) e.password = "Minimum 8 characters required";
    else if (!/[A-Z]/.test(password)) e.password = "Must include an uppercase letter";
    else if (!/[0-9]/.test(password)) e.password = "Must include a number";
    if (password !== confirmPassword) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    setLoading(true);
    setGeneralError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setGeneralError(error.message ?? "Failed to update password.");
    } else {
      setDone(true);
    }
  };

  return (
    <ScreenWrapper>
      {!done && (
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name={done ? "checkmark-circle-outline" : "key-outline"}
              size={56}
              color={done ? colors.success : colors.accent}
            />
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {done ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>
                  Password Updated
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSec }]}>
                  Your password has been changed successfully. Sign in with your
                  new password.
                </Text>
                <Button
                  label="Back to Sign In"
                  onPress={() => router.replace("/(auth)/login")}
                  size="lg"
                />
              </>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.text }]}>
                  Set New Password
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSec }]}>
                  Enter and confirm your new password below.
                </Text>

                <Input
                  placeholder="New password (min. 8 chars, uppercase, number)"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setGeneralError(""); }}
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
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  error={errors.confirm}
                />

                {generalError ? (
                  <Text style={[styles.generalError, { color: colors.error }]}>
                    {generalError}
                  </Text>
                ) : null}

                <Button
                  label="Update Password"
                  onPress={handleUpdate}
                  loading={loading}
                  size="lg"
                  disabled={!!generalError}
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
  backBtn: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    alignSelf: "flex-start",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["3xl"],
    justifyContent: "center",
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
  generalError: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
});
