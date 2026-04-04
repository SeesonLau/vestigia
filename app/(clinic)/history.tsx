// app/(clinic)/history.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { getAllCaptures } from "../../lib/db/offlineCaptures";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { LocalCapture, ScreeningSession } from "../../types";

type Filter = "all" | "completed" | "failed";
type DataView = "cloud" | "local";

export default function HistoryScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  //View toggle
  const [activeView, setActiveView] = useState<DataView>("cloud");

  //Cloud state
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  //Local state
  const [localCaptures, setLocalCaptures] = useState<LocalCapture[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  //Fetch cloud sessions
  useEffect(() => {
    if (!user?.clinic_id) return;
    setCloudLoading(true);
    supabase
      .from("screening_sessions")
      .select("*, classification: classification_results(*)")
      .eq("clinic_id", user.clinic_id)
      .order("started_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setCloudError("Failed to load sessions.");
        else setSessions((data as ScreeningSession[]) ?? []);
        setCloudLoading(false);
      });
  }, [user?.clinic_id]);

  //Fetch local captures when switching to local view
  useEffect(() => {
    if ((activeView as string) !== "local") return;
    setLocalLoading(true);
    getAllCaptures()
      .then(setLocalCaptures)
      .finally(() => setLocalLoading(false));
  }, [activeView]);

  const filtered = sessions.filter((s) => {
    if (filter === "completed") return s.status === "completed";
    if (filter === "failed") return s.status === "failed" || s.status === "discarded";
    return true;
  });

  const renderSession = useCallback(({ item }: { item: ScreeningSession }) => (
    <SessionCard
      session={item}
      onPress={() => router.push(`/(clinic)/session/${item.id}` as any)}
    />
  ), [router]);

  const renderLocalCapture = useCallback(({ item }: { item: LocalCapture }) => (
    <View style={styles.localCard}>
      <View style={styles.localCardHeader}>
        <Text style={styles.localPatient}>{item.patient_label}</Text>
        {!item.synced && (
          <View style={styles.unsyncedBadge}>
            <Text style={styles.unsyncedText}>Unsynced</Text>
          </View>
        )}
        {item.synced && (
          <View style={styles.syncedBadge}>
            <Ionicons name="checkmark-circle-outline" size={12} color={Colors.teal[400]} />
            <Text style={styles.syncedText}>Synced</Text>
          </View>
        )}
      </View>
      <View style={styles.localCardRow}>
        <Ionicons name="footsteps-outline" size={13} color={Colors.text.muted} />
        <Text style={styles.localMeta}>
          {item.foot_side.charAt(0).toUpperCase() + item.foot_side.slice(1)} foot
        </Text>
        <Text style={styles.localMetaDivider}>·</Text>
        <Ionicons name="thermometer-outline" size={13} color={Colors.text.muted} />
        <Text style={styles.localMeta}>
          {item.min_temp.toFixed(1)}–{item.max_temp.toFixed(1)}°C
        </Text>
      </View>
      <Text style={styles.localDate}>
        {new Date(item.captured_at).toLocaleString()}
      </Text>
      {!item.synced && (
        <TouchableOpacity
          style={styles.syncBtn}
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: "/(clinic)/sync", params: { id: item.id } } as any)}
        >
          <Ionicons name="cloud-upload-outline" size={14} color={Colors.primary[300]} />
          <Text style={styles.syncBtnText}>Sync to Account</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [router]);

  const getClassification = (s: ScreeningSession) => {
    const c = s.classification;
    return Array.isArray(c) ? c[0]?.classification : c?.classification;
  };
  const positiveCount = sessions.filter((s) => getClassification(s) === "POSITIVE").length;
  const negativeCount = sessions.filter((s) => getClassification(s) === "NEGATIVE").length;
  const unsyncedCount = localCaptures.filter((c) => !c.synced).length;

  return (
    <ScreenWrapper>
      <Header title="Session History" />

      <View style={styles.container}>
        {/* Cloud | Local toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.togglePill, (activeView as string) === "cloud" && styles.togglePillActive]}
            onPress={() => setActiveView("cloud" as DataView)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="cloud-outline"
              size={14}
              color={(activeView as string) === "cloud" ? Colors.primary[300] : Colors.text.muted}
            />
            <Text style={[styles.toggleText, (activeView as string) === "cloud" && styles.toggleTextActive]}>
              Cloud
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.togglePill, (activeView as string) === "local" && styles.togglePillActive]}
            onPress={() => setActiveView("local" as DataView)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={14}
              color={(activeView as string) === "local" ? Colors.primary[300] : Colors.text.muted}
            />
            <Text style={[styles.toggleText, (activeView as string) === "local" && styles.toggleTextActive]}>
              Local
            </Text>
            {unsyncedCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unsyncedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Cloud view */}
        {(activeView as string) === "cloud" && (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{sessions.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.positiveValue]}>{positiveCount}</Text>
                <Text style={styles.statLabel}>Positive</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.negativeValue]}>{negativeCount}</Text>
                <Text style={styles.statLabel}>Negative</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {positiveCount + negativeCount > 0
                    ? `${((positiveCount / (positiveCount + negativeCount)) * 100).toFixed(0)}%`
                    : "—"}
                </Text>
                <Text style={styles.statLabel}>Pos. Rate</Text>
              </View>
            </View>

            <View style={styles.filterRow}>
              {(["all", "completed", "failed"] as Filter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.filterChip, filter === f && styles.filterChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {cloudLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={Colors.primary[400]} />
              </View>
            ) : cloudError ? (
              <View style={styles.emptyState}>
                <Text style={styles.errorText}>{cloudError}</Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(s) => s.id}
                renderItem={renderSession}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={48} color={Colors.text.muted} style={styles.emptyIcon} />
                    <Text style={styles.emptyText}>No sessions found</Text>
                  </View>
                }
              />
            )}
          </>
        )}

        {/* Local view */}
        {(activeView as string) === "local" && (
          <>
            {localLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={Colors.primary[400]} />
              </View>
            ) : localCaptures.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="phone-portrait-outline" size={48} color={Colors.text.muted} style={styles.emptyIcon} />
                <Text style={styles.emptyText}>No local captures</Text>
                <Text style={styles.emptyHint}>
                  Use Work Offline from the home screen to capture without an account.
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
            )}
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  //Toggle
  toggleRow: {
    flexDirection: "row",
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
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
  togglePillActive: {
    backgroundColor: "rgba(0,128,200,0.15)",
  },
  toggleText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
  },
  toggleTextActive: { color: Colors.primary[300] },
  badge: {
    backgroundColor: Colors.primary[500],
    borderRadius: Radius.full,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontFamily: Typography.fonts.heading, color: "#fff" },
  //Cloud stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: Typography.sizes.xl, fontFamily: Typography.fonts.heading, color: Colors.text.primary },
  positiveValue: { color: "#f87171" },
  negativeValue: { color: Colors.teal[300] },
  statLabel: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, color: Colors.text.muted, letterSpacing: 0.5, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border.subtle },
  filterRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  filterChipActive: { borderColor: Colors.primary[400], backgroundColor: "rgba(0,128,200,0.12)" },
  filterText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.label, color: Colors.text.muted, letterSpacing: 0.5 },
  filterTextActive: { color: Colors.primary[300] },
  //Local capture cards
  localCard: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  localCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  localPatient: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading, color: Colors.text.primary, flex: 1 },
  unsyncedBadge: {
    backgroundColor: "rgba(251,191,36,0.15)",
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
  },
  unsyncedText: { fontSize: 10, fontFamily: Typography.fonts.label, color: "#fbbf24" },
  syncedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  syncedText: { fontSize: 10, fontFamily: Typography.fonts.label, color: Colors.teal[400] },
  localCardRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  localMeta: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, color: Colors.text.muted },
  localMetaDivider: { color: Colors.text.muted, marginHorizontal: 2 },
  localDate: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, color: Colors.text.muted },
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
    borderColor: Colors.primary[700],
    backgroundColor: "rgba(0,128,200,0.08)",
  },
  syncBtnText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, color: Colors.primary[300] },
  //Shared
  list: { paddingBottom: Spacing["2xl"] },
  emptyState: { paddingVertical: Spacing["3xl"], alignItems: "center" },
  emptyIcon: { marginBottom: Spacing.md },
  emptyText: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.body, color: Colors.text.muted },
  emptyHint: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, color: Colors.text.muted, textAlign: "center", marginTop: Spacing.sm, lineHeight: 20 },
  errorText: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.body, color: "#f87171" },
});
