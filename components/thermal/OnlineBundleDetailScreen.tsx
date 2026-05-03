// components/thermal/OnlineBundleDetailScreen.tsx
//Supabase-backed twin of BundleDetailScreen. Loads a screening_sessions
//row + its two thermal_captures rows by session_id, signs the storage
//paths so the device can render the PNGs, and reuses the visual layout
//from the offline viewer.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Image, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import Header from "../layout/Header";
import ScreenWrapper from "../layout/ScreenWrapper";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import type { ThemeColors } from "../../constants/theme";
import { calculateAge, calculateBMI, bmiCategory } from "../../lib/thermal/bundleUtils";
import { supabase } from "../../lib/supabase";

const SIGN_EXPIRY = 3600; //1h is plenty for a viewing session

interface ThermalCaptureRow {
  foot: "left" | "right";
  min_temp_c: number;
  max_temp_c: number;
  mean_temp_c: number;
  raw_image_path: string | null;
  processed_image_path: string;
  isolated_image_path: string;
  csv_path: string | null;
}

interface SessionRow {
  id: string;
  bundle_code: string | null;
  capture_mode: string;
  status: string;
  patient_snapshot: {
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    sex?: string | null;
    date_of_birth?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
  } | null;
  started_at: string;
  completed_at: string | null;
  clinic: { facility_name: string } | null;
}

interface FootSigned {
  rawUri:       string | null;
  processedUri: string;
  isolatedUri:  string | null;
  csvPath:      string | null;
  stats: { min: number; max: number; mean: number };
}

interface Props {
  sessionId: string;
  onViewCsv?: (side: "left" | "right") => void;
}

