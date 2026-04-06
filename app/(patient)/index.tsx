// app/(patient)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { SessionCard } from "../../components/session/index";
import ThermalMap, {
  generateMockThermalMatrix,
} from "../../components/thermal/ThermalMap";
import { Badge, Card, Disclaimer } from "../../components/ui/index";
import { DISCLAIMER_TEXT } from "../../constants/clinical";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { dbg } from "../../lib/debug";
import { getMatrixStats, parseCsvMatrix } from "../../lib/thermal/preprocessing";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { Patient, ScreeningSession } from "../../types";

const { width: SCREEN_W } = Dimensions.get("window");
const THUMB_W = (SCREEN_W - Spacing.lg * 2 - Spacing.md) / 2;
const THUMB_H = Math.round(THUMB_W * (120 / 160));

export default function PatientDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
  const [pendingRequests, setPendingRequests] = useState(0);
  const leftMatrix = useRef(generateMockThermalMatrix()).current;
  const rightMatrix = useRef(generateMockThermalMatrix()).current;

  //Import
  const [importedLeftMatrix, setImportedLeftMatrix] = useState<number[][] | null>(null);
  const [importedRightMatrix, setImportedRightMatrix] = useState<number[][] | null>(null);
  const [importedImageUri, setImportedImageUri] = useState<string | null>(null);
  const [importedImageName, setImportedImageName] = useState<string | null>(null);
  const [importedCsvName, setImportedCsvName] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importStep, setImportStep] = useState<"left" | "right" | null>(null);

  const handlePickImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setImportedImageUri(asset.uri);
    setImportedImageName(asset.name);
  };

  const handlePickCsv = async (foot: "left" | "right") => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/csv", "text/plain", "text/comma-separated-values", "*/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setImportStep(foot);
    setImportLoading(true);
    try {
      const content = await fetch(asset.uri).then((r) => r.text());
      const parsed = parseCsvMatrix(content);
      getMatrixStats(parsed); // validates it has numeric data
      if (foot === "left") {
        setImportedLeftMatrix(parsed);
      } else {
        setImportedRightMatrix(parsed);
      }
      setImportedCsvName(asset.name);
    } catch {
      Alert.alert("CSV Error", "Could not read temperature data. Ensure the file contains comma-separated °C values.");
    } finally {
      setImportLoading(false);
      setImportStep(null);
    }
  };

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

        const { count } = await supabase
          .from("data_requests")
          .select("id", { count: "exact", head: true })
          .eq("to_id", user.id)
          .eq("status", "pending");
        setPendingRequests(count ?? 0);
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

  const headerRight = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <TouchableOpacity
        onPress={() => router.push("/(patient)/sync" as any)}
        accessibilityLabel="Data requests"
        accessibilityRole="button"
        style={{ position: "relative" }}
      >
        <Ionicons name="notifications-outline" size={20} color={pendingRequests > 0 ? colors.accent : colors.textSec} />
        {pendingRequests > 0 && (
          <View style={[styles.notifBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.notifBadgeText}>{pendingRequests}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/(patient)/settings")} accessibilityLabel="Settings" accessibilityRole="button">
        <Ionicons name="settings-outline" size={20} color={colors.textSec} />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleLogout} accessibilityLabel="Sign out" accessibilityRole="button">
        <Ionicons name="log-out-outline" size={20} color={colors.textSec} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="My Health" subtitle="Patient Dashboard" rightIcon={headerRight} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenWrapper>
    );
  }

  if (fetchError) {
    return (
      <ScreenWrapper>
        <Header title="My Health" subtitle="Patient Dashboard" rightIcon={headerRight} />
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.error }]}>{fetchError}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable>
      <Header title="My Health" subtitle="Patient Dashboard" rightIcon={headerRight} />

      <View style={styles.container}>
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingHi, { color: colors.text }]}>Hello, {firstName} 👋</Text>
          <Text style={[styles.greetingCode, { color: colors.textSec }]}>
            Patient ID: {patient?.patient_code ?? "—"}
          </Text>
        </View>

        {/* Latest result card */}
        {latestResult && latestSession ? (
          <View
            style={[
              styles.latestCard,
              isPositive
                ? { backgroundColor: `${colors.error}14`, borderColor: `${colors.error}66` }
                : { backgroundColor: `${colors.success}14`, borderColor: `${colors.success}66` },
            ]}
          >
            <View style={styles.latestTop}>
              <Text style={[styles.latestLabel, { color: colors.textSec }]}>Latest Screening Result</Text>
              <Badge
                label={latestResult.classification}
                variant={isPositive ? "positive" : "negative"}
              />
            </View>

            <View style={styles.classificationRow}>
              <Ionicons
                name={isPositive ? "warning-outline" : "checkmark-circle-outline"}
                size={20}
                color={isPositive ? colors.error : colors.success}
              />
              <Text
                style={[
                  styles.latestClassification,
                  { color: isPositive ? colors.error : colors.success },
                ]}
              >
                {isPositive ? " DPN Indicators Detected" : " No DPN Indicators"}
              </Text>
            </View>
            <Text style={[styles.latestDate, { color: colors.textSec }]}>
              Screened on{" "}
              {new Date(latestSession.started_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>

            {isPositive && (
              <View style={styles.flaggedRow}>
                <Text style={[styles.flaggedLabel, { color: colors.textSec }]}>Flagged regions: </Text>
                <Text style={[styles.flaggedValues, { color: colors.error }]}>
                  {latestResult.angiosomes_flagged?.join(", ") ?? "—"}
                </Text>
              </View>
            )}

            <Text style={[styles.confidenceText, { color: colors.textSec }]}>
              AI Confidence:{" "}
              {latestResult.confidence_score != null
                ? `${(latestResult.confidence_score * 100).toFixed(1)}%`
                : "—"}
            </Text>
          </View>
        ) : (
          !loading && sessions.length === 0 && (
            <Card style={styles.section}>
              <Text style={[styles.emptyText, { color: colors.textSec }]}>No screening sessions yet.</Text>
            </Card>
          )
        )}

        {/* Thermal images from latest session */}
        {latestResult && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Latest Thermal Scans</Text>

            {/* Thermal thumbnails */}
            <View style={styles.thumbRow}>
              <View style={styles.thumbWrapper}>
                <ThermalMap
                  matrix={importedLeftMatrix ?? leftMatrix}
                  minTemp={importedLeftMatrix ? getMatrixStats(importedLeftMatrix).min : 29}
                  maxTemp={importedLeftMatrix ? getMatrixStats(importedLeftMatrix).max : 37}
                  width={THUMB_W}
                  height={THUMB_H}
                />
                <Text style={[styles.thumbLabel, { color: colors.textSec }]}>LEFT FOOT</Text>
              </View>
              <View style={styles.thumbWrapper}>
                <ThermalMap
                  matrix={importedRightMatrix ?? rightMatrix}
                  minTemp={importedRightMatrix ? getMatrixStats(importedRightMatrix).min : 29}
                  maxTemp={importedRightMatrix ? getMatrixStats(importedRightMatrix).max : 37}
                  width={THUMB_W}
                  height={THUMB_H}
                />
                <Text style={[styles.thumbLabel, { color: colors.textSec }]}>RIGHT FOOT</Text>
              </View>
            </View>

            {/* Reference image thumbnail */}
            {importedImageUri && (
              <View style={styles.refImageWrapper}>
                <Image source={{ uri: importedImageUri }} style={styles.refImage} resizeMode="cover" />
                <Text style={[styles.refImageLabel, { color: colors.textSec }]}>
                  Reference: {importedImageName}
                </Text>
              </View>
            )}

            {/* Import controls */}
            <View style={styles.importDivider}>
              <View style={[styles.importLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.importDividerText, { color: colors.textSec }]}>import scan files</Text>
              <View style={[styles.importLine, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.importRow}>
              {/* Image */}
              <TouchableOpacity
                onPress={handlePickImage}
                style={[styles.importCard, { backgroundColor: colors.bg, borderColor: importedImageName ? colors.accent : colors.border }]}
                activeOpacity={0.7}
              >
                <Ionicons name="image-outline" size={18} color={importedImageName ? colors.accent : colors.textSec} />
                <Text style={[styles.importCardTitle, { color: importedImageName ? colors.accent : colors.text }]}>
                  Thermal Image
                </Text>
                <Text style={[styles.importCardFile, { color: colors.textSec }]} numberOfLines={1}>
                  {importedImageName ?? "JPG / PNG"}
                </Text>
                {importedImageName && (
                  <TouchableOpacity
                    onPress={() => { setImportedImageUri(null); setImportedImageName(null); }}
                    style={styles.importClear}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Ionicons name="close-circle" size={14} color={colors.textSec} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Left CSV */}
              <TouchableOpacity
                onPress={() => handlePickCsv("left")}
                style={[styles.importCard, { backgroundColor: colors.bg, borderColor: importedLeftMatrix ? colors.success : colors.border }]}
                activeOpacity={0.7}
                disabled={importLoading && importStep === "left"}
              >
                <Ionicons name="document-text-outline" size={18} color={importedLeftMatrix ? colors.success : colors.textSec} />
                <Text style={[styles.importCardTitle, { color: importedLeftMatrix ? colors.success : colors.text }]}>
                  Left CSV
                </Text>
                <Text style={[styles.importCardFile, { color: colors.textSec }]} numberOfLines={1}>
                  {importLoading && importStep === "left" ? "Parsing…" : (importedLeftMatrix ? (importedCsvName ?? "Loaded") : "°C data")}
                </Text>
                {importedLeftMatrix && (
                  <TouchableOpacity
                    onPress={() => setImportedLeftMatrix(null)}
                    style={styles.importClear}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Ionicons name="close-circle" size={14} color={colors.textSec} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Right CSV */}
              <TouchableOpacity
                onPress={() => handlePickCsv("right")}
                style={[styles.importCard, { backgroundColor: colors.bg, borderColor: importedRightMatrix ? colors.success : colors.border }]}
                activeOpacity={0.7}
                disabled={importLoading && importStep === "right"}
              >
                <Ionicons name="document-text-outline" size={18} color={importedRightMatrix ? colors.success : colors.textSec} />
                <Text style={[styles.importCardTitle, { color: importedRightMatrix ? colors.success : colors.text }]}>
                  Right CSV
                </Text>
                <Text style={[styles.importCardFile, { color: colors.textSec }]} numberOfLines={1}>
                  {importLoading && importStep === "right" ? "Parsing…" : (importedRightMatrix ? "Loaded" : "°C data")}
                </Text>
                {importedRightMatrix && (
                  <TouchableOpacity
                    onPress={() => setImportedRightMatrix(null)}
                    style={styles.importClear}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Ionicons name="close-circle" size={14} color={colors.textSec} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Trend */}
        {sessions.length > 0 && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Screening History</Text>
            <View style={styles.trendRow}>
              {sessions.map((s) => {
                const cls = s.classification?.classification;
                const dotColor =
                  cls === "POSITIVE" ? colors.error
                  : cls === "NEGATIVE" ? colors.success
                  : colors.textSec;
                return (
                  <View key={s.id} style={styles.trendItem}>
                    <View style={[styles.trendDot, { backgroundColor: dotColor }]} />
                    <Text style={[styles.trendDate, { color: colors.textSec }]}>
                      {new Date(s.started_at).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                    <Text style={[styles.trendResult, { color: dotColor }]}>
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
            <Text style={[styles.listHeader, { color: colors.textSec }]}>All Sessions</Text>
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
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
  },
  greetingCode: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    marginTop: Spacing.xs,
  },

  //Latest result
  latestCard: {
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
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
  latestDate: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
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
  },
  flaggedValues: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
  },
  confidenceText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    marginTop: Spacing.xs,
  },

  //Sections
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
  },

  //Thumbs
  thumbRow: { flexDirection: "row", gap: Spacing.md },
  thumbWrapper: { flex: 1 },
  thumbLabel: {
    fontSize: 9,
    fontFamily: Typography.fonts.heading,
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
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  disclaimer: { marginTop: Spacing.md },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    borderRadius: Radius.full,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 9, fontFamily: Typography.fonts.heading, color: "#fff" },
  //Import section
  refImageWrapper: { marginTop: Spacing.sm, marginBottom: Spacing.md },
  refImage: { width: "100%", height: 80, borderRadius: Radius.sm },
  refImageLabel: { fontSize: 10, fontFamily: Typography.fonts.mono, marginTop: 4 },
  importDivider: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.sm },
  importLine: { flex: 1, height: 1 },
  importDividerText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
  importRow: { flexDirection: "row", gap: Spacing.xs },
  importCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  importCardTitle: { fontSize: 10, fontFamily: Typography.fonts.heading, textAlign: "center" },
  importCardFile: { fontSize: 9, fontFamily: Typography.fonts.mono, textAlign: "center" },
  importClear: { position: "absolute", top: 4, right: 4 },
});
