// app/(admin)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { Badge, Card } from "../../components/ui/index";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

interface OverviewStats {
  totalSessions: number;
  positiveCases: number;
  activeClinics: number;
  registeredUsers: number;
}

interface RecentUser {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  clinic_name: string | null;
}

interface RecentClinic {
  id: string;
  name: string;
  facility_type: string;
  device_count: number;
}

type AdminTab = "overview" | "users" | "clinics";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [stats, setStats] = useState<OverviewStats>({
    totalSessions: 0,
    positiveCases: 0,
    activeClinics: 0,
    registeredUsers: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentClinics, setRecentClinics] = useState<RecentClinic[]>([]);
  const [aiModel, setAiModel] = useState("dpn-v1.2.0");
  const [threshold, setThreshold] = useState("2.2");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const [sessions, positive, clinics, users, usersResult, clinicsResult, configResult] = await Promise.all([
          supabase.from("screening_sessions").select("*", { count: "exact", head: true }),
          supabase.from("classification_results").select("*", { count: "exact", head: true }).eq("classification", "POSITIVE"),
          supabase.from("clinics").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("id, full_name, role, is_active, clinic:clinics(name)").order("created_at", { ascending: false }).limit(4),
          supabase.from("clinics").select("id, name, facility_type, devices:devices(id)").order("created_at", { ascending: false }).limit(3),
          supabase.from("system_config").select("key, value").in("key", ["ai_model_version", "asymmetry_threshold"]),
        ]);

        if (sessions.error || positive.error || clinics.error || users.error) {
          throw new Error("Failed to load overview stats.");
        }
        if (usersResult.error) throw new Error("Failed to load recent users.");
        if (clinicsResult.error) throw new Error("Failed to load recent clinics.");

        setStats({
          totalSessions: sessions.count ?? 0,
          positiveCases: positive.count ?? 0,
          activeClinics: clinics.count ?? 0,
          registeredUsers: users.count ?? 0,
        });

        if (usersResult.data) {
          const typedUsers = usersResult.data as unknown as Array<{ id: string; full_name: string; role: string; is_active: boolean; clinic: { name: string }[] | null }>;
          setRecentUsers(
            typedUsers.map((u) => ({
              id: u.id,
              full_name: u.full_name,
              role: u.role,
              is_active: u.is_active,
              clinic_name: Array.isArray(u.clinic) ? (u.clinic[0]?.name ?? null) : null,
            }))
          );
        }

        if (clinicsResult.data) {
          setRecentClinics(
            clinicsResult.data.map((c: { id: string; name: string; facility_type: string; devices: { id: string }[] }) => ({
              id: c.id,
              name: c.name,
              facility_type: c.facility_type,
              device_count: Array.isArray(c.devices) ? c.devices.length : 0,
            }))
          );
        }

        configResult.data?.forEach((row) => {
          if (row.key === "ai_model_version") setAiModel(String(row.value));
          if (row.key === "asymmetry_threshold") setThreshold(String(row.value));
        });
      } catch (err: unknown) {
        setFetchError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <ScreenWrapper scrollable>
      <Header
        title="Admin Dashboard"
        rightIcon={
          <Text style={[styles.adminBadge, { color: colors.warning, borderColor: `${colors.warning}66`, backgroundColor: `${colors.warning}1A` }]}>
            ADMIN
          </Text>
        }
      />

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {(["overview", "users", "clinics"] as AdminTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && { borderBottomColor: colors.accent }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: tab === t ? colors.accent : colors.textSec }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.container}>
        {loading && (
          <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: Spacing.xl }} />
        )}
        {!loading && fetchError && (
          <Text style={[styles.errorText, { color: colors.error }]}>{fetchError}</Text>
        )}
        {!loading && !fetchError && tab === "overview" && (
          <>
            {/* Stat grid */}
            <View style={styles.statGrid}>
              {([
                { label: "Total Sessions", value: stats.totalSessions },
                { label: "POSITIVE Cases", value: stats.positiveCases },
                { label: "Active Clinics", value: stats.activeClinics },
                { label: "Registered Users", value: stats.registeredUsers },
              ] as { label: string; value: number }[]).map((s) => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSec }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* AI Config */}
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Model Configuration</Text>
              <View style={[styles.modelRow, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.modelKey, { color: colors.textSec }]}>Active Model</Text>
                  <Text style={[styles.modelValue, { color: colors.text }]}>{aiModel}</Text>
                </View>
                <Badge label="Live" variant="negative" />
              </View>
              <View style={[styles.modelRow, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.modelKey, { color: colors.textSec }]}>Asymmetry Threshold</Text>
                  <Text style={[styles.modelValue, { color: colors.text }]}>{threshold}°C</Text>
                </View>
                <Badge label="Standard" variant="info" />
              </View>
              <TouchableOpacity style={styles.configBtn} activeOpacity={0.7} onPress={() => router.push("/(admin)/settings")}>
                <Text style={[styles.configBtnText, { color: colors.accent }]}>Configure Model Settings</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.accent} />
              </TouchableOpacity>
            </Card>

            {/* Data export */}
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Export</Text>
              <Text style={[styles.exportSubtitle, { color: colors.textSec }]}>
                Export session data for research or reporting
              </Text>
              <View style={styles.exportBtns}>
                <TouchableOpacity style={[styles.exportBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} activeOpacity={0.7} onPress={() => Alert.alert("Coming Soon", "CSV export is not yet available.")}>
                  <Ionicons name="bar-chart-outline" size={16} color={colors.textSec} />
                  <Text style={[styles.exportBtnText, { color: colors.textSec }]}>Export CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exportBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} activeOpacity={0.7} onPress={() => Alert.alert("Coming Soon", "PDF export is not yet available.")}>
                  <Ionicons name="document-text-outline" size={16} color={colors.textSec} />
                  <Text style={[styles.exportBtnText, { color: colors.textSec }]}>Export PDF</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </>
        )}

        {tab === "users" && (
          <>
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.textSec }]}>{recentUsers.length} recent users</Text>
              <TouchableOpacity style={[styles.addBtn, { borderColor: `${colors.accent}80`, backgroundColor: `${colors.accent}1A` }]} activeOpacity={0.7} onPress={() => router.push("/(admin)/users")}>
                <Text style={[styles.addBtnText, { color: colors.accent }]}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentUsers.map((user) => (
              <TouchableOpacity key={user.id} style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.75} onPress={() => router.push("/(admin)/users")}>
                <View style={[styles.userAvatar, { backgroundColor: `${colors.accent}26`, borderColor: `${colors.accent}66` }]}>
                  <Text style={[styles.userAvatarText, { color: colors.accent }]}>
                    {user.full_name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>{user.full_name}</Text>
                  <Text style={[styles.userMeta, { color: colors.textSec }]}>
                    {user.clinic_name ?? "Patient account"}
                  </Text>
                </View>
                <View style={styles.userRight}>
                  <Badge label={user.role} variant={user.role === "clinic" ? "info" : "muted"} size="sm" />
                  <View style={{ marginTop: 4 }}>
                    <Badge label={user.is_active ? "active" : "inactive"} variant={user.is_active ? "negative" : "warning"} size="sm" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {tab === "clinics" && (
          <>
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.textSec }]}>{recentClinics.length} recent clinics</Text>
              <TouchableOpacity style={[styles.addBtn, { borderColor: `${colors.accent}80`, backgroundColor: `${colors.accent}1A` }]} activeOpacity={0.7} onPress={() => router.push("/(admin)/clinics")}>
                <Text style={[styles.addBtnText, { color: colors.accent }]}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentClinics.map((clinic) => (
              <TouchableOpacity key={clinic.id} style={[styles.clinicCard, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.75} onPress={() => router.push("/(admin)/clinics")}>
                <View style={styles.clinicTop}>
                  <Text style={[styles.clinicName, { color: colors.text }]}>{clinic.name}</Text>
                  <Badge label={clinic.facility_type.replace(/_/g, " ")} variant="info" size="sm" />
                </View>
                <View style={styles.clinicStats}>
                  <Text style={[styles.clinicStat, { color: colors.textSec }]}>
                    {clinic.device_count} device{clinic.device_count !== 1 ? "s" : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  errorText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    marginVertical: Spacing.xl,
  },
  adminBadge: {
    fontSize: 9,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1.5,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    marginBottom: Spacing.md,
  },
  tab: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
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
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  statValue: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: 2,
  },

  // Sections
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.md,
  },

  // Model config
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  modelKey: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
  modelValue: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.mono,
    marginTop: 2,
  },
  configBtn: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  configBtnText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
  },

  // Export
  exportSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    marginBottom: Spacing.md,
  },
  exportBtns: { flexDirection: "row", gap: Spacing.md },
  exportBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  exportBtnText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
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
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  addBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  addBtnText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  userAvatarText: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
  userMeta: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: 2,
  },
  userRight: { alignItems: "flex-end", gap: 2 },

  // Clinics
  clinicCard: {
    borderWidth: 1,
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
    marginRight: Spacing.sm,
  },
  clinicStats: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  clinicStat: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
  },
});
