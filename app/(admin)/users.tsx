// app/(admin)/users.tsx
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { AuthUser } from "../../types";

type UserWithClinic = AuthUser & { clinic_name: string | null };

type RoleFilter = "all" | "clinic" | "patient" | "admin";

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<UserWithClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [selected, setSelected] = useState<UserWithClinic | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*, clinic:clinics(name)")
      .order("created_at", { ascending: false });

    if (data) {
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

  const handleToggleActive = async () => {
    if (!selected) return;
    setToggling(true);
    const newStatus = !selected.is_active;
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: newStatus })
      .eq("id", selected.id);

    if (!error) {
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
              style={[styles.chip, filter === f ? styles.chipActive : undefined]}
            >
              <Text style={[styles.chipText, filter === f ? styles.chipTextActive : undefined]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary[400]} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(u) => u.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Spacing["2xl"] }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userCard}
                activeOpacity={0.75}
                onPress={() => setSelected(item)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.full_name.charAt(0)}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.full_name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  <Text style={styles.userMeta}>
                    {item.clinic_name ?? "No clinic"}
                  </Text>
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
            )}
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
          <View style={styles.modalCard}>
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>
                      {selected.full_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{selected.full_name}</Text>
                    <Text style={styles.modalEmail}>{selected.email}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  {[
                    ["Role", selected.role],
                    ["Status", selected.is_active ? "active" : "inactive"],
                    ["Clinic", selected.clinic_name ?? "—"],
                    ["User ID", selected.id],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.modalRow}>
                      <Text style={styles.modalRowLabel}>{label}</Text>
                      <Text style={styles.modalRowValue}>{value}</Text>
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
    borderColor: Colors.border.default,
  },
  chipActive: {
    borderColor: Colors.warning,
    backgroundColor: "rgba(245,158,11,0.1)",
  },
  chipText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  chipTextActive: { color: Colors.warning },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary[800],
    borderWidth: 1,
    borderColor: Colors.primary[600],
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
    color: Colors.primary[200],
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    color: Colors.text.primary,
  },
  userEmail: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
    marginTop: 1,
  },
  userMeta: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: 1,
  },
  userBadges: { alignItems: "flex-end" },
  //Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5,13,26,0.85)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.bg.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.border.default,
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
    backgroundColor: Colors.primary[800],
    borderWidth: 1.5,
    borderColor: Colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarText: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.primary[200],
  },
  modalName: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
  },
  modalEmail: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
    marginTop: 2,
  },
  modalSection: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  modalRowLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  modalRowValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.primary,
  },
  modalActions: { gap: Spacing.sm },
});
