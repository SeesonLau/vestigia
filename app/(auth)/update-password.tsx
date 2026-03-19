// app/(auth)/update-password.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>(
    {},
  );
  const [generalError, setGeneralError] = useState("");

  // AUTH-11: Verify a valid session exists (set by the deep link handler).
  // Without this, updateUser() would silently fail for users who land here without a reset token.
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
              color={done ? Colors.teal[300] : Colors.primary[300]}
            />
          </View>

          <View style={styles.card}>
            {done ? (
              //Success
              <>
                <Text style={styles.title}>Password Updated</Text>
                <Text style={styles.subtitle}>
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
              //Form
              <>
                <Text style={styles.title}>Set New Password</Text>
                <Text style={styles.subtitle}>
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
                      color={Colors.text.muted}
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
                  <Text style={styles.generalError}>{generalError}</Text>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["3xl"],
    justifyContent: "center",
  },
  iconWrap: { alignItems: "center", marginBottom: Spacing.xl },
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
  generalError: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
});
