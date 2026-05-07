// app/(auth)/clinic-pending-approval.tsx
// Confirmation screen shown after a clinic completes registration. The
// clinic's auth user + clinic row exist in Supabase but `clinics.approval_status`
// starts at 'pending' and the login gate refuses entry until an admin
// reviews the DOH LTO + facility credentials and flips it to 'approved'
// on the web admin console.

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";

export default function ClinicPendingApprovalScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  // Optional clinic_code passed in from the register screen; surfaced in
  // the confirmation copy so the operator can quote it when calling.
  const { clinic_code } = useLocalSearchParams<{ clinic_code?: string }>();

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconWrap}>
          <Ionicons name="hourglass-outline" size={64} color={colors.accent} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Awaiting admin approval
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSec }]}>
            Your clinic account has been created. An administrator will verify your
            DOH LTO and facility details before activating it — typically within
            1 business day. We'll notify you on the contact number you provided.
          </Text>

          {clinic_code ? (
            <View style={[styles.codeBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.codeLabel, { color: colors.textSec }]}>
                CLINIC CODE
              </Text>
              <Text style={[styles.codeValue, { color: colors.text }]}>
                {clinic_code}
              </Text>
              <Text style={[styles.codeHint, { color: colors.textSec }]}>
                Quote this code when contacting support.
              </Text>
            </View>
          ) : null}

          <Text style={[styles.note, { color: colors.textSec }]}>
            You can try signing in once you've been notified that your account
            is active. Until then login will be blocked with a "pending approval"
            message.
          </Text>

          <Button
            label="Back to Sign In"
            onPress={() => router.replace("/(auth)/login")}
            size="lg"
          />
        </View>
      </ScrollView>
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
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    lineHeight: 22,
    textAlign: "center",
  },
  codeBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: "center",
    gap: 4,
  },
  codeLabel: {
    fontSize: 10,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1.5,
  },
  codeValue: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.mono,
  },
  codeHint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
  },
  note: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    lineHeight: 18,
    textAlign: "center",
  },
});
