// app/(patient)/history.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { SessionCard } from "../../components/session/index";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { getAllCaptures } from "../../lib/db/offlineCaptures";
import { dbg } from "../../lib/debug";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { LocalCapture, Patient, ScreeningSession } from "../../types";

type DataView = "cloud" | "local";
type Filter = "all" | "completed" | "failed";

export default function PatientHistoryScreen() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  const [activeView, setActiveView] = useState<DataView>("cloud");

  //Cloud state
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  //Local state
  const [localCaptures, setLocalCaptures] = useState<LocalCapture[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  //Fetch cloud sessions — RLS automatically restricts to this patient's own data
  useEffect(() => {
    if (!user?.id) return;
    setCloudLoading(true);

    const fetchSessions = async () => {
      try {
        //Resolve patient record first
        const { data: patientData, error: patientErr } = await supabase
          .from("patients")
          .select("id")
          .eq("user_id", user.id)
          .single();
        dbg("patient/history", `patient fetch — error=${patientErr?.code ?? "none"}`);

        if (patientErr?.code === "PGRST116") {
          //No patient record yet — cloud history will be empty
          setCloudLoading(false);
          return;
        }
        if (patientErr) throw new Error("Failed to load patient data.");

        const { data, error } = await supabase
          .from("screening_sessions")
          .select("*, classification:classification_results(*)")
          .eq("patient_id", (patientData as Patient).id)
          .order("started_at", { ascending: false });

        if (error) throw new Error("Failed to load sessions.");

        setSessions(
          (data as unknown as Array<ScreeningSession & { classification: ScreeningSession["classification"][] }>).map((s) => ({
            ...s,
            classification: Array.isArray(s.classification)
              ? s.classification[0] ?? undefined
              : s.classification ?? undefined,
          })) as ScreeningSession[]
        );
      } catch (err: unknown) {
        setCloudError(err instanceof Error ? err.message : "Failed to load sessions.");
      } finally {
        setCloudLoading(false);
      }
    };

    fetchSessions();
  }, [user?.id]);

  //Fetch local captures when local tab is opened
  useEffect(() => {
    if (activeView !== "local") return;
    setLocalLoading(true);
    getAllCaptures().then(setLocalCaptures).finally(() => setLocalLoading(false));
  }, [activeView]);

  const filtered = sessions.filter((s) => {
    if (filter === "completed") return s.status === "completed";
    if (filter === "failed") return s.status === "failed" || s.status === "discarded";
    return true;
  });

  const getClassification = (s: ScreeningSession) => {
    const c = s.classification;
    return Array.isArray(c) ? c[0]?.classification : c?.classification;
  };
  const positiveCount = sessions.filter((s) => getClassification(s) === "POSITIVE").length;
  const negativeCount = sessions.filter((s) => getClassification(s) === "NEGATIVE").length;

  const renderSession = useCallback(({ item }: { item: ScreeningSession }) => (
    <SessionCard session={item} />
  ), []);

  const renderLocalCapture = useCallback(({ item }: { item: LocalCapture }) => (
    <View style={[styles.localCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.localCardHeader}>
        <Text style={[styles.localPatient, { color: colors.text }]}>{item.patient_label}</Text>
        {item.synced ? (
          <View style={styles.syncedRow}>
            <Ionicons name="checkmark-circle-outline" size={12} color={colors.success} />
            <Text style={[styles.syncedText, { color: colors.success }]}>Synced</Text>
          </View>
        ) : (
          <View style={[styles.unsyncedBadge, { backgroundColor: `${colors.warning}26`, borderColor: `${colors.warning}4D` }]}>
            <Text style={[styles.unsyncedText, { color: colors.warning }]}>Local only</Text>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="footsteps-outline" size={13} color={colors.textSec} />
        <Text style={[styles.metaText, { color: colors.textSec }]}>
          {item.foot_side.charAt(0).toUpperCase() + item.foot_side.slice(1)} foot
        </Text>
        <Text style={[styles.metaDivider, { color: colors.textSec }]}>·</Text>
        <Ionicons name="thermometer-outline" size={13} color={colors.textSec} />
        <Text style={[styles.metaText, { color: colors.textSec }]}>
          {item.min_temp.toFixed(1)}–{item.max_temp.toFixed(1)}°C
        </Text>
      </View>

      <Text style={[styles.dateText, { color: colors.textSec }]}>
        {new Date(item.captured_at).toLocaleString()}
      </Text>
    </View>
  ), [colors]);

  return (
    <ScreenWrapper>
      <Header title="My History" />

      <View style={styles.container}>
        {/* Cloud | Local toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["cloud", "local"] as DataView[]).map((v) => (
            <TouchableOpacity
              key={v}
              style={[
                styles.togglePill,
                activeView === v && { backgroundColor: `${colors.accent}26` },
              ]}
              onPress={() => setActiveView(v)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={v === "cloud" ? "cloud-outline" : "phone-portrait-outline"}
                size={14}
                color={activeView === v ? colors.accent : colors.textSec}
              />
              <Text style={[styles.toggleText, { color: activeView === v ? colors.accent : colors.textSec }]}>
                {v === "cloud" ? "Cloud" : "Device"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cloud view */}
        {activeView === "cloud" && (
          <>
            <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { label: "Total", value: String(sessions.length), color: colors.text },
                { label: "Positive", value: String(positiveCount), color: colors.error },
                { label: "Negative", value: String(negativeCount), color: colors.success },
                {
                  label: "Pos. Rate",
                  value: positiveCount + negativeCount > 0
                    ? `${((positiveCount / (positiveCount + negativeCount)) * 100).toFixed(0)}%`
                    : "—",
                  color: colors.text,
                },
              ].map(({ label, value, color }, i, arr) => (
                <React.Fragment key={label}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color }]}>{value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSec }]}>{label}</Text>
                  </View>
                  {i < arr.length - 1 && (
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>

            <View style={styles.filterRow}>
              {(["all", "completed", "failed"] as Filter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: filter === f ? colors.accent : colors.border,
                      backgroundColor: filter === f ? `${colors.accent}1F` : "transparent",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterText, { color: filter === f ? colors.accent : colors.textSec }]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {cloudLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : cloudError ? (
              <View style={styles.centered}>
                <Text style={[styles.errorText, { color: colors.error }]}>{cloudError}</Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(s) => s.id}
                renderItem={renderSession}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <View style={styles.centered}>
                    <Ionicons name="cloud-outline" size={48} color={colors.textSec} style={{ marginBottom: Spacing.md }} />
                    <Text style={[styles.emptyText, { color: colors.textSec }]}>No sessions yet</Text>
                    <Text style={[styles.emptyHint, { color: colors.textSec }]}>
                      Sessions from your clinic visits will appear here after the clinic syncs your data.
                    </Text>
                  </View>
                }
              />
            )}
          </>
        )}

        {/* Local view */}
        {activeView === "local" && (
          localLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : localCaptures.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="phone-portrait-outline" size={48} color={colors.textSec} style={{ marginBottom: Spacing.md }} />
              <Text style={[styles.emptyText, { color: colors.textSec }]}>No local captures</Text>
              <Text style={[styles.emptyHint, { color: colors.textSec }]}>
                Captures you take from the Live Feed tab will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={localCaptures}
              keyExtractor={(c) => c.id}
              renderItem={renderLocalCapture}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
            />
          )
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: Spacing["3xl"] },
  toggleRow: {
    flexDirection: "row",
    borderRadius: Radius.full,
    borderWidth: 1,
    padding: 3,
    marginBottom: Spacing.lg,
    alignSelf: "center",
  },
  togglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  toggleText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.label },
  statsRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: Typography.sizes.xl, fontFamily: Typography.fonts.heading },
  statLabel: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, letterSpacing: 0.5, marginTop: 2 },
  statDivider: { width: 1, height: 36 },
  filterRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
  list: { paddingBottom: Spacing["2xl"] },
  localCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  localCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  localPatient: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading, flex: 1 },
  syncedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  syncedText: { fontSize: 10, fontFamily: Typography.fonts.label },
  unsyncedBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  unsyncedText: { fontSize: 10, fontFamily: Typography.fonts.label },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
  metaDivider: { marginHorizontal: 2 },
  dateText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
  emptyText: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.body },
  emptyHint: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  errorText: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.body },
});
