// app/(patient)/sync.tsx
//Patient inbox for clinic-history-share consent.
//  Pending  → Approve / Disapprove
//  Accepted → Revoke
//Backed by the clinic_access table; mutations go through the
//respond_to_clinic_access / revoke_clinic_access RPCs (SECURITY DEFINER).

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

type AccessRow = {
  id: string;
  status: "pending" | "accepted" | "rejected" | "revoked";
  requested_at: string;
  responded_at: string | null;
  clinic: {
    id: string;
    facility_name: string;
    facility_type: string;
    clinic_code: string;
  } | null;
};

const formatFacilityType = (t: string) =>
  t.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export default function PatientInboxScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  const [pending, setPending]   = useState<AccessRow[]>([]);
  const [accepted, setAccepted] = useState<AccessRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("clinic_access")
      .select(`
        id, status, requested_at, responded_at,
        clinic:clinics ( id, facility_name, facility_type, clinic_code )
      `)
      .eq("patient_profile_id", user.id)
      .in("status", ["pending", "accepted"])
      .order("requested_at", { ascending: false });
    const rows = (data as unknown as AccessRow[]) ?? [];
    setPending(rows.filter((r) => r.status === "pending"));
    setAccepted(rows.filter((r) => r.status === "accepted"));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleRespond = async (req: AccessRow, approve: boolean) => {
    setActioningId(req.id);
    const { error } = await supabase.rpc("respond_to_clinic_access", {
      p_request_id: req.id,
      p_approve:    approve,
    });
    setActioningId(null);
    if (error) {
      Alert.alert("Error", error.message ?? "Could not record your response.");
      return;
    }
    if (approve) {
      //Move card from pending → accepted
      setPending((prev)  => prev.filter((r) => r.id !== req.id));
      setAccepted((prev) => [{ ...req, status: "accepted", responded_at: new Date().toISOString() }, ...prev]);
    } else {
      setPending((prev) => prev.filter((r) => r.id !== req.id));
    }
  };

  const handleRevoke = (req: AccessRow) => {
    Alert.alert(
      "Revoke access",
      `Revoke ${req.clinic?.facility_name ?? "this clinic"}'s access to your screening history?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            setActioningId(req.id);
            const { error } = await supabase.rpc("revoke_clinic_access", { p_request_id: req.id });
            setActioningId(null);
            if (error) {
              Alert.alert("Error", error.message ?? "Could not revoke access.");
              return;
            }
            setAccepted((prev) => prev.filter((r) => r.id !== req.id));
          },
        },
      ],
    );
  };

  const renderRequest = useCallback(({ item }: { item: AccessRow }) => {
    const isActioning = actioningId === item.id;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.clinicRow}>
            <Ionicons name="business-outline" size={14} color={colors.textSec} />
            <Text style={[styles.clinicName, { color: colors.text }]}>
              {item.clinic?.facility_name ?? "Unknown Clinic"}
            </Text>
          </View>
          <View style={[styles.pendingBadge, { backgroundColor: `${colors.warning}26`, borderColor: `${colors.warning}66` }]}>
            <Text style={[styles.pendingText, { color: colors.warning }]}>Pending</Text>
          </View>
        </View>

        <Text style={[styles.metaText, { color: colors.textSec }]}>
          {item.clinic ? `${formatFacilityType(item.clinic.facility_type)} · ${item.clinic.clinic_code}` : "—"}
        </Text>

        <Text style={[styles.bodyText, { color: colors.text }]}>
          {item.clinic?.facility_name ?? "This clinic"} is requesting access to your screening history.
        </Text>

        <Text style={[styles.sentDate, { color: colors.textSec }]}>
          Sent {new Date(item.requested_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.rejectBtn, { borderColor: colors.border }]}
            onPress={() => handleRespond(item, false)}
            disabled={isActioning}
            activeOpacity={0.7}
          >
            <Text style={[styles.rejectText, { color: colors.textSec }]}>Disapprove</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: colors.success }, isActioning && styles.btnDisabled]}
            onPress={() => handleRespond(item, true)}
            disabled={isActioning}
            activeOpacity={0.8}
          >
            {isActioning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={15} color="#fff" />
                <Text style={styles.acceptText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [actioningId, colors]);

  const renderAccepted = useCallback(({ item }: { item: AccessRow }) => {
    const isActioning = actioningId === item.id;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.clinicRow}>
            <Ionicons name="business-outline" size={14} color={colors.textSec} />
            <Text style={[styles.clinicName, { color: colors.text }]}>
              {item.clinic?.facility_name ?? "Unknown Clinic"}
            </Text>
          </View>
          <View style={[styles.acceptedBadge, { backgroundColor: `${colors.success}26`, borderColor: `${colors.success}66` }]}>
            <Text style={[styles.acceptedText, { color: colors.success }]}>Approved</Text>
          </View>
        </View>

        <Text style={[styles.metaText, { color: colors.textSec }]}>
          {item.clinic ? `${formatFacilityType(item.clinic.facility_type)} · ${item.clinic.clinic_code}` : "—"}
        </Text>

        {item.responded_at ? (
          <Text style={[styles.sentDate, { color: colors.textSec }]}>
            Granted {new Date(item.responded_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.revokeBtn, { borderColor: `${colors.error}66`, backgroundColor: `${colors.error}1A` }, isActioning && styles.btnDisabled]}
          onPress={() => handleRevoke(item)}
          disabled={isActioning}
          activeOpacity={0.75}
        >
          {isActioning ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Text style={[styles.revokeText, { color: colors.error }]}>Revoke access</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [actioningId, colors]);

  const isEmpty = pending.length === 0 && accepted.length === 0;

  return (
    <ScreenWrapper>
      <Header
        title="Access Requests"
        subtitle="Clinic history sharing"
        leftIcon={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : isEmpty ? (
        <View style={styles.empty}>
          <Ionicons
            name="checkmark-circle-outline"
            size={48}
            color={colors.success}
            style={styles.emptyIcon}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up</Text>
          <Text style={[styles.emptyHint, { color: colors.textSec }]}>
            No clinics are requesting access right now.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...(pending.length  ? [{ kind: "pending"  as const, items: pending  }] : []),
            ...(accepted.length ? [{ kind: "accepted" as const, items: accepted }] : []),
          ]}
          keyExtractor={(s) => s.kind}
          renderItem={({ item: section }) => (
            <View style={{ marginBottom: Spacing.lg }}>
              <Text style={[styles.sectionLabel, { color: colors.textSec }]}>
                {section.kind === "pending" ? "Pending requests" : "Active access"}
              </Text>
              <FlatList
                data={section.items}
                keyExtractor={(r) => r.id}
                renderItem={section.kind === "pending" ? renderRequest : renderAccepted}
                scrollEnabled={false}
              />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: Spacing.lg, paddingBottom: Spacing["3xl"] },

  sectionLabel: {
    fontSize: 11,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },

  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  clinicName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.heading,
    flex: 1,
  },
  pendingBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  pendingText: { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
  acceptedBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  acceptedText: { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },

  metaText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
  },
  bodyText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    lineHeight: 20,
    marginTop: 4,
  },
  sentDate: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: Spacing.xs,
  },

  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  rejectText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnDisabled: { opacity: 0.5 },
  acceptText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.heading,
    color: "#fff",
  },

  revokeBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  revokeText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.heading,
  },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.lg },
  emptyIcon: { marginBottom: Spacing.md },
  emptyTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
  },
});
