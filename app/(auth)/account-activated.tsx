// app/(auth)/account-activated.tsx
import { Ionicons } from "@expo/vector-icons";
import { useURL } from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { S } from "../../constants/strings";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

type Status = "verifying" | "success" | "error" | "manual";

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

export default function AccountActivatedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const url = useURL();
  const user = useAuthStore((s) => s.user);

  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const handledRef = useRef(false);

  //Consume the deep-link hash exactly once
  useEffect(() => {
    if (handledRef.current) return;
    if (!url) return;
    handledRef.current = true;

    const hash = parseHash(url);
    const access_token = hash.access_token;
    const refresh_token = hash.refresh_token;

    if (!access_token || !refresh_token) {
      //Direct nav (no tokens) — fall back to "sign in" CTA
      setStatus("manual");
      return;
    }

    (async () => {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }
      setStatus("success");
    })();
  }, [url]);

  //After session is set, authStore.onAuthStateChange populates user.
  //Route by role once it's available.
  useEffect(() => {
    if (status !== "success" || !user) return;
    const dest =
      user.role === "patient" ? "/(patient)"
      : user.role === "clinic" ? "/(clinic)"
      : "/(auth)/login"; //admin (shouldn't happen), or unknown
    router.replace(dest);
  }, [status, user]);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {status === "verifying" ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSec }]}>
              Activating your account...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.iconWrap}>
              <Ionicons
                name={status === "error" ? "alert-circle" : "checkmark-circle"}
                size={72}
                color={status === "error" ? colors.error : colors.success}
              />
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>
                {status === "error" ? "Activation failed" : S.auth.accountActivated}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSec }]}>
                {status === "error"
                  ? (errorMsg ?? "We couldn't activate your account. Try signing in or request a new link.")
                  : status === "success"
                    ? `You're signed in. Taking you to ${S.app.name}...`
                    : `Your email has been verified and your account is ready to use.\n\nSign in to get started with ${S.app.name}.`}
              </Text>
              {status !== "success" ? (
                <Button
                  label={S.auth.signIn}
                  onPress={() => router.replace("/(auth)/login")}
                  size="lg"
                />
              ) : null}
            </View>
          </>
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
