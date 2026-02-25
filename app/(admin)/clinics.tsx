// app/(admin)/clinics.tsx
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
import { MOCK_CLINICS, MOCK_DEVICES } from "../../data/mockData";

const FACILITY_LABELS: Record<string, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  barangay_health_station: "BHS",
  other: "Other",
};

export default function AdminClinicsScreen() {
  const [selected, setSelected] = useState<(typeof MOCK_CLINICS)[0] | null>(
    null,
  );

  return (
    <ScreenWrapper>
      <Header
        title="Clinic Management"
        subtitle={`${MOCK_CLINICS.length} facilities`}
      />

      <View style={styles.container}>
        <FlatList
          data={MOCK_CLINICS}
          keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Spacing["2xl"] }}
          renderItem={({ item }) => {
            const devices = MOCK_DEVICES.filter((d) => d.clinic_id === item.id);
            return (
              <TouchableOpacity
                style={styles.clinicCard}
                activeOpacity={0.75}
                onPress={() => setSelected(item)}
              >
                <View style={styles.clinicTop}>
                  <View style={styles.clinicIcon}>
                    <Text style={styles.clinicIconText}>🏥</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clinicName}>{item.name}</Text>
                    <View style={styles.clinicMeta}>
                      <Badge
                        label={
                          FACILITY_LABELS[item.facility_type] ??
                          item.facility_type
                        }
                        variant="info"
                        size="sm"
                      />
                      <Badge
                        label={item.is_active ? "Active" : "Inactive"}
                        variant={item.is_active ? "negative" : "muted"}
                        size="sm"
                      />
                    </View>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
                <View style={styles.clinicStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{item.sessions}</Text>
                    <Text style={styles.statLabel}>Sessions</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{devices.length}</Text>
                    <Text style={styles.statLabel}>Devices</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Clinic detail modal */}
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
                <Text style={styles.modalTitle}>{selected.name}</Text>
                <Badge
                  label={FACILITY_LABELS[selected.facility_type]}
                  variant="info"
                  style={{ marginBottom: Spacing.lg }}
                />

                <View style={styles.modalSection}>
                  {[
                    ["ID", selected.id],
                    ["Type", selected.facility_type],
                    ["Sessions", String(selected.sessions)],
                    ["Status", selected.is_active ? "Active" : "Inactive"],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.modalRow}>
                      <Text style={styles.modalRowLabel}>{label}</Text>
                      <Text style={styles.modalRowValue}>{value}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.devicesHeader}>Registered Devices</Text>
                {MOCK_DEVICES.filter((d) => d.clinic_id === selected.id).map(
                  (dev) => (
                    <View key={dev.id} style={styles.deviceRow}>
                      <Text style={styles.deviceCode}>◈ {dev.device_code}</Text>
                      <Text style={styles.deviceFw}>
                        {dev.firmware_version}
                      </Text>
                      <Badge
                        label={dev.is_active ? "Active" : "Inactive"}
                        variant={dev.is_active ? "negative" : "muted"}
                        size="sm"
                      />
                    </View>
                  ),
                )}

                <View style={styles.modalActions}>
                  <Button
                    label={
                      selected.is_active
                        ? "Deactivate Clinic"
                        : "Activate Clinic"
                    }
                    onPress={() => setSelected(null)}
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
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
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
    marginBottom: Spacing.md,
  },
  clinicIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.bg.glassLight,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  clinicIconText: { fontSize: 20 },
  clinicName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  clinicMeta: { flexDirection: "row", gap: Spacing.xs },
  chevron: { fontSize: 22, color: Colors.text.muted },
  clinicStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    paddingTop: Spacing.sm,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border.subtle,
    marginHorizontal: Spacing.md,
  },
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
    maxHeight: "75%",
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
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
  devicesHeader: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  deviceCode: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.mono,
    color: Colors.primary[300],
  },
  deviceFw: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
  },
  modalActions: { gap: Spacing.sm, marginTop: Spacing.md },
});
