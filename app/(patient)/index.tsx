// app/(patient)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { SessionCard } from "../../components/session/index";
import ThermalMap, {
  generateMockThermalMatrix,
} from "../../components/thermal/ThermalMap";
import { Badge, Card, Disclaimer } from "../../components/ui/index";
import { DISCLAIMER_TEXT } from "../../constants/clinical";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { dbg } from "../../lib/debug";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { Patient, ScreeningSession } from "../../types";

const { width: SCREEN_W } = Dimensions.get("window");
const THUMB_W = (SCREEN_W - Spacing.lg * 2 - Spacing.md) / 2;
const THUMB_H = Math.round(THUMB_W * (62 / 80));

export default function PatientDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const leftMatrix = useRef(generateMockThermalMatrix()).current;
  const rightMatrix = useRef(generateMockThermalMatrix()).current;

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setFetchError(null);
      try {
        const { data: patientData, error: patientErr } = await supabase
          .from("patients")
          .select("*")
          .eq("user_id", user.id)
          .single();
        dbg("patient/index", `patient fetch — error=${patientErr?.code ?? "none"} message=${patientErr?.message ?? "none"}`);
        if (patientErr?.code === "PGRST116") {
          // No patient record linked to this auth user yet
          setLoading(false);
          return;
        }
        if (patientErr) throw new Error("Failed to load patient data.");

        if (patientData) {
          setPatient(patientData as Patient);

          const { data: sessionsData, error: sessionsErr } = await supabase
            .from("screening_sessions")
            .select("*, classification:classification_results(*)")
            .eq("patient_id", patientData.id)
            .order("started_at", { ascending: false });
          if (sessionsErr) throw new Error("Failed to load sessions.");

          if (sessionsData) {
            setSessions(
              (sessionsData as unknown as Array<ScreeningSession & { classification: ScreeningSession["classification"][] }>).map((s) => ({
                ...s,
                classification: Array.isArray(s.classification)
                  ? s.classification[0] ?? undefined
                  : s.classification ?? undefined,
              })) as ScreeningSession[]
            );
          }
        }
      } catch (err: unknown) {
        setFetchError(err instanceof Error ? err.message : "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const latestSession = sessions[0] ?? null;
  const latestResult = latestSession?.classification;
  const isPositive = latestResult?.classification === "POSITIVE";

  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  if (loading) {
    return (
      <ScreenWrapper>
        <Header
          title="My Health"
          subtitle="Patient Dashboard"
          rightIcon={
            <TouchableOpacity onPress={handleLogout} accessibilityLabel="Sign out" accessibilityRole="button">
              <Ionicons name="log-out-outline" size={20} color={Colors.text.muted} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary[400]} />
        </View>
      </ScreenWrapper>
    );
  }

  if (fetchError) {
    return (
      <ScreenWrapper>
        <Header
          title="My Health"
          subtitle="Patient Dashboard"
          rightIcon={
            <TouchableOpacity onPress={handleLogout} accessibilityLabel="Sign out" accessibilityRole="button">
              <Ionicons name="log-out-outline" size={20} color={Colors.text.muted} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{fetchError}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable>
      <Header
          title="My Health"
          subtitle="Patient Dashboard"
          rightIcon={
            <TouchableOpacity onPress={handleLogout} accessibilityLabel="Sign out" accessibilityRole="button">
              <Ionicons name="log-out-outline" size={20} color={Colors.text.muted} />
            </TouchableOpacity>
          }
        />

      <View style={styles.container}>
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingHi}>Hello, {firstName} 👋</Text>
          <Text style={styles.greetingCode}>
            Patient ID: {patient?.patient_code ?? "—"}
          </Text>
        </View>

        {/* Latest result card */}
        {latestResult && latestSession ? (
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

            <View style={styles.classificationRow}>
              <Ionicons
                name={isPositive ? "warning-outline" : "checkmark-circle-outline"}
                size={20}
                color={isPositive ? "#f87171" : Colors.teal[300]}
              />
              <Text
                style={[
                  styles.latestClassification,
                  isPositive ? styles.positiveText : styles.negativeText,
                ]}
              >
                {isPositive ? " DPN Indicators Detected" : " No DPN Indicators"}
              </Text>
            </View>
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
        ) : (
          !loading && sessions.length === 0 && (
            <Card style={styles.section}>
              <Text style={styles.emptyText}>No screening sessions yet.</Text>
            </Card>
          )
        )}

        {/* Thermal images from latest session */}
        {latestResult && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Latest Thermal Scans</Text>
            <View style={styles.thumbRow}>
              <View style={styles.thumbWrapper}>
                <ThermalMap matrix={leftMatrix} minTemp={29} maxTemp={37} width={THUMB_W} height={THUMB_H} />
                <Text style={styles.thumbLabel}>LEFT FOOT</Text>
              </View>
              <View style={styles.thumbWrapper}>
                <ThermalMap matrix={rightMatrix} minTemp={29} maxTemp={37} width={THUMB_W} height={THUMB_H} />
                <Text style={styles.thumbLabel}>RIGHT FOOT</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Trend */}
        {sessions.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Screening History</Text>
            <View style={styles.trendRow}>
              {sessions.map((s) => {
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
        )}

        {/* Session list */}
        {sessions.length > 0 && (
          <>
            <Text style={styles.listHeader}>All Sessions</Text>
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onPress={() => router.push(`/(patient)/session/${s.id}` as any)}
              />
            ))}
          </>
        )}

        {/* Disclaimer */}
        <Disclaimer text={DISCLAIMER_TEXT} style={styles.disclaimer} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: "#f87171",
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },

  //Greeting
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

  //Latest result
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
  classificationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  latestClassification: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
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

  //Sections
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    textAlign: "center",
  },

  //Thumbs
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

  //Trend
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

  //Session list
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
