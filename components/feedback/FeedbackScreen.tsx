// components/feedback/FeedbackScreen.tsx
// Shared screen rendered by both `(clinic)/feedback.tsx` and
// `(patient)/feedback.tsx`. The submitter role is inferred server-side
// (the `submit_support_ticket` RPC reads it from `profiles.role`), so we
// don't need a role prop here — the same UI works for both.
//
// Layout: top-of-screen segmented control toggles between two tabs:
//   • Submit — at-a-glance stats over the user's own tickets, then a
//     compact submission form below (Category + body, QA code auto).
//   • My Tickets — filter / sort / search toolbar over the ticket list,
//     matching the admin-web inbox affordances.

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../layout/Header";
import ScreenWrapper from "../layout/ScreenWrapper";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Picker, { type PickerOption } from "../ui/Picker";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
  USER_FACING_CATEGORIES,
  type SupportTicket,
  type TicketCategory,
  type TicketStatus,
  listMyTickets,
  submitSupportTicket,
} from "../../lib/admin/supportTickets";

type Tab = "submit" | "list";
type StatusFilter = TicketStatus | "all";
type SortKey = "newest" | "oldest" | "status";

const CATEGORY_OPTIONS: PickerOption[] = USER_FACING_CATEGORIES.map((value) => ({
  value,
  label: TICKET_CATEGORY_LABELS[value],
}));

const CATEGORY_FILTER_OPTIONS: PickerOption[] = [
  { value: "all", label: "All categories" },
  ...USER_FACING_CATEGORIES.map((value) => ({
    value,
    label: TICKET_CATEGORY_LABELS[value],
  })),
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all",         label: "All"         },
  { value: "open",        label: "Open"        },
  { value: "in_progress", label: "In progress" },
  { value: "resolved",    label: "Resolved"    },
];

const SORT_OPTIONS: PickerOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "status", label: "Status (open first)" },
];

const STATUS_WEIGHT: Record<TicketStatus, number> = {
  open: 2,
  in_progress: 1,
  resolved: 0,
};

