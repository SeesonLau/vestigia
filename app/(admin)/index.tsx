// app/(admin)/index.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import { Badge, Card } from "../../components/ui/index";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
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
        const [sessions, positive, clinics, users] = await Promise.all([
          supabase.from("screening_sessions").select("*", { count: "exact", head: true }),
          supabase.from("classification_results").select("*", { count: "exact", head: true }).eq("classification", "POSITIVE"),
          supabase.from("clinics").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
        ]);
        if (sessions.error || positive.error || clinics.error || users.error) {
          throw new Error("Failed to load overview stats.");
        }
        setStats({
          totalSessions: sessions.count ?? 0,
          positiveCases: positive.count ?? 0,
          activeClinics: clinics.count ?? 0,
          registeredUsers: users.count ?? 0,
        });

        const { data: usersData, error: usersErr } = await supabase
          .from("profiles")
          .select("id, full_name, role, is_active, clinic:clinics(name)")
          .order("created_at", { ascending: false })
          .limit(4);
        if (usersErr) throw new Error("Failed to load recent users.");

        if (usersData) {
          const typedUsers = usersData as unknown as Array<{ id: string; full_name: string; role: string; is_active: boolean; clinic: { name: string }[] | null }>;
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

        const { data: clinicsData, error: clinicsErr } = await supabase
          .from("clinics")
          .select("id, name, facility_type, devices:devices(id)")
          .order("created_at", { ascending: false })
          .limit(3);
        if (clinicsErr) throw new Error("Failed to load recent clinics.");

        if (clinicsData) {
          setRecentClinics(
            clinicsData.map((c: { id: string; name: string; facility_type: string; devices: { id: string }[] }) => ({
              id: c.id,
              name: c.name,
              facility_type: c.facility_type,
              device_count: Array.isArray(c.devices) ? c.devices.length : 0,
            }))
          );
        }

        const { data: configData } = await supabase
          .from("system_config")
          .select("key, value")
          .in("key", ["ai_model_version", "asymmetry_threshold"]);
        configData?.forEach((row) => {
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
        {loading && (
          <ActivityIndicator size="small" color={Colors.primary[400]} style={{ marginVertical: Spacing.xl }} />
        )}
        {!loading && fetchError && (
          <Text style={styles.errorText}>{fetchError}</Text>
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
                <View key={s.label} style={styles.statCard}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* AI Config */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>AI Model Configuration</Text>
              <View style={styles.modelRow}>
                <View>
                  <Text style={styles.modelKey}>Active Model</Text>
                  <Text style={styles.modelValue}>{aiModel}</Text>
                </View>
                <Badge label="Live" variant="negative" />
              </View>
              <View style={styles.modelRow}>
                <View>
                  <Text style={styles.modelKey}>Asymmetry Threshold</Text>
                  <Text style={styles.modelValue}>{threshold}°C</Text>
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
              <Text style={styles.listTitle}>{recentUsers.length} recent users</Text>
              <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => router.push("/(admin)/users")}>
                <Text style={styles.addBtnText}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentUsers.map((user) => (
              <TouchableOpacity key={user.id} style={styles.userCard} activeOpacity={0.75} onPress={() => router.push("/(admin)/users")}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.full_name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.full_name}</Text>
                  <Text style={styles.userMeta}>
                    {user.clinic_name ?? "Patient account"}
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
                      label={user.is_active ? "active" : "inactive"}
                      variant={user.is_active ? "negative" : "warning"}
                      size="sm"
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {tab === "clinics" && (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{recentClinics.length} recent clinics</Text>
              <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => router.push("/(admin)/clinics")}>
                <Text style={styles.addBtnText}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentClinics.map((clinic) => (
              <TouchableOpacity key={clinic.id} style={styles.clinicCard} activeOpacity={0.75} onPress={() => router.push("/(admin)/clinics")}>
                <View style={styles.clinicTop}>
                  <Text style={styles.clinicName}>{clinic.name}</Text>
                  <Badge
                    label={clinic.facility_type.replace(/_/g, " ")}
                    variant="info"
                    size="sm"
                  />
                </View>
                <View style={styles.clinicStats}>
                  <Text style={styles.clinicStat}>
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
    color: "#f87171",
    textAlign: "center",
    marginVertical: Spacing.xl,
  },
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