export default function OnlineBundleDetailScreen({ sessionId, onViewCsv }: Props) {
  const router   = useRouter();
  const { colors } = useTheme();

  const [session, setSession] = useState<SessionRow | null>(null);
  const [left,    setLeft]    = useState<FootSigned | null>(null);
  const [right,   setRight]   = useState<FootSigned | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        //Session + clinic name
        const sess = await supabase
          .from("screening_sessions")
          .select(`
            id, bundle_code, capture_mode, status,
            patient_snapshot, started_at, completed_at,
            clinic:clinics ( facility_name )
          `)
          .eq("id", sessionId)
          .maybeSingle();
        if (sess.error || !sess.data) throw new Error(sess.error?.message ?? "Session not found");

        //Captures
        const caps = await supabase
          .from("thermal_captures")
          .select("foot, min_temp_c, max_temp_c, mean_temp_c, raw_image_path, processed_image_path, isolated_image_path, csv_path")
          .eq("session_id", sessionId);
        if (caps.error) throw caps.error;

        const sign = async (path: string | null): Promise<string | null> => {
          if (!path) return null;
          const r = await supabase.storage.from("thermal-images").createSignedUrl(path, SIGN_EXPIRY);
          return r.data?.signedUrl ?? null;
        };

        const buildFoot = async (row: ThermalCaptureRow): Promise<FootSigned> => {
          const [rawUri, processedUri, isolatedUri] = await Promise.all([
            sign(row.raw_image_path),
            sign(row.processed_image_path),
            sign(row.isolated_image_path),
          ]);
          return {
            rawUri,
            processedUri: processedUri ?? "",
            isolatedUri,
            csvPath: row.csv_path,
            stats: { min: Number(row.min_temp_c), max: Number(row.max_temp_c), mean: Number(row.mean_temp_c) },
          };
        };

        const rows = (caps.data ?? []) as ThermalCaptureRow[];
        const leftRow  = rows.find((r) => r.foot === "left")  ?? null;
        const rightRow = rows.find((r) => r.foot === "right") ?? null;

        const [leftSigned, rightSigned] = await Promise.all([
          leftRow  ? buildFoot(leftRow)  : Promise.resolve(null),
          rightRow ? buildFoot(rightRow) : Promise.resolve(null),
        ]);

        if (cancelled) return;
        setSession(sess.data as unknown as SessionRow);
        setLeft(leftSigned);
        setRight(rightSigned);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load bundle");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const patient = session?.patient_snapshot;
  const fullName = useMemo(() => {
    if (!patient) return "";
    return [patient.first_name, patient.middle_name, patient.last_name]
      .filter(Boolean).join(" ").trim();
  }, [patient]);
  const age = patient?.date_of_birth ? calculateAge(patient.date_of_birth) : null;
  const bmi = (patient?.weight_kg && patient?.height_cm)
    ? calculateBMI(patient.weight_kg, patient.height_cm)
    : null;

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="Bundle Detail" leftIcon={<BackBtn router={router} colors={colors} />} />
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      </ScreenWrapper>
    );
  }

  if (error || !session) {
    return (
      <ScreenWrapper>
        <Header title="Bundle Detail" leftIcon={<BackBtn router={router} colors={colors} />} />
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textSec }]}>{error ?? "Bundle not found."}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header
        title={session.bundle_code ?? "Bundle"}
        subtitle={session.clinic?.facility_name ?? (session.capture_mode === "patient_self" ? "Self capture" : undefined)}
        leftIcon={<BackBtn router={router} colors={colors} />}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient card */}
        <Section title="Patient" colors={colors}>
          <Text style={[styles.patientName, { color: colors.text }]}>{fullName || "—"}</Text>
          <View style={styles.statsGrid}>
            <InfoCell label="Sex"       value={patient?.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : "—"} colors={colors} />
            <InfoCell label="Birthdate" value={patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "—"} colors={colors} />
            <InfoCell label="Age"       value={age !== null ? `${age} yrs` : "—"} colors={colors} />
            <InfoCell label="Weight"    value={patient?.weight_kg ? `${patient.weight_kg} kg` : "—"} colors={colors} />
            <InfoCell label="Height"    value={patient?.height_cm ? `${patient.height_cm} cm` : "—"} colors={colors} />
            <InfoCell label="BMI"       value={bmi !== null ? `${bmi.toFixed(1)} · ${bmiCategory(bmi)}` : "—"} colors={colors} />
          </View>
        </Section>

        {/* Status */}
        <View style={[styles.metaRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.inlineRow}>
            <Ionicons name="cloud-done-outline" size={14} color={colors.success} />
            <Text style={[styles.metaText, { color: colors.success }]}>
              {session.status === "completed" ? "Saved" : session.status}
            </Text>
          </View>
          <Text style={[styles.metaText, { color: colors.textSec }]}>
            {new Date(session.started_at).toLocaleString()}
          </Text>
        </View>

        {/* Thermal images */}
        <Section title="Thermal Images" colors={colors}>
          <FootImageCard
            label="Left Foot"  foot={left}
            onViewCsv={left?.csvPath && onViewCsv ? () => onViewCsv("left") : undefined}
            colors={colors}
          />
          <FootImageCard
            label="Right Foot" foot={right}
            onViewCsv={right?.csvPath && onViewCsv ? () => onViewCsv("right") : undefined}
            colors={colors}
          />
        </Section>
      </ScrollView>
    </ScreenWrapper>
  );
}

