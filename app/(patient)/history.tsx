// app/(patient)/history.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { getAllBundles, type ThermalBundle } from "../../lib/thermal/bundleStorage";
import { dbg } from "../../lib/debug";
import { syncLocalBundle, type SyncPatientSnapshot } from "../../lib/thermal/localBundleSync";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { ScreeningSession } from "../../types";

type DataView = "cloud" | "local";
type Filter = "all" | "analyzed" | "pending" | "discarded";

export default function PatientHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  const [activeView, setActiveView] = useState<DataView>("cloud");

  //Cloud state
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  //Local state — bundles persisted by lib/thermal/bundleStorage (AsyncStorage).
  const [localBundles, setLocalBundles] = useState<ThermalBundle[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [syncingCode, setSyncingCode] = useState<string | null>(null);

  //Refetch on focus so the Analyzed pill updates after running an assessment.
  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;
    setCloudLoading(true);
    try {
      const { data, error } = await supabase
        .from("screening_sessions")
        .select("*, classification:classification_results(*), clinic_discarded_at, patient_discarded_at")
        .eq("subject_profile_id", user.id)
        .order("started_at", { ascending: false });

      dbg("patient/history", `sessions fetch — error=${error?.code ?? "none"}`);
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
  }, [user?.id]);

  useFocusEffect(useCallback(() => { fetchSessions(); }, [fetchSessions]));

  //Fetch local bundles when local tab is opened
  useEffect(() => {
    if (activeView !== "local") return;
    setLocalLoading(true);
    getAllBundles().then(setLocalBundles).finally(() => setLocalLoading(false));
  }, [activeView]);

  const getClassification = (s: ScreeningSession) => {
    const c = s.classification;
    return Array.isArray(c) ? c[0]?.classification : c?.classification;
  };

  const filtered = sessions.filter((s) => {
    const discarded = !!s.patient_discarded_at;
    if (filter === "discarded") {
      return discarded;
    }
    if (discarded) return false;
    if (filter === "analyzed" && !getClassification(s)) return false;
    if (filter === "pending"  &&  getClassification(s)) return false;
    return true;
  });
  const activeSessions = sessions.filter((s) => !s.patient_discarded_at);
  const positiveCount = activeSessions.filter((s) => getClassification(s) === "POSITIVE").length;
  const negativeCount = activeSessions.filter((s) => getClassification(s) === "NEGATIVE").length;
  const discardedCount = sessions.length - activeSessions.length;

  const renderSession = useCallback(({ item }: { item: ScreeningSession }) => (
    <SessionCard
      session={item}
      onPress={() => router.push(`/(patient)/bundle-detail?session_id=${item.id}` as any)}
    />
  ), [router]);

  // Sync a single local bundle into the signed-in patient's own cloud
  // history. The local snapshot's first/middle/last name + birthdate +
  // sex + weight + height are overwritten with the patient's profile
  // before upload, so the cloud copy reflects the authenticated account
  // rather than whatever was typed in offline.
  const handleSyncBundle = useCallback((bundle: ThermalBundle) => {
    if (!user?.id) return;
    Alert.alert(
      "Sync to my account?",
      `Bundle ${bundle.bundle_code} will be uploaded to your account. The name, birthdate, sex, weight, and height will be replaced by your profile values.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sync",
          style: "default",
          onPress: async () => {
            setSyncingCode(bundle.bundle_code);
            try {
              const { data: profile, error: profErr } = await supabase
                .from("profiles")
                .select("first_name, middle_name, last_name, sex, date_of_birth")
                .eq("id", user.id)
                .maybeSingle();
              if (profErr) throw new Error(profErr.message);
              if (!profile) throw new Error("Your profile is missing.");

              const snapshot: SyncPatientSnapshot = {
                first_name:    profile.first_name,
                middle_name:   profile.middle_name ?? null,
                last_name:     profile.last_name,
                sex:           profile.sex ?? null,
                date_of_birth: profile.date_of_birth ?? null,
                // Weight + height live on the patients table, not on profiles.
                // For self-sync we keep whatever was entered offline; the user
                // can re-capture if those numbers go stale.
                weight_kg:     bundle.patient.weight_kg ?? null,
                height_cm:     bundle.patient.height_cm ?? null,
              };

              const result = await syncLocalBundle(bundle, {
                capture_mode:       "patient_self",
                subject_profile_id: user.id,
                patient_id:         null,
                clinic_id:          null,
                operator_id:        null,
                patient_snapshot:   snapshot,
              });
              await refreshLocal();
              Alert.alert(
                "Synced",
                `Bundle ${bundle.bundle_code} is now in your cloud history.`,
                [
                  {
                    text: "View Session",
                    onPress: () => router.push(`/(patient)/bundle-detail?session_id=${result.session_id}` as any),
                  },
                  { text: "OK" },
                ],
              );
            } catch (e) {
              Alert.alert("Sync Failed", e instanceof Error ? e.message : "Please try again.");
            } finally {
              setSyncingCode(null);
            }
          },
        },
      ],
    );
  }, [user?.id, router]);

  // Reload the AsyncStorage list (used after a successful sync so the
  // freshly-synced row shows the green badge without leaving the screen).
  const refreshLocal = useCallback(async () => {
    setLocalLoading(true);
    try {
      const all = await getAllBundles();
      setLocalBundles(all);
    } finally {
      setLocalLoading(false);
    }
  }, []);

  const renderLocalBundle = useCallback(({ item }: { item: ThermalBundle }) => {
    const p = item.patient;
    const name = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ").trim() || "Local capture";
    const captured = new Date(item.captured_at);
    const isSyncing = syncingCode === item.bundle_code;
    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/(offline)/bundle-detail" as any, params: { code: item.bundle_code } })}
        activeOpacity={0.75}
        style={[styles.localCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.localCardHeader}>
          <Text style={[styles.localPatient, { color: colors.text }]} numberOfLines={1}>{name}</Text>
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
        <Text style={[styles.localCode, { color: colors.accent }]} numberOfLines={1}>{item.bundle_code}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="thermometer-outline" size={12} color={colors.textSec} />
          <Text style={[styles.metaText, { color: colors.textSec }]}>
            L {item.left.stats.min.toFixed(1)}–{item.left.stats.max.toFixed(1)}°C
          </Text>
          <Text style={[styles.metaDivider, { color: colors.textSec }]}>·</Text>
          <Ionicons name="thermometer-outline" size={12} color={colors.textSec} />
          <Text style={[styles.metaText, { color: colors.textSec }]}>
            R {item.right.stats.min.toFixed(1)}–{item.right.stats.max.toFixed(1)}°C
          </Text>
        </View>
        <Text style={[styles.dateText, { color: colors.textSec }]}>{captured.toLocaleString()}</Text>
        {!item.synced && (
          <TouchableOpacity
            style={[styles.syncBtn, { borderColor: colors.border, backgroundColor: `${colors.accent}14` }]}
            activeOpacity={0.8}
            onPress={(e) => { e.stopPropagation(); handleSyncBundle(item); }}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={14} color={colors.accent} />
                <Text style={[styles.syncBtnText, { color: colors.accent }]}>Sync to my account</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }, [router, colors, handleSyncBundle, syncingCode]);

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
                { label: "Total", value: String(activeSessions.length), color: colors.text },
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
              {(["all", "analyzed", "pending", "discarded"] as Filter[]).map((f) => {
                const label =
                  f === "all" ? "All"
                  : f === "analyzed" ? "Analyzed"
                  : f === "pending" ? "Pending"
                  : `Discarded${discardedCount > 0 ? ` (${discardedCount})` : ""}`;
                return (
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
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
          ) : localBundles.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="phone-portrait-outline" size={48} color={colors.textSec} style={{ marginBottom: Spacing.md }} />
              <Text style={[styles.emptyText, { color: colors.textSec }]}>No local bundles</Text>
              <Text style={[styles.emptyHint, { color: colors.textSec }]}>
                Captures you take from the Live Feed tab will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={localBundles}
              keyExtractor={(b) => b.bundle_code}
              renderItem={renderLocalBundle}
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
  localCode: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono, letterSpacing: 0.4 },
  syncedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  syncedText: { fontSize: 10, fontFamily: Typography.fonts.label },
  unsyncedBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  unsyncedText: { fontSize: 10, fontFamily: Typography.fonts.label },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
  metaDivider: { marginHorizontal: 2 },
  dateText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  syncBtnText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label },
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
