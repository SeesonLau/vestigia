// app/(admin)/users.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { Badge } from "../../components/ui/index";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { AuthUser } from "../../types";

type UserWithClinic = AuthUser & { clinic_name: string | null };

type RoleFilter = "all" | "clinic" | "patient" | "admin";

export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const [users, setUsers] = useState<UserWithClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [selected, setSelected] = useState<UserWithClinic | null>(null);
  const [toggling, setToggling] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("*, clinic:clinics(name)")
      .order("created_at", { ascending: false });

    if (error) {
      setFetchError("Failed to load users.");
    } else if (data) {
      setUsers(
        (data as any[]).map((u) => ({
          ...u,
          clinic_name: u.clinic?.name ?? null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = filter === "all" ? users : users.filter((u) => u.role === filter);

  const renderUser = useCallback(({ item }: { item: UserWithClinic }) => (
    <TouchableOpacity
      style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.75}
      onPress={() => setSelected(item)}
    >
      <View style={[styles.avatar, { backgroundColor: `${colors.accent}26`, borderColor: `${colors.accent}66` }]}>
        <Text style={[styles.avatarText, { color: colors.accent }]}>{item.full_name.charAt(0)}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>{item.full_name}</Text>
        <Text style={[styles.userEmail, { color: colors.textSec }]}>{item.email}</Text>
        <Text style={[styles.userMeta, { color: colors.textSec }]}>{item.clinic_name ?? "No clinic"}</Text>
      </View>
      <View style={styles.userBadges}>
        <Badge
          label={item.role}
          variant={item.role === "clinic" ? "info" : item.role === "admin" ? "warning" : "muted"}
          size="sm"
        />
        <View style={{ marginTop: 4 }}>
          <Badge
            label={item.is_active ? "active" : "inactive"}
            variant={item.is_active ? "negative" : "warning"}
            size="sm"
          />
        </View>
      </View>
    </TouchableOpacity>
  ), [colors]);

  const handleToggleActive = async () => {
    if (!selected) return;
    setToggling(true);
    const newStatus = !selected.is_active;
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: newStatus })
      .eq("id", selected.id);

    if (error) {
      Alert.alert("Update Failed", "Could not update user status. Please try again.");
    } else {
      setUsers((prev) =>
        prev.map((u) => u.id === selected.id ? { ...u, is_active: newStatus } : u)
      );
      setSelected({ ...selected, is_active: newStatus });
    }
    setToggling(false);
  };

  return (
    <ScreenWrapper>
      <Header
        title="User Management"
        subtitle={loading ? "Loading..." : `${users.length} accounts`}
      />

      <View style={styles.container}>
        {/* Filter row */}
        <View style={styles.filterRow}>
          {(["all", "clinic", "patient", "admin"] as RoleFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
              style={[
                styles.chip,
                { borderColor: colors.border },
                filter === f && { borderColor: colors.warning, backgroundColor: `${colors.warning}1A` },
              ]}
            >
              <Text style={[styles.chipText, { color: filter === f ? colors.warning : colors.textSec }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : fetchError ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.error }]}>{fetchError}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(u) => u.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Spacing["2xl"] }}
            renderItem={renderUser}
          />
        )}
      </View>

      {/* User detail modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalAvatar, { backgroundColor: `${colors.accent}26`, borderColor: `${colors.accent}80` }]}>
                    <Text style={[styles.modalAvatarText, { color: colors.accent }]}>
                      {selected.full_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalName, { color: colors.text }]}>{selected.full_name}</Text>
                    <Text style={[styles.modalEmail, { color: colors.textSec }]}>{selected.email}</Text>
                  </View>
                </View>

                <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {[
                    ["Role", selected.role],
                    ["Status", selected.is_active ? "active" : "inactive"],
                    ["Clinic", selected.clinic_name ?? "—"],
                    ["User ID", selected.id],
                  ].map(([label, value]) => (
                    <View key={label} style={[styles.modalRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.modalRowLabel, { color: colors.textSec }]}>{label}</Text>
                      <Text style={[styles.modalRowValue, { color: colors.text }]}>{value}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <Button
                    label={selected.is_active ? "Deactivate Account" : "Activate Account"}
                    onPress={handleToggleActive}
                    loading={toggling}
                    variant={selected.is_active ? "danger" : "teal"}
                    size="md"
                  />
                  <Button
                    label="Close"
                    onPress={() => setSelected(null)}
                    variant="ghost"
                    size="md"
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center" },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
  userEmail: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    marginTop: 1,
  },
  userMeta: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: 1,
  },
  userBadges: { alignItems: "flex-end" },
  //Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: Spacing.xl,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarText: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
  },
  modalName: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
  },
  modalEmail: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    marginTop: 2,
  },
  modalSection: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalRowLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
  modalRowValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
  },
  modalActions: { gap: Spacing.sm },
});
