// app/(clinic)/history.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { ScreeningSession } from "../../types";

type Filter = "all" | "completed" | "failed";

export default function HistoryScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!user?.clinic_id) return;
    setLoading(true);
    supabase
      .from("screening_sessions")
      .select("*, classification: classification_results(*)")
      .eq("clinic_id", user.clinic_id)
      .order("started_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError("Failed to load sessions.");
        else setSessions((data as ScreeningSession[]) ?? []);
        setLoading(false);
      });
  }, [user?.clinic_id]);

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

  return (
    <ScreenWrapper>
      <Header title="Session History" />

      <View style={styles.container}>
        {/* Stats strip */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.positiveValue]}>
              {positiveCount}
            </Text>
            <Text style={styles.statLabel}>Positive</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.negativeValue]}>
              {negativeCount}
            </Text>
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

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {(["all", "completed", "failed"] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                filter === f ? styles.filterChipActive : undefined,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f ? styles.filterTextActive : undefined,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={Colors.primary[400]} />
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(s) => s.id}
            renderItem={({ item }) => (
              <SessionCard
                session={item}
                onPress={() => router.push(`/(clinic)/session/${item.id}` as any)}
              />
            )}
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
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
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
  statValue: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
  },
  positiveValue: { color: "#f87171" },
  negativeValue: { color: Colors.teal[300] },
  statLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border.subtle,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: "transparent",
  },
  filterChipActive: {
    borderColor: Colors.primary[400],
    backgroundColor: "rgba(0, 128, 200, 0.12)",
  },
  filterText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  filterTextActive: { color: Colors.primary[300] },
  list: {
    paddingBottom: Spacing["2xl"],
  },
  emptyState: {
    paddingVertical: Spacing["3xl"],
    alignItems: "center",
  },
  emptyIcon: { marginBottom: Spacing.md },
  emptyText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
  },
  errorText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: "#f87171",
  },
});
