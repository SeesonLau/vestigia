// components/feedback/FeedbackScreen.tsx
// Shared screen rendered by both `(clinic)/feedback.tsx` and
// `(patient)/feedback.tsx`. The submitter role is inferred server-side
// (the `submit_support_ticket` RPC reads it from `profiles.role`), so we
// don't need a role prop here — the same UI works for both.
//
// Layout: form on top (Category picker + Subject + Body) → Submit
// button → "My Tickets" list below, with a status filter and tap-to-
// expand for the body / admin response.

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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

const CATEGORY_OPTIONS: PickerOption[] = USER_FACING_CATEGORIES.map((value) => ({
  value,
  label: TICKET_CATEGORY_LABELS[value],
}));

const STATUS_FILTERS: { value: TicketStatus | "all"; label: string }[] = [
  { value: "all",         label: "All"          },
  { value: "open",        label: "Open"         },
  { value: "in_progress", label: "In progress"  },
  { value: "resolved",    label: "Resolved"     },
];

export default function FeedbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // Form — subject is no longer entered; the server auto-assigns a
  // QA-code subject (UX-22, BUG-23, …) based on the picked category.
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [body, setBody]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ category?: string; body?: string }>({});

  // List
  const [tickets, setTickets]     = useState<SupportTicket[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter,   setFilter]     = useState<TicketStatus | "all">("all");

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
  // the user returns to the screen. refreshList writes any error into
  // loadError state so the trailing .catch is just to silence the
  // floating promise (useFocusEffect doesn't await its body).
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refreshList().catch(() => {});
    }, [refreshList]),
  );

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
      );
      await refreshList();
    } catch (e) {
      Alert.alert("Could not submit", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = filter === "all"
    ? tickets
    : tickets.filter((t) => t.status === filter);

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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Submission form */}
          <Text style={[styles.section, { color: colors.textSec }]}>SUBMIT NEW TICKET</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
              numberOfLines={6}
              autoCapitalize="sentences"
            />
            <Text style={[styles.hint, { color: colors.textSec }]}>
              A ticket code (e.g. UX-22, BUG-23) is assigned automatically when you submit.
            </Text>
            <Button
              label="Submit Ticket"
              onPress={handleSubmit}
              loading={submitting}
              size="lg"
            />
          </View>

          {/* Status filter */}
          <View style={styles.listHeader}>
            <Text style={[styles.section, { color: colors.textSec }]}>MY TICKETS</Text>
            <View style={[styles.filterSeg, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {STATUS_FILTERS.map(({ value, label }) => {
                const active = filter === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setFilter(value)}
                    style={[styles.filterBtn, active && { backgroundColor: colors.accent }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterText, { color: active ? "#fff" : colors.textSec }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ paddingVertical: Spacing.lg }} />
          ) : loadError ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{loadError}</Text>
          ) : filteredTickets.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="chatbox-outline" size={28} color={colors.textSec} />
              <Text style={[styles.emptyText, { color: colors.textSec }]}>
                {filter === "all"
                  ? "No tickets yet. Submit one above."
                  : `No tickets with status "${TICKET_STATUS_LABELS[filter as TicketStatus]}".`}
              </Text>
            </View>
          ) : (
            filteredTickets.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                expanded={expanded === t.id}
                onPress={() => setExpanded(expanded === t.id ? null : t.id)}
                colors={colors}
              />
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
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
        <View style={[styles.categoryPill, { backgroundColor: `${colors.accent}1A` }]}>
          <Text style={[styles.categoryText, { color: colors.accent }]}>
            {TICKET_CATEGORY_LABELS[ticket.category]}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}1A` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {TICKET_STATUS_LABELS[ticket.status]}
          </Text>
        </View>
      </View>

      <Text style={[styles.ticketSubject, { color: colors.text }]} numberOfLines={expanded ? 0 : 2}>
        {ticket.subject}
      </Text>
      <Text style={[styles.ticketDate, { color: colors.textSec }]}>
        {new Date(ticket.created_at).toLocaleString()}
      </Text>

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

  section: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  filterSeg:  { flexDirection: "row", borderWidth: 1, borderRadius: Radius.md, padding: 2 },
  filterBtn:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  filterText: { fontSize: 10, fontFamily: Typography.fonts.heading, letterSpacing: 0.4 },

  emptyCard: {
    alignItems: "center", justifyContent: "center", gap: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.lg, paddingVertical: Spacing.xl,
  },
  emptyText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center" },
  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", paddingVertical: Spacing.lg },

  ticketCard: {
    borderWidth: 1, borderRadius: Radius.lg,
    padding: Spacing.md, gap: 6, marginBottom: Spacing.sm,
  },
  ticketHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryPill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  categoryText: { fontSize: 10, fontFamily: Typography.fonts.heading, letterSpacing: 0.5 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontFamily: Typography.fonts.heading, letterSpacing: 0.4 },
  ticketSubject: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.subheading },
  hint: { fontSize: 11, fontFamily: Typography.fonts.body, lineHeight: 16, marginTop: -Spacing.xs },
  ticketDate:    { fontSize: 10, fontFamily: Typography.fonts.mono },

  divider: { height: 1, marginVertical: Spacing.xs },
  bodyLabel: {
    fontSize: 10, fontFamily: Typography.fonts.heading, letterSpacing: 1, textTransform: "uppercase",
  },
  bodyText: {
    fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, lineHeight: 20,
  },
});
