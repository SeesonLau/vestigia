// app/(offline)/history.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { getAllCaptures } from "../../lib/db/offlineCaptures";
import { LocalCapture } from "../../types";

export default function OfflineHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [captures, setCaptures] = useState<LocalCapture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllCaptures()
      .then(setCaptures)
      .finally(() => setLoading(false));
  }, []);

  const renderItem = useCallback(({ item }: { item: LocalCapture }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.patientLabel, { color: colors.text }]}>{item.patient_label}</Text>
        {item.synced ? (
          <View style={styles.syncedRow}>
            <Ionicons name="checkmark-circle-outline" size={12} color={colors.success} />
            <Text style={[styles.syncedText, { color: colors.success }]}>Synced</Text>
          </View>
        ) : (
          <View style={[styles.unsyncedBadge, { backgroundColor: `${colors.warning}26`, borderColor: `${colors.warning}4D` }]}>
            <Text style={[styles.unsyncedText, { color: colors.warning }]}>Unsynced</Text>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="footsteps-outline" size={13} color={colors.textSec} />
        <Text style={[styles.metaText, { color: colors.textSec }]}>
          {item.foot_side.charAt(0).toUpperCase() + item.foot_side.slice(1)} foot
        </Text>
        <Text style={[styles.metaDivider, { color: colors.textSec }]}>·</Text>
        <Ionicons name="thermometer-outline" size={13} color={colors.textSec} />
        <Text style={[styles.metaText, { color: colors.textSec }]}>
          {item.min_temp.toFixed(1)}–{item.max_temp.toFixed(1)}°C
        </Text>
      </View>

      {(item.blood_glucose_mgdl != null || item.systolic_bp_mmhg != null) && (
        <View style={styles.metaRow}>
          {item.blood_glucose_mgdl != null && (
            <Text style={[styles.vitalsText, { color: colors.textSec }]}>
              BG: {item.blood_glucose_mgdl} mg/dL
            </Text>
          )}
          {item.systolic_bp_mmhg != null && item.diastolic_bp_mmhg != null && (
            <Text style={[styles.vitalsText, { color: colors.textSec }]}>
              BP: {item.systolic_bp_mmhg}/{item.diastolic_bp_mmhg} mmHg
            </Text>
          )}
        </View>
      )}

      <Text style={[styles.dateText, { color: colors.textSec }]}>
        {new Date(item.captured_at).toLocaleString()}
      </Text>

      {item.synced && item.synced_at && (
        <Text style={[styles.syncedAtText, { color: colors.textSec }]}>
          Synced {new Date(item.synced_at).toLocaleDateString()}
        </Text>
      )}
    </View>
  ), [colors]);

  return (
    <ScreenWrapper>
      <Header
        title="Saved Captures"
        leftIcon={
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back" accessibilityRole="button">
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : captures.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="phone-portrait-outline" size={48} color={colors.textSec} style={{ marginBottom: Spacing.md }} />
            <Text style={[styles.emptyText, { color: colors.textSec }]}>No saved captures yet</Text>
            <Text style={[styles.emptyHint, { color: colors.textSec }]}>
              Captures you save from the Offline Live Feed will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={captures}
            keyExtractor={(c) => c.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingBottom: Spacing["2xl"] },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  patientLabel: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading, flex: 1 },
  syncedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  syncedText: { fontSize: 10, fontFamily: Typography.fonts.label },
  unsyncedBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  unsyncedText: { fontSize: 10, fontFamily: Typography.fonts.label },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
  metaDivider: { marginHorizontal: 2 },
  vitalsText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono },
  dateText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },
  syncedAtText: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono },
  emptyText: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.body },
  emptyHint: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
});
