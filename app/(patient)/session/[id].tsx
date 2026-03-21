// app/(patient)/session/[id].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  AngiosomeTable,
  ClassificationCard,
  TCIDisplay,
} from "../../../components/assessment/index";
import Header from "../../../components/layout/Header";
import ScreenWrapper from "../../../components/layout/ScreenWrapper";
import ThermalMap, {
  generateMockThermalMatrix,
} from "../../../components/thermal/ThermalMap";
import { Badge, Card, Disclaimer } from "../../../components/ui/index";
import { DISCLAIMER_TEXT } from "../../../constants/clinical";
import { Colors, Spacing, Typography } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { ClassificationResult, PatientVitals, ScreeningSession } from "../../../types";

const { width: W } = Dimensions.get("window");
const THUMB_W = (W - Spacing.lg * 2 - Spacing.md) / 2;
const THUMB_H = Math.round(THUMB_W * (62 / 80));


type SessionDetail = ScreeningSession & {
  classification: ClassificationResult | null;
  vitals: PatientVitals | null;
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const leftMat = useRef(generateMockThermalMatrix()).current;
  const rightMat = useRef(generateMockThermalMatrix()).current;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("screening_sessions")
      .select(`
        *,
        classification:classification_results(*),
        vitals:patient_vitals(*)
      `)
      .eq("id", id)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) setError("Session not found.");
        else {
          const raw = data as any;
          setSession({
            ...raw,
            classification: Array.isArray(raw.classification)
              ? raw.classification[0] ?? null
              : raw.classification ?? null,
            vitals: Array.isArray(raw.vitals)
              ? raw.vitals[0] ?? null
              : raw.vitals ?? null,
          });
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="Session Detail" leftIcon={<Text style={styles.back}>←</Text>} onLeftPress={() => router.back()} />
        <View style={styles.centered}><ActivityIndicator color={Colors.primary[400]} /></View>
      </ScreenWrapper>
    );
  }

  if (error || !session) {
    return (
      <ScreenWrapper>
        <Header title="Session Detail" leftIcon={<Text style={styles.back}>←</Text>} onLeftPress={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? "Session not found."}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const result = session.classification;
  const vitals = session.vitals;

  return (
    <ScreenWrapper>
      <Header
        title="Session Detail"
        leftIcon={<Text style={styles.back}>←</Text>}
        onLeftPress={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Date + status */}
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.date}>
              {new Date(session.started_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <Text style={styles.time}>
              {new Date(session.started_at).toLocaleTimeString("en-PH", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <Badge
            label={session.status}
            variant={
              session.status === "completed"
                ? "negative"
                : session.status === "failed"
                  ? "positive"
                  : "muted"
            }
          />
        </View>

        {result ? (
          <>
            <ClassificationCard
              classification={result.classification}
              confidence={result.confidence_score}
              style={styles.section}
            />

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Thermal Captures</Text>
              <View style={styles.thumbRow}>
                <View style={styles.thumb}>
                  <ThermalMap matrix={leftMat} minTemp={29} maxTemp={37} width={THUMB_W} height={THUMB_H} />
                  <Text style={styles.thumbLabel}>LEFT FOOT</Text>
                </View>
                <View style={styles.thumb}>
                  <ThermalMap matrix={rightMat} minTemp={29} maxTemp={37} width={THUMB_W} height={THUMB_H} />
                  <Text style={styles.thumbLabel}>RIGHT FOOT</Text>
                </View>
              </View>
            </Card>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bilateral Asymmetry</Text>
              <AngiosomeTable
                asymmetries={{
                  mpa: result.asymmetry_mpa_c,
                  lpa: result.asymmetry_lpa_c,
                  mca: result.asymmetry_mca_c,
                  lca: result.asymmetry_lca_c,
                }}
                flagged={result.angiosomes_flagged}
                style={{ marginTop: Spacing.sm }}
              />
            </View>

            <TCIDisplay
              bilateralTci={result.bilateral_tci}
              leftTci={0.038}
              rightTci={0.046}
              style={styles.section}
            />
          </>
        ) : (
          <Card style={styles.section}>
            <Text style={styles.noResult}>
              No classification result available for this session.
            </Text>
          </Card>
        )}

        {vitals && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Recorded Vitals</Text>
            {(
              [
                ["Blood Glucose", `${vitals.blood_glucose_mgdl} mg/dL`],
                vitals.systolic_bp_mmhg != null
                  ? ["Blood Pressure", `${vitals.systolic_bp_mmhg}/${vitals.diastolic_bp_mmhg} mmHg`]
                  : null,
                vitals.heart_rate_bpm != null
                  ? ["Heart Rate", `${vitals.heart_rate_bpm} bpm`]
                  : null,
                vitals.hba1c_pct != null ? ["HbA1c", `${vitals.hba1c_pct}%`] : null,
              ] as ([string, string] | null)[]
            )
              .filter((item): item is [string, string] => item !== null)
              .map(([label, value]) => (
                <View key={label} style={styles.vitalRow}>
                  <Text style={styles.vitalLabel}>{label}</Text>
                  <Text style={styles.vitalValue}>{value}</Text>
                </View>
              ))}
          </Card>
        )}

        <Disclaimer text={DISCLAIMER_TEXT} style={styles.section} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 20, color: Colors.text.primary },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: "#f87171",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  date: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
  },
  time: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: 2,
  },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  thumbRow: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.sm },
  thumb: { flex: 1 },
  thumbLabel: {
    fontSize: 9,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.muted,
    textAlign: "center",
    letterSpacing: 1.5,
    marginTop: Spacing.xs,
  },
  noResult: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
  },
  vitalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  vitalLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.3,
  },
  vitalValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.primary,
  },
});
