// app/(clinic)/history.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
import { MOCK_CLINIC_SESSIONS } from "../../data/mockData";
import { ScreeningSession } from "../../types";

const MOCK_SESSIONS: ScreeningSession[] = MOCK_CLINIC_SESSIONS;

type Filter = "all" | "completed" | "failed";

export default function HistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = MOCK_SESSIONS.filter((s) => {
    if (filter === "completed") return s.status === "completed";
    if (filter === "failed")
      return s.status === "failed" || s.status === "discarded";
    return true;
  });

  const positiveCount = MOCK_SESSIONS.filter(
    (s) => s.classification?.classification === "POSITIVE",
  ).length;
  const negativeCount = MOCK_SESSIONS.filter(
    (s) => s.classification?.classification === "NEGATIVE",
  ).length;

  return (
    <ScreenWrapper>
      <Header title="Session History" subtitle="UI-06" />

      <View style={styles.container}>
        {/* Stats strip */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{MOCK_SESSIONS.length}</Text>
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

        {/* List */}
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
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No sessions found</Text>
            </View>
          }
        />
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
  emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
  emptyText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
  },
});
