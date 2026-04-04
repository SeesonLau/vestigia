// app/(patient)/sync.tsx
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
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

type PendingRequest = {
  id: string;
  from_id: string;
  session_id: string;
  created_at: string;
  session: {
    id: string;
    started_at: string;
    status: string;
    clinic: { name: string } | null;
    captures: Array<{ foot: string; min_temp_c: number; max_temp_c: number }>;
  } | null;
};

export default function PatientSyncScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("data_requests")
      .select(`
        id,
        from_id,
        session_id,
        created_at,
        session:screening_sessions (
          id,
          started_at,
          status,
          clinic:clinics ( name ),
          captures:thermal_captures ( foot, min_temp_c, max_temp_c )
        )
      `)
      .eq("to_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRequests((data as unknown as PendingRequest[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (req: PendingRequest) => {
    setActioningId(req.id);
    const { error } = await supabase
      .from("data_requests")
      .update({ status: "accepted" })
      .eq("id", req.id);
    setActioningId(null);
    if (error) {
      Alert.alert("Error", "Could not accept the request. Please try again.");
      return;
    }
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    Alert.alert(
      "Accepted",
      "The session has been added to your health record.",
    );
  };

  const handleReject = (req: PendingRequest) => {
    Alert.alert(
      "Reject Request",
      "Are you sure you want to reject this session request? It will not appear in your record.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActioningId(req.id);
            const { error } = await supabase
              .from("data_requests")
              .update({ status: "rejected" })
              .eq("id", req.id);
            setActioningId(null);
            if (error) {
              Alert.alert("Error", "Could not reject the request.");
              return;
            }
            setRequests((prev) => prev.filter((r) => r.id !== req.id));
          },
        },
      ]
    );
  };

  const renderItem = useCallback(({ item }: { item: PendingRequest }) => {
    const capture = item.session?.captures?.[0] ?? null;
    const isActioning = actioningId === item.id;

    return (
      <View style={styles.card}>
        {/* Clinic + date */}
        <View style={styles.cardHeader}>
          <View style={styles.clinicRow}>
            <Ionicons name="business-outline" size={14} color={Colors.text.muted} />
            <Text style={styles.clinicName}>
              {item.session?.clinic?.name ?? "Unknown Clinic"}
            </Text>
          </View>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Pending</Text>
          </View>
        </View>

        {/* Session info */}
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.text.muted} />
          <Text style={styles.infoText}>
            {item.session
              ? new Date(item.session.started_at).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "—"}
          </Text>
        </View>

        {capture && (
          <View style={styles.infoRow}>
            <Ionicons name="footsteps-outline" size={13} color={Colors.text.muted} />
            <Text style={styles.infoText}>
              {capture.foot.charAt(0).toUpperCase() + capture.foot.slice(1)} foot
            </Text>
            <Text style={styles.infoDivider}>·</Text>
            <Ionicons name="thermometer-outline" size={13} color={Colors.text.muted} />
            <Text style={styles.infoText}>
              {capture.min_temp_c.toFixed(1)}–{capture.max_temp_c.toFixed(1)}°C
            </Text>
          </View>
        )}

        <Text style={styles.sentDate}>
          Sent {new Date(item.created_at).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleReject(item)}
            disabled={isActioning}
            activeOpacity={0.7}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, isActioning && styles.btnDisabled]}
            onPress={() => handleAccept(item)}
            disabled={isActioning}
            activeOpacity={0.8}
          >
            {isActioning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={15} color="#fff" />
                <Text style={styles.acceptText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [actioningId]);

  return (
    <ScreenWrapper>
      <Header
        title="Data Requests"
        subtitle="Pending clinic submissions"
        leftIcon={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={Colors.text.primary} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary[400]} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="checkmark-circle-outline"
                size={48}
                color={Colors.teal[400]}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptyHint}>
                No pending session requests from your clinic.
              </Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: Spacing.lg, paddingBottom: Spacing["3xl"] },
  //Card
  card: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
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
    color: Colors.text.primary,
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: "rgba(251,191,36,0.15)",
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
  },
  pendingText: { fontSize: 10, fontFamily: Typography.fonts.label, color: "#fbbf24" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
  },
  infoDivider: { color: Colors.text.muted, marginHorizontal: 2 },
  sentDate: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: Spacing.xs,
  },
  //Actions
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
    borderColor: Colors.border.default,
    alignItems: "center",
  },
  rejectText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.teal[600],
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
  //Empty state
  empty: { paddingTop: Spacing["3xl"], alignItems: "center" },
  emptyIcon: { marginBottom: Spacing.md },
  emptyTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    textAlign: "center",
  },
});
