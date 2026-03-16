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
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
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
        <ActivityIndicator size="small" color={Colors.primary[400]} />
        <Text style={styles.loadingText}>Loading clinics…</Text>
      </View>
    );
  }

  if (fetchFailed) {
    return (
      <View style={styles.section}>
        <Text style={styles.label}>Clinic</Text>
        <Input
          label=""
          placeholder="Enter your clinic name"
          value={manualName}
          onChangeText={setManualName}
        />
        <Text style={styles.note}>
          ⚠ Clinic list unavailable. Your clinic assignment will be confirmed by
          an administrator after registration.
        </Text>
      </View>
    );
  }

  if (clinics.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.label}>Clinic</Text>
        <Text style={styles.emptyNote}>
          No clinics registered yet. Contact your administrator.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Select Clinic</Text>
      <View style={styles.list}>
        {clinics.map((clinic) => (
          <TouchableOpacity
            key={clinic.id}
            onPress={() => onSelect(selectedId === clinic.id ? null : clinic.id)}
            style={[
              styles.clinicBtn,
              selectedId === clinic.id ? styles.clinicBtnActive : undefined,
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.clinicName,
                selectedId === clinic.id ? styles.clinicNameActive : undefined,
              ]}
            >
              {clinic.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
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
    color: Colors.text.muted,
  },
  list: {
    gap: Spacing.sm,
  },
  clinicBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    backgroundColor: "transparent",
  },
  clinicBtnActive: {
    borderColor: Colors.primary[400],
    backgroundColor: "rgba(0, 128, 200, 0.12)",
  },
  clinicName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
  },
  clinicNameActive: {
    color: Colors.primary[300],
    fontFamily: Typography.fonts.subheading,
  },
  note: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  emptyNote: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
    lineHeight: 20,
  },
});
