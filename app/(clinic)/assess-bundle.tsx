// app/(clinic)/assess-bundle.tsx
//Standalone DPN assessment for a stored bundle.
// - If the session already has a classification_results row, we hydrate the
//   API response shape from it and just render the result.
// - Otherwise we sign storage URLs, download images + CSVs, call the DPN
//   classifier, persist the full response, and render it.

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import DpnResultView from "../../components/thermal/DpnResultView";
import Button from "../../components/ui/Button";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import {
  scanPatient,
  type AsymmetryResult,
  type DPNScanResponse,
  type FootResult,
  type RegionMeans,
} from "../../lib/dpnApi";
import { supabase } from "../../lib/supabase";

type Phase = "loading" | "scanning" | "saving" | "done" | "error";

const SIGN_EXPIRY = 600;

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
  return csv.trim().split(/\r?\n/).map((line) =>
    line.split(",").map((v) => {
      const n = parseFloat(v.trim());
      return Number.isNaN(n) ? 0 : n;
    }),
  );
}

//Convert a stored classification_results row back into the API response shape.
type StoredResult = {
  classification: "POSITIVE" | "NEGATIVE";
  confidence_score: number | null;
  max_asymmetry_c: number | null;
  per_angiosome_asymmetry: RegionMeans | null;
  left_regions: RegionMeans | null;
  right_regions: RegionMeans | null;
  mean_asymmetry: number | null;
  left_foot_mean_temp_c: number | null;
  right_foot_mean_temp_c: number | null;
  model_version: string | null;
};

function hydrateFromStored(row: StoredResult): DPNScanResponse {
  const isPositive = row.classification === "POSITIVE";
  const conf = Number(row.confidence_score ?? 0);
  const positiveProb = isPositive ? conf : 100 - conf;
  const probs = { Control: 100 - positiveProb, Diabetic: positiveProb };

  const foot = (regions: RegionMeans | null): FootResult => ({
    prediction: isPositive ? "DPN Positive" : "DPN Negative",
    confidence: conf,
    is_diabetic: isPositive,
    probabilities: probs,
    regions: regions ?? null,
  });

  const asym: AsymmetryResult = {
    mean_asymmetry:        Number(row.mean_asymmetry ?? 0),
    max_asymmetry:         Number(row.max_asymmetry_c ?? 0),
    left_foot_mean_temp:   Number(row.left_foot_mean_temp_c ?? 0),
    right_foot_mean_temp:  Number(row.right_foot_mean_temp_c ?? 0),
    mean_temp_difference:  Number(row.mean_asymmetry ?? 0),
    asymmetry_significant: false,
    threshold_used:        2.2,
    region_asymmetry:      row.per_angiosome_asymmetry ?? null,
  };
  asym.asymmetry_significant = asym.max_asymmetry > asym.threshold_used;

  return {
    success: true,
    is_valid_foot: true,
    rejection_reason: null,
    combined_prediction: isPositive ? "DPN Positive" : "DPN Negative",
    combined_confidence: conf,
    is_diabetic: isPositive,
    left_foot:  foot(row.left_regions),
    right_foot: foot(row.right_regions),
    asymmetry:  asym,
    diagnosis_factors: [],
  };
}

