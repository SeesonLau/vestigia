// app/(clinic)/session/[id].tsx
import { Ionicons } from "@expo/vector-icons";
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

export default function ClinicSessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const leftMatrix = useRef(generateMockThermalMatrix()).current;
  const rightMatrix = useRef(generateMockThermalMatrix()).current;
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
        <Header title="Session Detail" leftIcon={<Ionicons name="arrow-back-outline" size={22} color={Colors.text.secondary} />} onLeftPress={() => router.back()} />
        <View style={styles.centered}><ActivityIndicator color={Colors.primary[400]} /></View>
      </ScreenWrapper>
    );
  }

  if (error || !session) {
    return (
      <ScreenWrapper>
        <Header title="Session Detail" leftIcon={<Ionicons name="arrow-back-outline" size={22} color={Colors.text.secondary} />} onLeftPress={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? "Session not found."}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const result = session.classification;
  const vitals = session.vitals;
  const date = new Date(session.started_at);

  return (
    <ScreenWrapper>
      <Header
        title="Session Detail"
        subtitle={session.id.slice(0, 8)}
        leftIcon={<Ionicons name="arrow-back-outline" size={22} color={Colors.text.secondary} />}
        onLeftPress={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Session meta */}
        <Card style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Date</Text>
            <Text style={styles.infoVal}>
              {date.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Time</Text>
            <Text style={styles.infoVal}>
              {date.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoKey}>Status</Text>
            <Badge
              label={session.status}
              variant={session.status === "completed" ? "negative" : session.status === "failed" ? "positive" : "muted"}
              size="sm"
            />
          </View>
        </Card>

        {/* Classification */}
        {result && (
          <>
            <ClassificationCard
              classification={result.classification}
              confidence={result.confidence_score}
              style={styles.section}
            />

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Thermal Captures</Text>
              <View style={styles.thumbRow}>
                <View style={styles.thumbWrap}>
                  <ThermalMap matrix={leftMatrix} minTemp={29} maxTemp={37} width={THUMB_W} height={THUMB_H} />
                  <Text style={styles.thumbLabel}>LEFT FOOT</Text>
                </View>
                <View style={styles.thumbWrap}>
                  <ThermalMap matrix={rightMatrix} minTemp={29} maxTemp={37} width={THUMB_W} height={THUMB_H} />
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

            <TCIDisplay bilateralTci={result.bilateral_tci} style={styles.section} />

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Model Info</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Model Version</Text>
                <Text style={styles.infoVal}>{result.model_version}</Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoKey}>Processing Time</Text>
                <Text style={styles.infoVal}>{result.processing_time_ms}ms</Text>
              </View>
            </Card>
          </>
        )}

        {/* Vitals */}
        {vitals && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Vitals</Text>
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
              .map(([k, v]) => (
                <View key={k} style={styles.infoRow}>
                  <Text style={styles.infoKey}>{k}</Text>
                  <Text style={styles.infoVal}>{v}</Text>
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
  backIcon: { fontSize: 20, color: Colors.primary[300] },
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
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  infoKey: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
  },
  infoVal: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.primary,
  },
  thumbRow: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.sm },
  thumbWrap: { flex: 1 },
  thumbLabel: {
    fontSize: 9,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.muted,
    textAlign: "center",
    letterSpacing: 1.5,
    marginTop: Spacing.xs,
  },
});
