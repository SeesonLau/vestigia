// components/thermal/OnlineCsvViewerScreen.tsx
//Same WebView grid as the offline CsvViewerScreen, but the CSV is
//fetched from the thermal-csv Supabase bucket via signed URL.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import WebView from "react-native-webview";
import Header from "../layout/Header";
import ScreenWrapper from "../layout/ScreenWrapper";
import { useTheme } from "../../constants/ThemeContext";
import { Spacing, Typography } from "../../constants/theme";
import type { ThemeColors } from "../../constants/theme";
import { buildCsvGridHtml } from "../../lib/thermal/csvGridHtml";
import { supabase } from "../../lib/supabase";

interface Props {
  sessionId: string;
  side: "left" | "right";
}

export default function OnlineCsvViewerScreen({ sessionId, side }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [label, setLabel]           = useState("");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        //Capture row + session header fire in parallel.
        const [capRes, sessRes] = await Promise.all([
          supabase
            .from("thermal_captures")
            .select("csv_path")
            .eq("session_id", sessionId)
            .eq("foot", side)
            .maybeSingle(),
          supabase
            .from("screening_sessions")
            .select("bundle_code")
            .eq("id", sessionId)
            .maybeSingle(),
        ]);

        if (capRes.error || !capRes.data?.csv_path) {
          throw new Error("CSV not found for this capture.");
        }

        const signed = await supabase.storage
          .from("thermal-csv")
          .createSignedUrl(capRes.data.csv_path, 3600);
        if (signed.error || !signed.data?.signedUrl) {
          throw new Error("Could not sign CSV URL.");
        }

        const res = await fetch(signed.data.signedUrl);
        if (!res.ok) throw new Error("CSV download failed.");
        const text = await res.text();

        if (cancelled) return;
        setCsvContent(text);
        setLabel(`${sessRes.data?.bundle_code ?? sessionId.slice(0, 8)} · ${side === "left" ? "Left" : "Right"} Foot`);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load CSV.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, side]);

  const html = useMemo(() => csvContent ? buildCsvGridHtml(csvContent) : null, [csvContent]);

  return (
    <ScreenWrapper>
      <Header
        title="Temperature Grid"
        subtitle={label}
        leftIcon={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : error ? (
        <ErrorView message={error} colors={colors} />
      ) : html ? (
        <>
          <WebView
            source={{ html }}
            style={styles.webview}
            originWhitelist={["*"]}
            scalesPageToFit
            scrollEnabled
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
          <View style={[styles.hint, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Ionicons name="expand-outline" size={12} color={colors.textSec} />
            <Text style={[styles.hintText, { color: colors.textSec }]}>
              Scroll to navigate · foot pixels show °C · background = 0.00 (dimmed)
            </Text>
          </View>
        </>
      ) : null}
    </ScreenWrapper>
  );
}

function ErrorView({ message, colors }: { message: string; colors: ThemeColors }) {
  return (
    <View style={styles.center}>
      <Ionicons name="warning-outline" size={32} color={colors.error} />
      <Text style={[styles.errorText, { color: colors.error }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
  center:  { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md },
  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", paddingHorizontal: Spacing.lg },
  hint:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderTopWidth: 1 },
  hintText:{ fontSize: 10, fontFamily: Typography.fonts.body, flex: 1 },
});
