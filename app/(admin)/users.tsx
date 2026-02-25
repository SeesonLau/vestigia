// app/(admin)/users.tsx
import React, { useState } from "react";
import {
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
import { MOCK_ALL_USERS } from "../../data/mockData";

type RoleFilter = "all" | "clinic" | "patient" | "admin";

export default function AdminUsersScreen() {
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [selected, setSelected] = useState<(typeof MOCK_ALL_USERS)[0] | null>(
    null,
  );

  const filtered =
    filter === "all"
      ? MOCK_ALL_USERS
      : MOCK_ALL_USERS.filter((u) => u.role === filter);

  return (
    <ScreenWrapper>
      <Header
        title="User Management"
        subtitle={`${MOCK_ALL_USERS.length} accounts`}
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
                filter === f ? styles.chipActive : undefined,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === f ? styles.chipTextActive : undefined,
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
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userMeta}>
                  {item.clinic !== "—" ? item.clinic : "No clinic"}
                </Text>
              </View>
              <View style={styles.userBadges}>
                <Badge
                  label={item.role}
                  variant={
                    item.role === "clinic"
                      ? "info"
                      : item.role === "admin"
                        ? "warning"
                        : "muted"
                  }
                  size="sm"
                />
                <View style={{ marginTop: 4 }}>
                  <Badge
                    label={item.status}
                    variant={item.status === "active" ? "negative" : "warning"}
                    size="sm"
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
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
                      {selected.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{selected.name}</Text>
                    <Text style={styles.modalEmail}>{selected.email}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  {[
                    ["Role", selected.role],
                    ["Status", selected.status],
                    ["Clinic", selected.clinic],
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
                    label={
                      selected.status === "active"
                        ? "Deactivate Account"
                        : "Activate Account"
                    }
                    onPress={() => setSelected(null)}
                    variant={selected.status === "active" ? "danger" : "teal"}
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
  // Modal
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
