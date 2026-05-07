// app/(clinic)/request-password-reset.tsx
// In-Settings flow for a currently-logged-in clinic to file a
// password-reset request. The admin reviews on the web console,
// verifies the operator's identity by phone, and sets a new password
// via the `admin-set-clinic-password` Edge Function. The clinic logs in
// with the new password on the next session.
//
// Locked-out clinics CAN'T use this — they can't authenticate to call
// the RPC. They contact the admin directly out-of-band.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { submitPasswordResetRequest } from "../../lib/admin/clinicApproval";

export default function RequestPasswordResetScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [notes, setNotes]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await submitPasswordResetRequest(notes.trim() || undefined);
      setSubmitted(true);
    } catch (e) {
      Alert.alert("Could not file request", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header
        title="Request Password Reset"
        leftIcon={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name={submitted ? "checkmark-circle-outline" : "shield-checkmark-outline"}
              size={56}
              color={submitted ? colors.success : colors.accent}
            />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {submitted ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>Request submitted</Text>
                <Text style={[styles.subtitle, { color: colors.textSec }]}>
                  An admin will call the contact number on your clinic record to
                  verify your identity, then set a temporary password. Sign out
                  and use the temporary password the next time you sign in.
                </Text>
                <Button
                  label="Back to Settings"
                  onPress={() => router.replace("/(clinic)/settings")}
                  size="lg"
                />
              </>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.text }]}>
                  File a password reset request
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSec }]}>
                  Clinic accounts use fabricated emails so we can't send a reset
                  link. Submit this form and an admin will phone you on the
                  number on your clinic record to verify your identity, then
                  provide a temporary password.
                </Text>
                <Input
                  label="Notes (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Forgot password after device wipe"
                  multiline
                  numberOfLines={4}
                />
                <Button
                  label="Submit Request"
                  onPress={handleSubmit}
                  loading={loading}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  iconWrap: { alignItems: "center", marginBottom: Spacing.md },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    lineHeight: 20,
  },
});
