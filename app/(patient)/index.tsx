// app/(patient)/index.tsx
import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { SessionCard } from "../../components/session/index";
import ThermalMap, {
    generateMockThermalMatrix,
} from "../../components/thermal/ThermalMap";
import { Badge, Card, Disclaimer } from "../../components/ui/index";
import { DISCLAIMER_TEXT } from "../../constants/clinical";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { ScreeningSession } from "../../types";

const { width: SCREEN_W } = Dimensions.get("window");
const THUMB_W = (SCREEN_W - Spacing.lg * 2 - Spacing.md) / 2;
const THUMB_H = Math.round(THUMB_W * (62 / 80));

const MOCK_PATIENT_SESSIONS: ScreeningSession[] = [
  {
    id: "1",
    patient_id: "me",
    operator_id: "o1",
    device_id: "d1",
    clinic_id: "c1",
    status: "completed",
    started_at: "2025-02-20T09:15:00Z",
    completed_at: "2025-02-20T09:28:00Z",
    classification: {
      id: "r1",
      session_id: "1",
      classification: "POSITIVE",
      confidence_score: 0.874,
      model_version: "v1.2",
      classified_at: "2025-02-20T09:27:00Z",
      angiosomes_flagged: ["MPA", "MCA"],
    },
  },
  {
    id: "2",
    patient_id: "me",
    operator_id: "o1",
    device_id: "d1",
    clinic_id: "c1",
    status: "completed",
    started_at: "2025-01-10T14:00:00Z",
    completed_at: "2025-01-10T14:12:00Z",
    classification: {
      id: "r2",
      session_id: "2",
      classification: "NEGATIVE",
      confidence_score: 0.932,
      model_version: "v1.2",
      classified_at: "2025-01-10T14:11:00Z",
    },
  },
];

const latestSession = MOCK_PATIENT_SESSIONS[0];
const latestResult = latestSession.classification;
const isPositive = latestResult?.classification === "POSITIVE";

export default function PatientDashboardScreen() {
  const leftMatrix = generateMockThermalMatrix();
  const rightMatrix = generateMockThermalMatrix();

  return (
    <ScreenWrapper scrollable>
      <Header title="My Health" subtitle="Patient Dashboard — UI-09" />

      <View style={styles.container}>
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingHi}>Hello, Juan 👋</Text>
          <Text style={styles.greetingCode}>Patient ID: DPN-P-0042</Text>
        </View>

        {/* Latest result card */}
        {latestResult && (
          <View
            style={[
              styles.latestCard,
              isPositive ? styles.latestPositive : styles.latestNegative,
            ]}
          >
            <View style={styles.latestTop}>
              <Text style={styles.latestLabel}>Latest Screening Result</Text>
              <Badge
                label={latestResult.classification}
                variant={isPositive ? "positive" : "negative"}
              />
            </View>

            <Text
              style={[
                styles.latestClassification,
                isPositive ? styles.positiveText : styles.negativeText,
              ]}
            >
              {isPositive ? "⚠ DPN Indicators Detected" : "✓ No DPN Indicators"}
            </Text>
            <Text style={styles.latestDate}>
              Screened on{" "}
              {new Date(latestSession.started_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>

            {isPositive && (
              <View style={styles.flaggedRow}>
                <Text style={styles.flaggedLabel}>Flagged regions: </Text>
                <Text style={styles.flaggedValues}>
                  {latestResult.angiosomes_flagged?.join(", ") ?? "—"}
                </Text>
              </View>
            )}

            <Text style={styles.confidenceText}>
              AI Confidence:{" "}
              {latestResult.confidence_score != null
                ? `${(latestResult.confidence_score * 100).toFixed(1)}%`
                : "—"}
            </Text>
          </View>
        )}

        {/* Thermal images from latest session */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Thermal Scans</Text>
          <View style={styles.thumbRow}>
            <View style={styles.thumbWrapper}>
              <ThermalMap
                matrix={leftMatrix}
                minTemp={29}
                maxTemp={37}
                width={THUMB_W}
                height={THUMB_H}
              />
              <Text style={styles.thumbLabel}>LEFT FOOT</Text>
            </View>
            <View style={styles.thumbWrapper}>
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

        {/* Trend */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Screening History</Text>
          <View style={styles.trendRow}>
            {MOCK_PATIENT_SESSIONS.map((s, i) => {
              const cls = s.classification?.classification;
              return (
                <View key={s.id} style={styles.trendItem}>
                  <View
                    style={[
                      styles.trendDot,
                      {
                        backgroundColor:
                          cls === "POSITIVE"
                            ? Colors.positive
                            : cls === "NEGATIVE"
                              ? Colors.negative
                              : Colors.text.muted,
                      },
                    ]}
                  />
                  <Text style={styles.trendDate}>
                    {new Date(s.started_at).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  <Text
                    style={[
                      styles.trendResult,
                      {
                        color:
                          cls === "POSITIVE"
                            ? "#f87171"
                            : cls === "NEGATIVE"
                              ? Colors.teal[300]
                              : Colors.text.muted,
                      },
                    ]}
                  >
                    {cls ?? "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Session list */}
        <Text style={styles.listHeader}>All Sessions</Text>
        {MOCK_PATIENT_SESSIONS.map((s) => (
          <SessionCard key={s.id} session={s} onPress={() => {}} />
        ))}

        {/* Disclaimer */}
        <Disclaimer text={DISCLAIMER_TEXT} style={styles.disclaimer} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },

  // Greeting
  greeting: { marginBottom: Spacing.lg },
  greetingHi: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
  },
  greetingCode: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
    marginTop: Spacing.xs,
  },

  // Latest result
  latestCard: {
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  latestPositive: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.4)",
  },
  latestNegative: {
    backgroundColor: "rgba(20,176,142,0.08)",
    borderColor: "rgba(20,176,142,0.4)",
  },
  latestTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  latestLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  latestClassification: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.xs,
  },
  positiveText: { color: "#f87171" },
  negativeText: { color: Colors.teal[300] },
  latestDate: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginBottom: Spacing.sm,
  },
  flaggedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  flaggedLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
  },
  flaggedValues: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: "#f87171",
  },
  confidenceText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
    marginTop: Spacing.xs,
  },

  // Sections
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },

  // Thumbs
  thumbRow: { flexDirection: "row", gap: Spacing.md },
  thumbWrapper: { flex: 1 },
  thumbLabel: {
    fontSize: 9,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.muted,
    textAlign: "center",
    letterSpacing: 1.5,
    marginTop: Spacing.xs,
  },

  // Trend
  trendRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  trendItem: { alignItems: "center", gap: 4 },
  trendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  trendDate: {
    fontSize: 10,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
  },
  trendResult: {
    fontSize: 9,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },

  // Session list
  listHeader: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  disclaimer: { marginTop: Spacing.md },
});
