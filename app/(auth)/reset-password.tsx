// app/(auth)/reset-password.tsx
// Deep-link sink for password recovery emails. The Vercel landing
// page redirects users to lumenai://auth/reset-password with the
// Supabase recovery tokens in the URL hash. This screen consumes
// those tokens, sets the session, then forwards to the existing
// update-password form.

import { useURL } from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

function parseHash(url: string | null) {
  if (!url) return {};
  const i = url.indexOf("#");
  if (i === -1) return {};
  const out: Record<string, string> = {};
  for (const kv of url.slice(i + 1).split("&")) {
    const [k, v] = kv.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return out;
}

export default function ResetPasswordSink() {
  const router = useRouter();
  const { colors } = useTheme();
  const url = useURL();
  const handledRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (handledRef.current) return;
    if (!url) return;
    handledRef.current = true;

    const hash = parseHash(url);
    const access_token = hash.access_token;
    const refresh_token = hash.refresh_token;

    if (!access_token || !refresh_token) {
      setErrorMsg("This link is missing recovery tokens. Please request a new password reset.");
      return;
    }

    (async () => {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      router.replace("/(auth)/update-password");
    })();
  }, [url, router]);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {errorMsg ? (
          <>
            <View style={styles.iconWrap}>
              <Ionicons name="alert-circle" size={64} color={colors.error} />
            </View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>Link expired</Text>
              <Text style={[styles.subtitle, { color: colors.textSec }]}>{errorMsg}</Text>
              <Button
                label="Request a new link"
                onPress={() => router.replace("/(auth)/forgot-password")}
                size="lg"
              />
            </View>
          </>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSec }]}>
              Verifying your reset link...
            </Text>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["3xl"],
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    lineHeight: 22,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
});