export default function FeedbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [tab, setTab] = useState<Tab>("submit");

  // Form — subject is no longer entered; the server auto-assigns a
  // QA-code subject (UX-22, BUG-23, …) based on the picked category.
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [body, setBody]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ category?: string; body?: string }>({});

  // List state
  const [tickets, setTickets]     = useState<SupportTicket[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // List toolbar state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [search, setSearch] = useState("");

  // Detail expansion
  const [expanded, setExpanded] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await listMyTickets();
      setTickets(rows);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch on focus so the list reflects admin-side resolutions when
  // the user returns to the screen.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refreshList().catch(() => {});
    }, [refreshList]),
  );

  // ── Stats over the user's own tickets ──────────────────────────
  const stats = useMemo(() => {
    const total = tickets.length;
    let open = 0, inProgress = 0, resolved = 0;
    for (const t of tickets) {
      if (t.status === "open")        open++;
      else if (t.status === "in_progress") inProgress++;
      else if (t.status === "resolved")    resolved++;
    }
    return { total, open, inProgress, resolved };
  }, [tickets]);

  // ── Filter / sort / search pipeline ───────────────────────────
  const visibleTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = tickets.filter((t) => {
      if (statusFilter   !== "all" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (q) {
        const hit = t.subject.toLowerCase().includes(q)
          || t.body.toLowerCase().includes(q)
          || (t.admin_response?.toLowerCase().includes(q) ?? false);
        if (!hit) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      switch (sortKey) {
        case "newest": return b.created_at.localeCompare(a.created_at);
        case "oldest": return a.created_at.localeCompare(b.created_at);
        case "status": return STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status]
                            || b.created_at.localeCompare(a.created_at);
        default: return 0;
      }
    });
    return out;
  }, [tickets, statusFilter, categoryFilter, search, sortKey]);

  const activeFilterCount =
    (statusFilter   !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (search.trim()  !== ""    ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setSearch("");
    setSortKey("newest");
  };

  // ── Submission ────────────────────────────────────────────────
  const validate = () => {
    const next: typeof errors = {};
    if (!category) next.category = "Pick a category.";
    const trimmedBody = body.trim();
    if (trimmedBody.length < 3 || trimmedBody.length > 4000)
      next.body = "Describe your concern in 3–4000 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { subject: assigned } = await submitSupportTicket({
        category: category!,
        body:     body.trim(),
      });
      setCategory(null);
      setBody("");
      setErrors({});
      Alert.alert(
        "Ticket submitted",
        `Your ticket ${assigned} has been filed. An admin will respond as soon as possible.`,
        [
          { text: "OK" },
          { text: "View My Tickets", onPress: () => setTab("list") },
        ],
      );
      await refreshList();
    } catch (e) {
      Alert.alert("Could not submit", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header
        title="Customer Support"
        leftIcon={
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Tab toggle */}
      <View style={[styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(["submit", "list"] as Tab[]).map((value) => {
          const active = tab === value;
          const label = value === "submit" ? "Submit New Ticket" : "My Tickets";
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setTab(value)}
              activeOpacity={0.8}
              style={[styles.tabBtn, active && { backgroundColor: colors.accent }]}
            >
              <Text style={[
                styles.tabBtnText,
                { color: active ? "#fff" : colors.textSec },
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {tab === "submit" ? (
            <>
              {/* Stats strip */}
              <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Stat label="Total"       value={stats.total}      colors={colors} />
                <Divider colors={colors} />
                <Stat label="Open"        value={stats.open}       colors={colors} accent={colors.accent} />
                <Divider colors={colors} />
                <Stat label="In progress" value={stats.inProgress} colors={colors} accent={colors.warning} />
                <Divider colors={colors} />
                <Stat label="Resolved"    value={stats.resolved}   colors={colors} accent={colors.success} />
              </View>

              {/* Compact submit form */}
              <View style={[styles.submitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Submit a new ticket</Text>
                <Picker
                  label="Category"
                  value={category}
                  options={CATEGORY_OPTIONS}
                  onChange={(v) => setCategory(v as TicketCategory)}
                  error={errors.category}
                />
                <Input
                  label="Describe your concern"
                  value={body}
                  onChangeText={(v) => { setBody(v); if (errors.body) setErrors({ ...errors, body: undefined }); }}
                  error={errors.body}
                  multiline
                  numberOfLines={4}
                  autoCapitalize="sentences"
                />
                <Text style={[styles.hint, { color: colors.textSec }]}>
                  A ticket code (e.g. UX-22, BUG-23) is assigned automatically on submit.
                </Text>
                <Button
                  label="Submit Ticket"
                  onPress={handleSubmit}
                  loading={submitting}
                  size="md"
                />
              </View>
            </>
          ) : (
            <>
              {/* List toolbar — search + status pills + category/sort dropdowns */}
              <View style={[styles.toolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={14} color={colors.textSec} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search subject, body, response"
                    placeholderTextColor={colors.textSec}
                    style={[styles.searchInput, { color: colors.text }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {search.length > 0 ? (
                    <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                      <Ionicons name="close-circle" size={14} color={colors.textSec} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.pillRow}>
                  {STATUS_FILTERS.map(({ value, label }) => {
                    const active = statusFilter === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setStatusFilter(value)}
                        activeOpacity={0.7}
                        style={[
                          styles.pill,
                          {
                            borderColor: active ? colors.accent : colors.border,
                            backgroundColor: active ? `${colors.accent}1F` : "transparent",
                          },
                        ]}
                      >
                        <Text style={[
                          styles.pillText,
                          { color: active ? colors.accent : colors.textSec },
                        ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.dropdownRow}>
                  <View style={styles.dropdownCell}>
                    <Picker
                      label="Category"
                      value={categoryFilter}
                      options={CATEGORY_FILTER_OPTIONS}
                      onChange={(v) => setCategoryFilter(v as TicketCategory | "all")}
                    />
                  </View>
                  <View style={styles.dropdownCell}>
                    <Picker
                      label="Sort by"
                      value={sortKey}
                      options={SORT_OPTIONS}
                      onChange={(v) => setSortKey(v as SortKey)}
                    />
                  </View>
                </View>

                <View style={styles.toolbarFooter}>
                  <Text style={[styles.toolbarCount, { color: colors.textSec }]}>
                    Showing {visibleTickets.length} of {tickets.length}
                  </Text>
                  {activeFilterCount > 0 ? (
                    <TouchableOpacity onPress={clearFilters} activeOpacity={0.7} hitSlop={6}>
                      <Text style={[styles.clearLink, { color: colors.accent }]}>
                        Clear ({activeFilterCount})
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {loading ? (
                <ActivityIndicator color={colors.accent} style={{ paddingVertical: Spacing.lg }} />
              ) : loadError ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{loadError}</Text>
              ) : visibleTickets.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="chatbox-outline" size={24} color={colors.textSec} />
                  <Text style={[styles.emptyText, { color: colors.textSec }]}>
                    {tickets.length === 0
                      ? "No tickets yet. Submit one from the other tab."
                      : "No tickets match the current filters."}
                  </Text>
                </View>
              ) : (
                visibleTickets.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    expanded={expanded === t.id}
                    onPress={() => setExpanded(expanded === t.id ? null : t.id)}
                    colors={colors}
                  />
                ))
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

function Stat({
  label, value, colors, accent,
}: {
  label: string;
  value: number;
  colors: import("../../constants/theme").ThemeColors;
  accent?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: accent ?? colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSec }]}>{label}</Text>
    </View>
  );
}

function Divider({ colors }: { colors: import("../../constants/theme").ThemeColors }) {
  return <View style={[styles.statDivider, { backgroundColor: colors.border }]} />;
}

function TicketCard({
  ticket, expanded, onPress, colors,
}: {
  ticket: SupportTicket;
  expanded: boolean;
  onPress: () => void;
  colors: import("../../constants/theme").ThemeColors;
}) {
  const statusColor =
    ticket.status === "resolved" ? colors.success
    : ticket.status === "in_progress" ? colors.warning
    : colors.accent;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.ticketHead}>
        <Text style={[styles.ticketSubject, { color: colors.text }]} numberOfLines={1}>
          {ticket.subject}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}1A` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {TICKET_STATUS_LABELS[ticket.status]}
          </Text>
        </View>
      </View>

      <View style={styles.ticketMeta}>
        <Text style={[styles.categoryText, { color: colors.accent }]} numberOfLines={1}>
          {TICKET_CATEGORY_LABELS[ticket.category]}
        </Text>
        <Text style={[styles.ticketDate, { color: colors.textSec }]}>
          {new Date(ticket.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
        </Text>
      </View>

      {expanded ? (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.bodyLabel, { color: colors.textSec }]}>YOUR MESSAGE</Text>
          <Text style={[styles.bodyText, { color: colors.text }]}>{ticket.body}</Text>

          {ticket.admin_response ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.bodyLabel, { color: colors.textSec }]}>ADMIN RESPONSE</Text>
              <Text style={[styles.bodyText, { color: colors.text }]}>{ticket.admin_response}</Text>
            </>
          ) : null}
        </>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing["2xl"], gap: Spacing.sm },

  // Tab toggle
  tabRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.full,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: Radius.full,
  },
  tabBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 0.5,
  },

  // Stats row
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: Typography.sizes.xl, fontFamily: Typography.fonts.heading },
  statLabel: { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 0.5, marginTop: 2, textTransform: "uppercase" },
  statDivider: { width: 1, height: 28 },

  // Submit form card
  submitCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.heading,
    marginBottom: 2,
  },
  hint: { fontSize: 11, fontFamily: Typography.fonts.body, lineHeight: 16, marginTop: -Spacing.xs },

  // List toolbar
  toolbar: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    paddingVertical: 2,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  pillText: { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
  dropdownRow: { flexDirection: "row", gap: Spacing.sm },
  dropdownCell: { flex: 1 },
  toolbarFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toolbarCount: { fontSize: 11, fontFamily: Typography.fonts.body },
  clearLink: { fontSize: 11, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },

  // List states
  emptyCard: {
    alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1, borderRadius: Radius.lg, paddingVertical: Spacing.lg,
  },
  emptyText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center" },
  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", paddingVertical: Spacing.lg },

  // Ticket card
  ticketCard: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    gap: 2, marginBottom: 4,
  },
  ticketHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Spacing.sm },
  ticketMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Spacing.sm },
  categoryText: { flex: 1, fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  statusDot:  { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 0.3 },
  ticketSubject: { flex: 1, fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.subheading },
  ticketDate: { fontSize: 10, fontFamily: Typography.fonts.mono },

  divider: { height: 1, marginVertical: Spacing.xs },
  bodyLabel: {
    fontSize: 10, fontFamily: Typography.fonts.heading, letterSpacing: 1, textTransform: "uppercase",
  },
  bodyText: {
    fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, lineHeight: 20,
  },
});
