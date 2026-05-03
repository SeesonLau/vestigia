// app/(clinic)/assess-bundle.tsx
//Standalone assessment of a stored bundle. Fetches the thermal_captures
//for ?session_id=, downloads the processed PNGs as base64 and the CSVs
//as text (parsed to matrices), runs the DPN classifier, and writes the
//classification_results row.

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { scanPatient } from "../../lib/dpnApi";
import { supabase } from "../../lib/supabase";

type Phase = "loading" | "scanning" | "saving" | "done" | "error";

const SIGN_EXPIRY = 600; //10 minutes is enough for one assess pass

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image (${res.status})`);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

async function fetchAsText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download CSV (${res.status})`);
  return res.text();
}

function csvToMatrix(csv: string): number[][] {
  return csv.trim().split("\n").map((line) =>
    line.split(",").map((v) => {
      const n = parseFloat(v.trim());
      return isNaN(n) ? 0 : n;
    }),
  );
}

export default function AssessBundleScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { session_id } = useLocalSearchParams<{ session_id: string }>();

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [classification, setClassification] = useState<"POSITIVE" | "NEGATIVE" | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  //Breathing progress
  const breathAnim = useRef(new Animated.Value(0.1)).current;
  useEffect(() => {
    if (phase === "done" || phase === "error") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 0.85, duration: 2000, useNativeDriver: false }),
        Animated.timing(breathAnim, { toValue: 0.25, duration: 1100, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, breathAnim]);
  const progressWidth = breathAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  useEffect(() => {
    if (!session_id) {
      setErrorMsg("Missing session id.");
      setPhase("error");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        //1. Captures (paths only)
        const caps = await supabase
          .from("thermal_captures")
          .select("foot, processed_image_path, csv_path")
          .eq("session_id", session_id);
        if (caps.error) throw caps.error;
        const left  = caps.data?.find((c: { foot: string }) => c.foot === "left")  as { processed_image_path: string; csv_path: string } | undefined;
        const right = caps.data?.find((c: { foot: string }) => c.foot === "right") as { processed_image_path: string; csv_path: string } | undefined;
        if (!left || !right) throw new Error("Both left and right captures are required.");

        //2. Sign all four URLs in two batches (one per bucket)
        const [pngSigns, csvSigns] = await Promise.all([
          supabase.storage.from("thermal-images").createSignedUrls([left.processed_image_path, right.processed_image_path], SIGN_EXPIRY),
          supabase.storage.from("thermal-csv").createSignedUrls([left.csv_path, right.csv_path], SIGN_EXPIRY),
        ]);
        if (pngSigns.error) throw pngSigns.error;
        if (csvSigns.error) throw csvSigns.error;

        const pngs = pngSigns.data ?? [];
        const csvs = csvSigns.data ?? [];
        const leftPng  = pngs.find((p) => p.path === left.processed_image_path)?.signedUrl;
        const rightPng = pngs.find((p) => p.path === right.processed_image_path)?.signedUrl;
        const leftCsv  = csvs.find((p) => p.path === left.csv_path)?.signedUrl;
        const rightCsv = csvs.find((p) => p.path === right.csv_path)?.signedUrl;
        if (!leftPng || !rightPng || !leftCsv || !rightCsv) {
          throw new Error("Could not sign one or more storage paths.");
        }

        //3. Download images + CSVs in parallel
        const [leftB64, rightB64, leftCsvText, rightCsvText] = await Promise.all([
          fetchAsBase64(leftPng),
          fetchAsBase64(rightPng),
          fetchAsText(leftCsv),
          fetchAsText(rightCsv),
        ]);

        if (cancelled) return;
        setPhase("scanning");

        //4. DPN scan
        const result = await scanPatient({
          left_image_b64:    leftB64,
          right_image_b64:   rightB64,
          left_temperatures: csvToMatrix(leftCsvText),
          right_temperatures: csvToMatrix(rightCsvText),
        });
        if (cancelled) return;

        const classificationStr: "POSITIVE" | "NEGATIVE" = result.is_diabetic ? "POSITIVE" : "NEGATIVE";
        setClassification(classificationStr);
        setConfidence(result.combined_confidence);
        setPhase("saving");

        //5. INSERT classification_results
        const { error: classErr } = await supabase
          .from("classification_results")
          .insert({
            session_id,
            classification:           classificationStr,
            confidence_score:         result.combined_confidence,
            max_asymmetry_c:          result.asymmetry.mean_temp_difference,
            per_angiosome_asymmetry:  null,
            angiosomes_flagged:       null,
            left_tci:                 null,
            right_tci:                null,
            bilateral_tci:            null,
            model_version:            "dpn-api-v1",
            classified_at:            new Date().toISOString(),
          });
        if (classErr) throw new Error(classErr.message);

        if (cancelled) return;
        setPhase("done");
      } catch (e: unknown) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Assessment failed.");
        setPhase("error");
      }
    })();
    return () => { cancelled = true; };
  }, [session_id]);

  const isPositive = classification === "POSITIVE";

  return (
    <ScreenWrapper>
      <Header
        title="AI Assessment"
        leftIcon={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />
      <View style={styles.container}>
        {phase === "done" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: isPositive ? `${colors.error}66` : `${colors.success}66` }]}>
            <View style={[styles.resultIcon, { backgroundColor: isPositive ? `${colors.error}1A` : `${colors.success}1A` }]}>
              <Ionicons
                name={isPositive ? "alert-circle" : "checkmark-circle"}
                size={56}
                color={isPositive ? colors.error : colors.success}
              />
            </View>
            <Text style={[styles.resultTitle, { color: isPositive ? colors.error : colors.success }]}>
              DPN {classification}
            </Text>
            {confidence !== null ? (
              <Text style={[styles.confidence, { color: colors.textSec }]}>
                {(confidence * 100).toFixed(1)}% confidence
              </Text>
            ) : null}
            <Text style={[styles.note, { color: colors.textSec }]}>
              The result has been saved to this session.
            </Text>
            <Button
              label="View Bundle"
              onPress={() => router.replace(`/(clinic)/bundle-detail?session_id=${session_id}` as any)}
              size="lg"
              style={styles.actionBtn}
            />
          </View>
        ) : phase === "error" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: `${colors.error}66` }]}>
            <View style={[styles.resultIcon, { backgroundColor: `${colors.error}1A` }]}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            </View>
            <Text style={[styles.resultTitle, { color: colors.text }]}>Assessment failed</Text>
            <Text style={[styles.note, { color: colors.textSec }]}>{errorMsg ?? "Unknown error."}</Text>
            <Button
              label="Go Back"
              onPress={() => router.back()}
              variant="secondary"
              size="lg"
              style={styles.actionBtn}
            />
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.accent} size="large" style={styles.spinner} />
            <Text style={[styles.phaseTitle, { color: colors.text }]}>
              {phase === "loading"  ? "Loading bundle…"
                : phase === "scanning" ? "Running DPN classification…"
                  : "Saving result…"}
            </Text>
            <Text style={[styles.note, { color: colors.textSec }]}>
              {phase === "loading"
                ? "Downloading thermal data."
                : phase === "scanning"
                  ? "Bilateral foot images being analysed."
                  : "Writing classification record."}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
              <Animated.View style={[styles.progressFill, { backgroundColor: colors.accent, width: progressWidth }]} />
            </View>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg, justifyContent: "center" },
  card: {
    borderWidth: 1, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: "center", gap: Spacing.md,
  },
  spinner:    { marginBottom: Spacing.sm },
  resultIcon: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
  },
  resultTitle: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1,
  },
  confidence: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.mono },
  phaseTitle: { fontSize: Typography.sizes.lg, fontFamily: Typography.fonts.heading, textAlign: "center" },
  note:       { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", lineHeight: 20 },
  progressTrack: {
    width: "100%", height: 4, borderRadius: 2, overflow: "hidden", marginTop: Spacing.md,
  },
  progressFill:  { height: "100%" },
  actionBtn:     { marginTop: Spacing.md, alignSelf: "stretch" },
});
