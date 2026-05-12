// app/(clinic)/history.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { SessionCard } from "../../components/session/index";
import InitialsAvatar, { personInitials } from "../../components/ui/InitialsAvatar";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { getAllBundles, type ThermalBundle } from "../../lib/thermal/bundleStorage";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { ScreeningSession } from "../../types";

type Filter = "all" | "analyzed" | "pending" | "discarded";
type SortOrder = "newest" | "oldest";
type DataView = "cloud" | "local";

interface Section { title: string; sub?: string; data: ScreeningSession[] }

export default function HistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  //Optional drill-down filter from Manage Patients
  const { patient_id } = useLocalSearchParams<{ patient_id?: string }>();

  const [activeView, setActiveView] = useState<DataView>("cloud");
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [search, setSearch] = useState("");
  const [groupByPatient, setGroupByPatient] = useState(false);
  const [localBundles, setLocalBundles] = useState<ThermalBundle[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  //Patient label for the header subtitle when drilled in
  const [drillLabel, setDrillLabel] = useState<string | null>(null);

  //Refetch on focus so the Analyzed pill updates as soon as the user comes
  //back from the assessment screen. The clinic_discarded_at filter happens
  //client-side so the same fetch can power both the active and discarded
  //views without a second round trip.
  const fetchSessions = useCallback(() => {
    if (!user?.clinic_id) return;
    setCloudLoading(true);
    //RLS already gates visibility AND includes self-captures shared via
    //clinic_access; filtering client-side by clinic_id would hide them.
    let q = supabase
      .from("screening_sessions")
      .select("*, classification: classification_results(*), clinic_discarded_at, patient_discarded_at");
    if (patient_id) q = q.eq("patient_id", patient_id);
    q.order("started_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setCloudError("Failed to load sessions.");
        else setSessions((data as ScreeningSession[]) ?? []);
        setCloudLoading(false);
      });
  }, [user?.clinic_id, patient_id]);

  useFocusEffect(useCallback(() => { fetchSessions(); }, [fetchSessions]));

  //Resolve patient label for drill-down header
  useEffect(() => {
    if (!patient_id) { setDrillLabel(null); return; }
    supabase
      .from("patients")
      .select("profile:profiles!inner(patient_code, full_name)")
      .eq("id", patient_id)
      .maybeSingle()
      .then(({ data }) => {
        const p = (data as unknown as { profile: { patient_code: string; full_name: string } } | null)?.profile;
        if (p) setDrillLabel(`${p.full_name} · ${p.patient_code}`);
      });
  }, [patient_id]);

  // Refetch local bundles every time the Local tab is opened so the
  // list stays in sync with anything saved from the offline guest flow
  // since we last looked.
  useEffect(() => {
    if ((activeView as string) !== "local") return;
    setLocalLoading(true);
    getAllBundles().then(setLocalBundles).finally(() => setLocalLoading(false));
  }, [activeView]);

  const sessionPatientName = useCallback((s: ScreeningSession): string => {
    const snap = s.patient_snapshot as
      | { first_name?: string | null; middle_name?: string | null; last_name?: string | null }
      | null
      | undefined;
    if (!snap) return "";
    return [snap.first_name, snap.middle_name, snap.last_name]
      .filter(Boolean).join(" ").trim();
  }, []);

  const getClassification = useCallback((s: ScreeningSession) => {
    const c = s.classification;
    return Array.isArray(c) ? c[0]?.classification : c?.classification;
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let arr = sessions.filter((s) => {
      const discarded = !!s.clinic_discarded_at;
      // Active filters hide discarded rows entirely; only the explicit
      // "Discarded" filter surfaces them.
      if (filter === "discarded") {
        if (!discarded) return false;
      } else {
        if (discarded) return false;
        if (filter === "analyzed" && !getClassification(s)) return false;
        if (filter === "pending"  &&  getClassification(s)) return false;
      }
      if (needle) {
        const name = sessionPatientName(s).toLowerCase();
        const code = (s.bundle_code ?? "").toLowerCase();
        if (!name.includes(needle) && !code.includes(needle)) return false;
      }
      return true;
    });
    arr = arr.slice().sort((a, b) => {
      const aT = new Date(a.started_at).getTime();
      const bT = new Date(b.started_at).getTime();
      return sortOrder === "newest" ? bT - aT : aT - bT;
    });
    return arr;
  }, [sessions, filter, search, sortOrder, sessionPatientName, getClassification]);

  //Group filtered sessions by patient (subject_profile_id) when toggle is on.
  //Drill-down view always renders flat (already a single patient).
  const sections: Section[] = useMemo(() => {
    if (!groupByPatient || patient_id) return [];
    const map = new Map<string, Section>();
    for (const s of filtered) {
      const key = s.subject_profile_id ?? "unknown";
      const name = sessionPatientName(s) || "Unnamed patient";
      const existing = map.get(key);
      if (existing) existing.data.push(s);
      else map.set(key, { title: name, sub: s.bundle_code ?? undefined, data: [s] });
    }
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [filtered, groupByPatient, patient_id, sessionPatientName]);

  const renderSession = useCallback(({ item }: { item: ScreeningSession }) => (
    <SessionCard
      session={item}
      onPress={() => router.push(`/(clinic)/bundle-detail?session_id=${item.id}` as any)}
    />
  ), [router]);

  // Local bundles persist via lib/thermal/bundleStorage (AsyncStorage),
  // not the SQLite local_captures path. Tapping a card routes into the
  // shared offline bundle-detail viewer which reads the same store.
  const renderLocalBundle = useCallback(({ item }: { item: ThermalBundle }) => {
    const p = item.patient;
    const name = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ").trim() || "Local capture";
    const captured = new Date(item.captured_at);
    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/(offline)/bundle-detail" as any, params: { code: item.bundle_code } })}
        activeOpacity={0.75}
        style={[styles.localCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.localCardHeader}>
          <Text style={[styles.localPatient, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          {item.synced ? (
            <View style={styles.syncedBadge}>
              <Ionicons name="checkmark-circle-outline" size={12} color={colors.success} />
              <Text style={[styles.syncedText, { color: colors.success }]}>Synced</Text>
            </View>
          ) : (
            <View style={[styles.unsyncedBadge, { backgroundColor: `${colors.warning}26`, borderColor: `${colors.warning}4D` }]}>
              <Text style={[styles.unsyncedText, { color: colors.warning }]}>Unsynced</Text>
            </View>
          )}
        </View>
        <Text style={[styles.localCode, { color: colors.accent }]} numberOfLines={1}>{item.bundle_code}</Text>
        <View style={styles.localCardRow}>
          <Ionicons name="thermometer-outline" size={12} color={colors.textSec} />
          <Text style={[styles.localMeta, { color: colors.textSec }]}>
            L {item.left.stats.min.toFixed(1)}–{item.left.stats.max.toFixed(1)}°C
          </Text>
          <Text style={[styles.localMetaDivider, { color: colors.textSec }]}>·</Text>
          <Ionicons name="thermometer-outline" size={12} color={colors.textSec} />
          <Text style={[styles.localMeta, { color: colors.textSec }]}>
            R {item.right.stats.min.toFixed(1)}–{item.right.stats.max.toFixed(1)}°C
          </Text>
        </View>
        <Text style={[styles.localDate, { color: colors.textSec }]}>{captured.toLocaleString()}</Text>
      </TouchableOpacity>
    );
  }, [router, colors]);

  // Stats are computed over the active (non-discarded) set so the totals
  // reflect what the clinic chooses to keep.
  const activeSessions = sessions.filter((s) => !s.clinic_discarded_at);
  const positiveCount = activeSessions.filter((s) => getClassification(s) === "POSITIVE").length;
  const negativeCount = activeSessions.filter((s) => getClassification(s) === "NEGATIVE").length;
  const discardedCount = sessions.length - activeSessions.length;
  const unsyncedCount = localBundles.filter((b) => !b.synced).length;

  return (
    <ScreenWrapper>
      <Header
        title={patient_id ? "Patient History" : "Session History"}
        subtitle={drillLabel ?? undefined}
        leftIcon={
          patient_id ? (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : undefined
        }
        rightIcon={
          activeView === "cloud" ? (
            <InitialsAvatar
              initials={personInitials(user?.first_name, user?.last_name)}
              seed={user?.clinic_id ?? user?.id ?? "operator"}
              imageUrl={user?.avatar_url}
              size={32}
              borderWidth={1}
              borderColor={`${colors.accent}66`}
            />
          ) : undefined
        }
      />

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
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Text>
              {v === "local" && unsyncedCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.badge }]}>
                  <Text style={[styles.badgeText, { color: colors.badgeText }]}>{unsyncedCount}</Text>
                </View>
              )}
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

            {/* Search box */}
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={16} color={colors.textSec} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by patient or bundle code"
                placeholderTextColor={colors.textSec}
                style={[styles.searchInput, { color: colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textSec} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Filter chips */}
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

            {/* Sort + group toggles */}
            <View style={styles.toolRow}>
              <TouchableOpacity
                onPress={() => setSortOrder((s) => (s === "newest" ? "oldest" : "newest"))}
                style={[styles.toolBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={sortOrder === "newest" ? "arrow-down-outline" : "arrow-up-outline"}
                  size={14}
                  color={colors.textSec}
                />
                <Text style={[styles.toolBtnText, { color: colors.textSec }]}>
                  {sortOrder === "newest" ? "Newest first" : "Oldest first"}
                </Text>
              </TouchableOpacity>

              {!patient_id ? (
                <TouchableOpacity
                  onPress={() => setGroupByPatient((g) => !g)}
                  style={[
                    styles.toolBtn,
                    {
                      borderColor: groupByPatient ? colors.accent : colors.border,
                      backgroundColor: groupByPatient ? `${colors.accent}1F` : colors.card,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="people-outline"
                    size={14}
                    color={groupByPatient ? colors.accent : colors.textSec}
                  />
                  <Text style={[styles.toolBtnText, { color: groupByPatient ? colors.accent : colors.textSec }]}>
                    Group by patient
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {cloudLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : cloudError ? (
              <View style={styles.emptyState}>
                <Text style={[styles.errorText, { color: colors.error }]}>{cloudError}</Text>
              </View>
            ) : groupByPatient && !patient_id ? (
              <SectionList
                sections={sections}
                keyExtractor={(s) => s.id}
                renderItem={renderSession}
                renderSectionHeader={({ section }) => (
                  <View style={[styles.sectionHeader, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                    <Text style={[styles.sectionCount, { color: colors.textSec }]}>
                      {section.data.length} session{section.data.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                )}
                stickySectionHeadersEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={48} color={colors.textSec} style={styles.emptyIcon} />
                    <Text style={[styles.emptyText, { color: colors.textSec }]}>No sessions found</Text>
                  </View>
                }
              />
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(s) => s.id}
                renderItem={renderSession}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={48} color={colors.textSec} style={styles.emptyIcon} />
                    <Text style={[styles.emptyText, { color: colors.textSec }]}>No sessions found</Text>
                  </View>
                }
              />
            )}
          </>
        )}

        {/* Local view */}
        {activeView === "local" && (
          localLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : localBundles.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="phone-portrait-outline" size={48} color={colors.textSec} style={styles.emptyIcon} />
              <Text style={[styles.emptyText, { color: colors.textSec }]}>No local bundles</Text>
              <Text style={[styles.emptyHint, { color: colors.textSec }]}>
                Use Work Offline from the home screen to capture without an account.
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
  toggleText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
  },
  badge: {
    borderRadius: Radius.full,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontFamily: Typography.fonts.heading },
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
  filterRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    paddingVertical: 4,
  },
  toolRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  toolBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  toolBtnText: {
    fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
  },
  sectionTitle: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading },
  sectionCount: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
  localCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  localCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  localPatient: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading, flex: 1 },
  unsyncedBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  unsyncedText: { fontSize: 10, fontFamily: Typography.fonts.label },
  syncedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  syncedText: { fontSize: 10, fontFamily: Typography.fonts.label },
  localCode: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono, letterSpacing: 0.4 },
  localCardRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  localMeta: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
  localMetaDivider: { marginHorizontal: 2 },
  localDate: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
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
  list: { paddingBottom: Spacing["2xl"] },
  emptyState: { paddingVertical: Spacing["3xl"], alignItems: "center" },
  emptyIcon: { marginBottom: Spacing.md },
  emptyText: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.body },
  emptyHint: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", marginTop: Spacing.sm, lineHeight: 20 },
  errorText: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.body },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  headerAvatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontSize: 11,
    fontFamily: Typography.fonts.heading,
  },
});