export default function AssessBundleScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { session_id } = useLocalSearchParams<{ session_id: string }>();

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<DPNScanResponse | null>(null);

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

  const runAssessment = React.useCallback(async () => {
    if (!session_id) {
      setErrorMsg("Missing session id.");
      setPhase("error");
      return;
    }
    setPhase("loading");
    setErrorMsg(null);
    setResult(null);

    try {
      // 0. Reuse existing classification if present.
      const existing = await supabase
        .from("classification_results")
        .select(
          "classification, confidence_score, max_asymmetry_c, per_angiosome_asymmetry, " +
          "left_regions, right_regions, mean_asymmetry, " +
          "left_foot_mean_temp_c, right_foot_mean_temp_c, model_version",
        )
        .eq("session_id", session_id)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) {
        setResult(hydrateFromStored(existing.data as unknown as StoredResult));
        setPhase("done");
        return;
      }

      // 1. Captures
      const caps = await supabase
        .from("thermal_captures")
        .select("foot, processed_image_path, csv_path")
        .eq("session_id", session_id);
      if (caps.error) throw caps.error;
      const left  = caps.data?.find((c: { foot: string }) => c.foot === "left")  as { processed_image_path: string; csv_path: string } | undefined;
      const right = caps.data?.find((c: { foot: string }) => c.foot === "right") as { processed_image_path: string; csv_path: string } | undefined;
      if (!left || !right) throw new Error("Both left and right captures are required.");

      // 2. Sign URLs in two batches (one per bucket)
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

      // 3. Download
      const [leftB64, rightB64, leftCsvText, rightCsvText] = await Promise.all([
        fetchAsBase64(leftPng),
        fetchAsBase64(rightPng),
        fetchAsText(leftCsv),
        fetchAsText(rightCsv),
      ]);

      setPhase("scanning");

      // 4. DPN scan
      const r = await scanPatient({
        left_image_b64:    leftB64,
        right_image_b64:   rightB64,
        left_temperatures: csvToMatrix(leftCsvText),
        right_temperatures: csvToMatrix(rightCsvText),
      });

      // 5. Persist (only if foot validation passed)
      if (r.success && r.is_valid_foot !== false) {
        setPhase("saving");
        const isPositive = r.is_diabetic;
        const insertRow = {
          session_id,
          classification: (isPositive ? "POSITIVE" : "NEGATIVE") as "POSITIVE" | "NEGATIVE",
          confidence_score: r.combined_confidence,
          max_asymmetry_c:  r.asymmetry?.max_asymmetry ?? null,
          per_angiosome_asymmetry: r.asymmetry?.region_asymmetry ?? null,
          left_regions:    r.left_foot?.regions ?? null,
          right_regions:   r.right_foot?.regions ?? null,
          mean_asymmetry:  r.asymmetry?.mean_asymmetry ?? null,
          left_foot_mean_temp_c:  r.asymmetry?.left_foot_mean_temp ?? null,
          right_foot_mean_temp_c: r.asymmetry?.right_foot_mean_temp ?? null,
          angiosomes_flagged: null,
          left_tci:  null,
          right_tci: null,
          bilateral_tci: null,
          model_version: "dpn-api-v1.1",
          classified_at: new Date().toISOString(),
        };
        const { error: classErr } = await supabase
          .from("classification_results")
          .insert(insertRow);
        if (classErr) throw new Error(classErr.message);
      }

      setResult(r);
      setPhase("done");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Assessment failed.");
      setPhase("error");
    }
  }, [session_id]);

  useEffect(() => { runAssessment(); }, [runAssessment]);

  return (
    <ScreenWrapper>
      <Header
        title="DPN Assessment"
        leftIcon={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {phase === "done" && result ? (
          <>
            <DpnResultView result={result} />
            <Button
              label="View Bundle"
              onPress={() => router.replace(`/(clinic)/bundle-detail?session_id=${session_id}` as any)}
              size="lg"
              style={styles.actionBtn}
            />
          </>
        ) : phase === "error" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: `${colors.error}66` }]}>
            <View style={[styles.iconBubble, { backgroundColor: `${colors.error}1A` }]}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Assessment failed</Text>
            <Text style={[styles.note, { color: colors.textSec }]}>{errorMsg ?? "Unknown error."}</Text>
            <Button
              label="Try Again"
              onPress={runAssessment}
              size="lg"
              style={styles.actionBtn}
            />
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
            <ActivityIndicator color={colors.accent} size="large" style={{ marginBottom: Spacing.sm }} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {phase === "loading" ? "Loading bundle…"
                : phase === "scanning" ? "Running DPN classification…"
                : "Saving result…"}
            </Text>
            <Text style={[styles.note, { color: colors.textSec }]}>
              {phase === "loading"  ? "Downloading thermal data."
                : phase === "scanning" ? "Bilateral foot images being analysed."
                : "Writing classification record."}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
              <Animated.View style={[styles.progressFill, { backgroundColor: colors.accent, width: progressWidth }]} />
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, paddingBottom: Spacing["2xl"], gap: Spacing.md },
  card: {
    borderWidth: 1, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: "center", gap: Spacing.md,
  },
  iconBubble: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: Typography.sizes.lg, fontFamily: Typography.fonts.heading, textAlign: "center" },
  note:      { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", lineHeight: 20 },
  progressTrack: {
    width: "100%", height: 4, borderRadius: 2, overflow: "hidden", marginTop: Spacing.md,
  },
  progressFill:  { height: "100%" },
  actionBtn:     { marginTop: Spacing.md, alignSelf: "stretch" },
});