function BackBtn({ router, colors }: { router: ReturnType<typeof useRouter>; colors: ThemeColors }) {
  return (
    <TouchableOpacity onPress={() => router.back()}>
      <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
    </TouchableOpacity>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ThemeColors }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSec }]}>{title.toUpperCase()}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function InfoCell({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
  return (
    <View style={styles.infoCell}>
      <Text style={[styles.infoCellLabel, { color: colors.textSec }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.infoCellValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function FootImageCard({
  label, foot, onViewCsv, colors,
}: {
  label: string;
  foot: FootSigned | null;
  onViewCsv?: () => void;
  colors: ThemeColors;
}) {
  return (
    <View style={[styles.footCard, { borderColor: colors.border }]}>
      <View style={styles.footCardHeader}>
        <Text style={[styles.footCardLabel, { color: colors.textSec }]}>{label.toUpperCase()}</Text>
        {onViewCsv ? (
          <TouchableOpacity
            onPress={onViewCsv}
            style={[styles.csvBtn, { borderColor: colors.accent }]}
            activeOpacity={0.7}
          >
            <Ionicons name="grid-outline" size={12} color={colors.accent} />
            <Text style={[styles.csvBtnText, { color: colors.accent }]}>View CSV</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.imageRow}>
        <ImageCell label="UNPROCESSED"   uri={foot?.rawUri ?? null}      icon="camera-outline"  colors={colors} />
        <ImageCell label="POST-PROCESSED" uri={foot?.processedUri || null} icon="image-outline"   colors={colors} />
        <ImageCell label="ISOLATED"       uri={foot?.isolatedUri ?? null}  icon="scan-outline"    colors={colors} />
      </View>

      {foot ? (
        <View style={styles.tempRow}>
          <TempStat label="MIN"  value={foot.stats.min.toFixed(1)}  colors={colors} />
          <TempStat label="MAX"  value={foot.stats.max.toFixed(1)}  colors={colors} />
          <TempStat label="MEAN" value={foot.stats.mean.toFixed(1)} colors={colors} />
        </View>
      ) : null}
    </View>
  );
}

function ImageCell({
  label, uri, icon, colors,
}: {
  label: string; uri: string | null; icon: keyof typeof Ionicons.glyphMap; colors: ThemeColors;
}) {
  return (
    <View style={styles.imageCell}>
      <Text style={[styles.imageLabel, { color: colors.textSec }]}>{label}</Text>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.footImage, { borderColor: colors.border, backgroundColor: colors.surface }]}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.footImage, styles.noImage, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name={icon} size={16} color={colors.border} />
        </View>
      )}
    </View>
  );
}

function TempStat({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
  return (
    <View style={styles.tempStat}>
      <Text style={[styles.tempLabel, { color: colors.textSec }]}>{label}</Text>
      <Text style={[styles.tempValue, { color: colors.success }]}>{value}°C</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:   { padding: Spacing.lg, paddingBottom: Spacing["3xl"], gap: Spacing.lg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText:{ fontSize: Typography.sizes.base, fontFamily: Typography.fonts.body },

  metaRow:   {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderRadius: Radius.md,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText:  { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body },

  section:      { gap: Spacing.xs },
  sectionTitle: { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 1.5, paddingLeft: 2 },
  sectionCard:  { borderWidth: 1, borderRadius: Radius.lg, overflow: "hidden" },

  patientName:   { fontSize: Typography.sizes.lg, fontFamily: Typography.fonts.heading, padding: Spacing.md, paddingBottom: Spacing.xs },
  statsGrid:     { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm },
  infoCell:      { width: "50%", paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  infoCellLabel: { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1 },
  infoCellValue: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading, marginTop: 2 },

  footCard:       { padding: Spacing.md, gap: Spacing.sm, borderBottomWidth: 1 },
  footCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footCardLabel:  { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1.5 },
  csvBtn:         { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  csvBtnText:     { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },

  imageRow:   { flexDirection: "row", gap: Spacing.xs },
  imageCell:  { flex: 1, gap: 3 },
  imageLabel: { fontSize: 7, fontFamily: Typography.fonts.label, letterSpacing: 0.5, textAlign: "center" },
  footImage:  { width: "100%", aspectRatio: 160 / 120, borderRadius: Radius.sm, borderWidth: 1 },
  noImage:    { alignItems: "center", justifyContent: "center" },

  tempRow:    { flexDirection: "row", justifyContent: "space-around" },
  tempStat:   { alignItems: "center", gap: 2 },
  tempLabel:  { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1 },
  tempValue:  { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.mono },
});
