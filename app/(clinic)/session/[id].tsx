// app/(clinic)/session/[id].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
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
import {
    MOCK_CLINIC_SESSIONS,
    MOCK_PATIENTS,
    MOCK_VITALS,
} from "../../../data/mockData";

const { width: W } = Dimensions.get("window");
const THUMB_W = (W - Spacing.lg * 2 - Spacing.md) / 2;
const THUMB_H = Math.round(THUMB_W * (62 / 80));

const leftMatrix = generateMockThermalMatrix();
const rightMatrix = generateMockThermalMatrix();

export default function ClinicSessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const session = MOCK_CLINIC_SESSIONS.find((s) => s.id === id);
  const vitals = id ? MOCK_VITALS[id] : undefined;
  const patient = session
    ? MOCK_PATIENTS.find((p) => p.id === session.patient_id)
    : undefined;

  if (!session) {
    return (
      <ScreenWrapper>
        <Header
          title="Session Detail"
          onLeftPress={() => router.back()}
          leftIcon={<Text style={styles.backIcon}>←</Text>}
        />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Session not found.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const result = session.classification;
  const date = new Date(session.started_at);

  return (
    <ScreenWrapper>
      <Header
        title="Session Detail"
        subtitle={session.id}
        leftIcon={<Text style={styles.backIcon}>←</Text>}
        onLeftPress={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Patient</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Patient Code</Text>
            <Text style={styles.infoVal}>{patient?.patient_code ?? "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Diabetes Type</Text>
            <Text style={styles.infoVal}>{patient?.diabetes_type ?? "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Duration</Text>
            <Text style={styles.infoVal}>
              {patient?.diabetes_duration_years != null
                ? `${patient.diabetes_duration_years} yrs`
                : "—"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Date</Text>
            <Text style={styles.infoVal}>
              {date.toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoKey}>Status</Text>
            <Badge
              label={session.status}
              variant={
                session.status === "completed"
                  ? "negative"
                  : session.status === "failed"
                    ? "positive"
                    : "muted"
              }
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

            {/* Thermal thumbnails */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Thermal Captures</Text>
              <View style={styles.thumbRow}>
                <View style={styles.thumbWrap}>
                  <ThermalMap
                    matrix={leftMatrix}
                    minTemp={29}
                    maxTemp={37}
                    width={THUMB_W}
                    height={THUMB_H}
                  />
                  <Text style={styles.thumbLabel}>LEFT FOOT</Text>
                </View>
                <View style={styles.thumbWrap}>
                  <ThermalMap
                    matrix={rightMatrix}
                    minTemp={29}
                    maxTemp={37}
                    width={THUMB_W}
                    height={THUMB_H}
                  />
                  <Text style={styles.thumbLabel}>RIGHT FOOT</Text>
                </View>
              </View>
            </Card>

            {/* Asymmetry */}
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
              style={styles.section}
            />
          </>
        )}

        {/* Vitals */}
        {vitals && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Vitals</Text>
            {(
              [
                ["Blood Glucose", `${vitals.blood_glucose_mgdl} mg/dL`],
                [
                  "Blood Pressure",
                  `${vitals.systolic_bp_mmhg}/${vitals.diastolic_bp_mmhg} mmHg`,
                ],
                ["Heart Rate", `${vitals.heart_rate_bpm} bpm`],
                ["HbA1c", vitals.hba1c_pct ? `${vitals.hba1c_pct}%` : "—"],
              ] as [string, string][]
            ).map(([k, v]) => (
              <View key={k} style={styles.infoRow}>
                <Text style={styles.infoKey}>{k}</Text>
                <Text style={styles.infoVal}>{v}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Model info */}
        {result && (
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
        )}

        <Disclaimer text={DISCLAIMER_TEXT} style={styles.section} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  backIcon: { fontSize: 20, color: Colors.primary[300] },
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
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
  },
});
