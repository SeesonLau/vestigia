// app/_layout.tsx
import { Stack, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { View } from "react-native";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import { supabase } from "../lib/supabase";
import { ThemeProvider, useTheme } from "../constants/ThemeContext";

function AppStack() {
  const router = useRouter();
  const { resetTimer } = useInactivityTimeout();
  const { colors } = useTheme();

  //DeepLinkHandler
  useEffect(() => {
    //Handle cold start deep link (app was closed)
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthDeepLink(url);
    });

    //Handle warm deep link (app was in background)
    const sub = Linking.addEventListener("url", ({ url }) => {
      handleAuthDeepLink(url);
    });

    return () => sub.remove();
  }, []);

  const handleAuthDeepLink = async (url: string) => {
    if (!url.startsWith("vestigia://")) return;

    //Extract tokens from URL fragment (#access_token=...&type=...)
    const fragment = url.split("#")[1] ?? "";
    const params = Object.fromEntries(
      fragment.split("&").map((p) => p.split("=")),
    );

    //Extract query params for PKCE flow (?code=...)
    const query = url.split("?")[1]?.split("#")[0] ?? "";
    const queryParams = Object.fromEntries(
      query.split("&").map((p) => p.split("=")),
    );

    if (params.type === "recovery" && params.access_token) {
      //Password reset — set session so updateUser() works on the next screen
      await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token ?? "",
      });
      router.replace("/(auth)/update-password" as any);
      return;
    }

    //Email confirmation (implicit flow: type=signup/email, or PKCE flow: ?code=)
    //Supabase already verified the token server-side before redirecting here.
    //No need to set a session — user will sign in manually from the activated screen.
    const isImplicitConfirm =
      (params.type === "signup" || params.type === "email") && !!params.access_token;
    const isPkceConfirm = !!queryParams.code;

    if (isImplicitConfirm || isPkceConfirm) {
      router.replace("/(auth)/account-activated" as any);
    }
  };

  return (
    <View style={{ flex: 1 }} onTouchStart={resetTimer}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(clinic)" />
        <Stack.Screen name="(patient)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="index" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppStack />
    </ThemeProvider>
  );
}
