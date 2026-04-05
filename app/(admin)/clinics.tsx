// app/(admin)/clinics.tsx
import { Ionicons } from "@expo/vector-icons";
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

//Types
interface DeviceRow {
  id: string;
  device_code: string;
  firmware_version: string | null;
  is_active: boolean;
}

interface ClinicRow {
  id: string;
  name: string;
  facility_type: string;
  is_active: boolean;
  created_at: string;
  devices: DeviceRow[];
}

const FACILITY_LABELS: Record<string, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  barangay_health_station: "BHS",
  other: "Other",
};

export default function AdminClinicsScreen() {
  const { colors } = useTheme();
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ClinicRow | null>(null);
  const [toggling, setToggling] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchClinics = async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from("clinics")
      .select("*, devices:devices(*)")
      .order("created_at", { ascending: false });

    if (error) {
      setFetchError("Failed to load clinics.");
    } else if (data) {
      setClinics(data as ClinicRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchClinics(); }, []);

  const renderClinic = useCallback(({ item }: { item: ClinicRow }) => (
    <TouchableOpacity
      style={[styles.clinicCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.75}
      onPress={() => setSelected(item)}
    >
      <View style={styles.clinicTop}>
        <View style={[styles.clinicIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.clinicIconText, { color: colors.textSec }]}>H</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.clinicName, { color: colors.text }]}>{item.name}</Text>
          <View style={styles.clinicMeta}>
            <Badge label={FACILITY_LABELS[item.facility_type] ?? item.facility_type} variant="info" size="sm" />
            <Badge label={item.is_active ? "Active" : "Inactive"} variant={item.is_active ? "negative" : "muted"} size="sm" />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSec} />
      </View>
      <View style={[styles.clinicStats, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{item.devices.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSec }]}>Devices</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{item.devices.filter((d) => d.is_active).length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSec }]}>Active</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [colors]);

  const handleToggleActive = async () => {
    if (!selected) return;
    setToggling(true);
    const newStatus = !selected.is_active;
    const { error } = await supabase
      .from("clinics")
      .update({ is_active: newStatus })
      .eq("id", selected.id);

    if (error) {
      Alert.alert("Update Failed", "Could not update clinic status. Please try again.");
    } else {
      setClinics((prev) =>
        prev.map((c) => c.id === selected.id ? { ...c, is_active: newStatus } : c)
      );
      setSelected({ ...selected, is_active: newStatus });
    }
    setToggling(false);
  };

  return (
    <ScreenWrapper>
      <Header
        title="Clinic Management"
        subtitle={loading ? "Loading..." : `${clinics.length} facilities`}
      />

      <View style={styles.container}>
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
            data={clinics}
            keyExtractor={(c) => c.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Spacing["2xl"] }}
            renderItem={renderClinic}
          />
        )}
      </View>

      {/* Clinic detail modal */}
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
                <Text style={[styles.modalTitle, { color: colors.text }]}>{selected.name}</Text>
                <Badge
                  label={FACILITY_LABELS[selected.facility_type] ?? selected.facility_type}
                  variant="info"
                  style={{ marginBottom: Spacing.lg }}
                />

                <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {[
                    ["ID", selected.id],
                    ["Type", selected.facility_type],
                    ["Devices", String(selected.devices.length)],
                    ["Status", selected.is_active ? "Active" : "Inactive"],
                  ].map(([label, value]) => (
                    <View key={label} style={[styles.modalRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.modalRowLabel, { color: colors.textSec }]}>{label}</Text>
                      <Text style={[styles.modalRowValue, { color: colors.text }]}>{value}</Text>
                    </View>
                  ))}
                </View>

                {selected.devices.length > 0 && (
                  <>
                    <Text style={[styles.devicesHeader, { color: colors.textSec }]}>Registered Devices</Text>
                    {selected.devices.map((dev) => (
                      <View key={dev.id} style={[styles.deviceRow, { backgroundColor: colors.card }]}>
                        <View style={styles.deviceCodeRow}>
                          <Ionicons name="hardware-chip-outline" size={12} color={colors.textSec} />
                          <Text style={[styles.deviceCode, { color: colors.accent }]}> {dev.device_code}</Text>
                        </View>
                        <Text style={[styles.deviceFw, { color: colors.textSec }]}>{dev.firmware_version ?? "—"}</Text>
                        <Badge
                          label={dev.is_active ? "Active" : "Inactive"}
                          variant={dev.is_active ? "negative" : "muted"}
                          size="sm"
                        />
                      </View>
                    ))}
                  </>
                )}

                <View style={styles.modalActions}>
                  <Button
                    label={selected.is_active ? "Deactivate Clinic" : "Activate Clinic"}
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
  clinicCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  clinicTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  clinicIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  clinicIconText: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.fonts.heading,
  },
  clinicName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    marginBottom: 4,
  },
  clinicMeta: { flexDirection: "row", gap: Spacing.xs },
  clinicStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    marginHorizontal: Spacing.md,
  },
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
    maxHeight: "75%",
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.sm,
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
  devicesHeader: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  deviceCodeRow: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  deviceCode: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
  },
  deviceFw: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
  },
  modalActions: { gap: Spacing.sm, marginTop: Spacing.md },
});
