// app/(admin)/index.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { Badge, Card } from "../../components/ui/index";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";

const STATS = [
  { label: "Total Sessions", value: "1,284", change: "+12%", up: true },
  { label: "POSITIVE Cases", value: "342", change: "+8%", up: true },
  { label: "Active Clinics", value: "18", change: "+2", up: true },
  { label: "Registered Users", value: "94", change: "+5", up: true },
];

const RECENT_USERS = [
  {
    id: "1",
    name: "Dr. Maria Santos",
    role: "clinic",
    clinic: "Cebu City Health Center",
    status: "active",
  },
  {
    id: "2",
    name: "Juan dela Cruz",
    role: "patient",
    clinic: "—",
    status: "active",
  },
  {
    id: "3",
    name: "Dr. Ben Reyes",
    role: "clinic",
    clinic: "PHO Mandaue",
    status: "active",
  },
  {
    id: "4",
    name: "Ana Lim",
    role: "patient",
    clinic: "—",
    status: "inactive",
  },
];

const CLINICS = [
  {
    id: "c1",
    name: "Cebu City Health Center",
    type: "hospital",
    sessions: 340,
    devices: 2,
  },
  { id: "c2", name: "PHO Mandaue", type: "clinic", sessions: 218, devices: 1 },
  {
    id: "c3",
    name: "Barangay Punta Princesa BHS",
    type: "barangay_health_station",
    sessions: 89,
    devices: 1,
  },
];

type AdminTab = "overview" | "users" | "clinics";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("overview");

  return (
    <ScreenWrapper scrollable>
      <Header
        title="Admin Dashboard"
        subtitle="UI-08"
        rightIcon={<Text style={styles.adminBadge}>ADMIN</Text>}
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(["overview", "users", "clinics"] as AdminTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.container}>
        {tab === "overview" && (
          <>
            {/* Stat grid */}
            <View style={styles.statGrid}>
              {STATS.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <Text
                    style={[
                      styles.statChange,
                      s.up ? styles.changeUp : styles.changeDown,
                    ]}
                  >
                    {s.change}
                  </Text>
                </View>
              ))}
            </View>

            {/* AI Config */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>AI Model Configuration</Text>
              <View style={styles.modelRow}>
                <View>
                  <Text style={styles.modelKey}>Active Model</Text>
                  <Text style={styles.modelValue}>dpn-v1.2.0</Text>
                </View>
                <Badge label="Live" variant="negative" />
              </View>
              <View style={styles.modelRow}>
                <View>
                  <Text style={styles.modelKey}>Asymmetry Threshold</Text>
                  <Text style={styles.modelValue}>2.2°C</Text>
                </View>
                <Badge label="Standard" variant="info" />
              </View>
              <TouchableOpacity style={styles.configBtn} activeOpacity={0.7} onPress={() => router.push("/(admin)/settings")}>
                <Text style={styles.configBtnText}>
                  Configure Model Settings →
                </Text>
              </TouchableOpacity>
            </Card>

            {/* Data export */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Data Export</Text>
              <Text style={styles.exportSubtitle}>
                Export session data for research or reporting
              </Text>
              <View style={styles.exportBtns}>
                <TouchableOpacity style={styles.exportBtn} activeOpacity={0.7} onPress={() => Alert.alert("Coming Soon", "CSV export is not yet available.")}>
                  <Text style={styles.exportBtnText}>📊 Export CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportBtn} activeOpacity={0.7} onPress={() => Alert.alert("Coming Soon", "PDF export is not yet available.")}>
                  <Text style={styles.exportBtnText}>📄 Export PDF</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </>
        )}

        {tab === "users" && (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{RECENT_USERS.length} users</Text>
              <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => router.push("/(admin)/users")}>
                <Text style={styles.addBtnText}>+ Invite User</Text>
              </TouchableOpacity>
            </View>
            {RECENT_USERS.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userMeta}>
                    {user.clinic !== "—" ? user.clinic : "Patient account"}
                  </Text>
                </View>
                <View style={styles.userRight}>
                  <Badge
                    label={user.role}
                    variant={user.role === "clinic" ? "info" : "muted"}
                    size="sm"
                  />
                  <View style={{ marginTop: 4 }}>
                    <Badge
                      label={user.status}
                      variant={
                        user.status === "active" ? "negative" : "warning"
                      }
                      size="sm"
                    />
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === "clinics" && (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{CLINICS.length} clinics</Text>
              <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => router.push("/(admin)/clinics")}>
                <Text style={styles.addBtnText}>+ Add Clinic</Text>
              </TouchableOpacity>
            </View>
            {CLINICS.map((clinic) => (
              <View key={clinic.id} style={styles.clinicCard}>
                <View style={styles.clinicTop}>
                  <Text style={styles.clinicName}>{clinic.name}</Text>
                  <Badge
                    label={clinic.type.replace("_", " ")}
                    variant="info"
                    size="sm"
                  />
                </View>
                <View style={styles.clinicStats}>
                  <Text style={styles.clinicStat}>
                    {clinic.sessions} sessions
                  </Text>
                  <Text style={styles.clinicStatDot}>·</Text>
                  <Text style={styles.clinicStat}>
                    {clinic.devices} device{clinic.devices > 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  adminBadge: {
    fontSize: 9,
    fontFamily: Typography.fonts.heading,
    color: Colors.warning,
    letterSpacing: 1.5,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.4)",
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(245,158,11,0.1)",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
    marginBottom: Spacing.md,
  },
  tab: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabActive: { borderBottomColor: Colors.primary[400] },
  tabText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  tabTextActive: { color: Colors.primary[300] },
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },

  // Stats
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  statValue: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: 2,
  },
  statChange: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    marginTop: 4,
  },
  changeUp: { color: Colors.teal[300] },
  changeDown: { color: "#f87171" },

  // Sections
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },

  // Model config
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  modelKey: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  modelValue: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.primary,
    marginTop: 2,
  },
  configBtn: {
    marginTop: Spacing.md,
  },
  configBtnText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
    color: Colors.primary[300],
  },

  // Export
  exportSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginBottom: Spacing.md,
  },
  exportBtns: { flexDirection: "row", gap: Spacing.md },
  exportBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.glassLight,
    alignItems: "center",
  },
  exportBtnText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
    color: Colors.text.secondary,
  },

  // Users
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  listTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  addBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary[500],
    backgroundColor: "rgba(0,128,200,0.1)",
  },
  addBtnText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
    color: Colors.primary[300],
  },
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
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[800],
    borderWidth: 1,
    borderColor: Colors.primary[600],
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  userAvatarText: {
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
  userMeta: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: 2,
  },
  userRight: { alignItems: "flex-end", gap: 2 },

  // Clinics
  clinicCard: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  clinicTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  clinicName: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    color: Colors.text.primary,
    marginRight: Spacing.sm,
  },
  clinicStats: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  clinicStat: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
  },
  clinicStatDot: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
  },
});
