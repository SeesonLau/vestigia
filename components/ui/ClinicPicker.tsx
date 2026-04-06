// components/ui/ClinicPicker.tsx
//
// Fetches active clinics from Supabase for the registration flow.
//
// NOTE: Requires an anon-readable RLS policy on the clinics table:
//   CREATE POLICY "clinics: anon reads active" ON public.clinics
//   FOR SELECT USING (is_active = true);
//
// If the policy is missing, the fetch will fail and fall back to a text
// input so the user can still register (admin will assign their clinic later).

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import Input from "./Input";

interface Clinic {
  id: string;
  name: string;
}

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function ClinicPicker({ selectedId, onSelect }: Props) {
  const { colors } = useTheme();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [manualName, setManualName] = useState("");

  useEffect(() => {
    supabase
      .from("clinics")
      .select("id, name")
      .eq("is_active", true)
      .then(({ data, error }) => {
        setLoading(false);
        if (error || !data) {
          setFetchFailed(true);
        } else {
          setClinics(data as Clinic[]);
        }
      });
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSec }]}>Loading clinics…</Text>
      </View>
    );
  }

  if (fetchFailed) {
    return (
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSec }]}>Clinic</Text>
        <Input
          label=""
          placeholder="Enter your clinic name"
          value={manualName}
          onChangeText={setManualName}
        />
        <Text style={[styles.note, { color: colors.textSec }]}>
          ⚠ Clinic list unavailable. Your clinic assignment will be confirmed by
          an administrator after registration.
        </Text>
      </View>
    );
  }

  if (clinics.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSec }]}>Clinic</Text>
        <Text style={[styles.emptyNote, { color: colors.textSec }]}>
          No clinics registered yet. Contact your administrator.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.textSec }]}>Select Clinic</Text>
      <View style={styles.list}>
        {clinics.map((clinic) => {
          const isSelected = selectedId === clinic.id;
          return (
            <TouchableOpacity
              key={clinic.id}
              onPress={() => onSelect(isSelected ? null : clinic.id)}
              style={[
                styles.clinicBtn,
                { borderColor: isSelected ? colors.accent : colors.border },
                isSelected && { backgroundColor: `${colors.accent}1F` },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[styles.clinicName, { color: isSelected ? colors.accent : colors.textSec, fontFamily: isSelected ? Typography.fonts.subheading : Typography.fonts.body }]}>
                {clinic.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.lg },
  label: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  loadingText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
  },
  list: { gap: Spacing.sm },
  clinicBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  clinicName: {
    fontSize: Typography.sizes.base,
  },
  note: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  emptyNote: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    lineHeight: 20,
  },
});
