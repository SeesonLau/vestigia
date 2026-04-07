// app/(clinic)/patient-select.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { useSessionStore } from "../../store/sessionStore";
import { Patient } from "../../types";

function ageFromDob(dob?: string): string {
  if (!dob) return "—";
  const years = Math.floor(
    (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
  return `${years} yrs`;
}

function diabetesLabel(type?: string): string {
  switch (type) {
    case "type1":       return "Type 1";
    case "type2":       return "Type 2";
    case "gestational": return "Gestational";
    default:            return "Unknown";
  }
}

export default function PatientSelectScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const user = useAuthStore((s) => s.user);
  const setSelectedPatient = useSessionStore((s) => s.setSelectedPatient);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.clinic_id) {
      setError("Your account is not linked to a clinic.");
      setLoading(false);
      return;
    }
    const q = search.trim();
    const query = supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", user.clinic_id)
      .order("patient_code");
    if (q) query.ilike("patient_code", `%${q}%`);
    query.then(({ data, error: err }) => {
      if (err) setError("Could not load patients. Check your connection.");
      else setPatients(data ?? []);
      setLoading(false);
    });
  }, [user?.clinic_id, search]);

  const handleSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    router.push("/(clinic)/live-feed");
  };

  return (
    <ScreenWrapper scrollable>
      <Header
        title="Select Patient"
        leftIcon={<Ionicons name="chevron-back" size={24} color={colors.text} />}
        onLeftPress={() => router.back()}
        rightIcon={<Ionicons name="person-add-outline" size={22} color={colors.accent} />}
        onRightPress={() => router.push("/(clinic)/register-patient" as any)}
      />

      <View style={styles.container}>
        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textSec} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by patient code or type..."
            placeholderTextColor={colors.textSec}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.centerText, { color: colors.textSec }]}>Loading patients...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
            <Text style={[styles.centerText, { color: colors.textSec }]}>{error}</Text>
          </View>
        )}

        {!loading && !error && patients.length === 0 && (
          <View style={styles.center}>
            <Ionicons name="people-outline" size={40} color={colors.textSec} />
            <Text style={[styles.emptyTitle, { color: colors.textSec }]}>No patients found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>
              {search ? "Try a different search term." : "No patients are registered for your clinic yet."}
            </Text>
            {!search && (
              <Button
                label="Register First Patient"
                onPress={() => router.push("/(clinic)/register-patient" as any)}
                variant="primary"
                size="md"
                style={styles.registerBtn}
              />
            )}
          </View>
        )}

        {!loading && !error && patients.map((patient) => (
          <TouchableOpacity
            key={patient.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.75}
            onPress={() => handleSelect(patient)}
          >
            <View style={[styles.avatar, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.code, { color: colors.text }]}>{patient.patient_code}</Text>
              <Text style={[styles.meta, { color: colors.textSec }]}>
                {ageFromDob(patient.date_of_birth)} · {diabetesLabel(patient.diabetes_type)}
                {patient.diabetes_duration_years ? ` · ${patient.diabetes_duration_years}y duration` : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSec} />
          </TouchableOpacity>
        ))}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
  },
  center: {
    alignItems: "center",
    paddingTop: Spacing["3xl"],
    gap: Spacing.sm,
  },
  centerText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    marginTop: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.heading,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
  },
  registerBtn: { marginTop: Spacing.lg, minWidth: 200 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  info: { flex: 1 },
  code: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
  meta: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: 2,
  },
});
