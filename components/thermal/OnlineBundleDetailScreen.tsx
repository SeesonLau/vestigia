// components/thermal/OnlineBundleDetailScreen.tsx
//Supabase-backed twin of BundleDetailScreen. Loads a screening_sessions
//row + its two thermal_captures rows by session_id, signs the storage
//paths so the device can render the PNGs, and reuses the visual layout
//from the offline viewer.

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, Image as RNImage, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import DpnResultView from "./DpnResultView";
import ZoomableImage from "./ZoomableImage";
import Header from "../layout/Header";
import ScreenWrapper from "../layout/ScreenWrapper";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import type { ThemeColors } from "../../constants/theme";
import type { DPNScanResponse } from "../../lib/dpnApi";
import {
  STORED_CLASSIFICATION_COLUMNS,
  hydrateFromStored,
  type StoredClassification,
} from "../../lib/dpnHydrate";
import { calculateAge, calculateBMI, bmiCategory } from "../../lib/thermal/bundleUtils";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

const SIGN_EXPIRY = 3600; //1h is plenty for a viewing session

interface ThermalCaptureRow {
  foot: "left" | "right";
  min_temp_c: number;
  max_temp_c: number;
  mean_temp_c: number;
  raw_image_path: string | null;
  processed_image_path: string | null;
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
  clinic_discarded_at: string | null;
  patient_discarded_at: string | null;
  clinic: { facility_name: string } | null;
  classification?: {
    classification: "POSITIVE" | "NEGATIVE" | "INCONCLUSIVE";
    confidence_score: number;
    classified_at: string;
  }[] | null;
}

interface FootSigned {
  rawUri:       string | null;
  processedUri: string | null;
  isolatedUri:  string | null;
  csvPath:      string | null;
  stats: { min: number; max: number; mean: number };
}

interface Props {
  sessionId: string;
  onViewCsv?: (side: "left" | "right") => void;
  /** Patient-only: when this self-capture has no clinic_id yet, show a
   *  "Submit to a clinic" CTA that calls this. */
  onSubmitToClinic?: () => void;
  /** Clinic-only: when there's no classification_results row yet, show
   *  a "Run DPN assessment" CTA that calls this. */
  onAssess?: () => void;
}

export default function OnlineBundleDetailScreen({ sessionId, onViewCsv, onSubmitToClinic, onAssess }: Props) {
  const router   = useRouter();
  const { colors } = useTheme();
  const userRole = useAuthStore((s) => s.user?.role);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [left,    setLeft]    = useState<FootSigned | null>(null);
  const [right,   setRight]   = useState<FootSigned | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [discardBusy, setDiscardBusy] = useState(false);
  //Full DPN result hydrated from classification_results so we can render
  //the same detailed verdict / per-foot / asymmetry UI as the assessment
  //screen, inline below the bundle status pill.
  const [dpnResult, setDpnResult] = useState<DPNScanResponse | null>(null);

  useEffect(() => {
    // Guard: if the route opened without a sessionId param, fail fast with
    // a friendly message instead of letting an empty string reach Postgres
    // (which surfaced as "invalid input syntax for type uuid: ''").
    if (!sessionId) {
      setLoading(false);
      setError("Missing session id. Open this bundle from the sessions list.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        //Session + captures fire in parallel; storage signing waits on captures.
        const [sessRes, capsRes] = await Promise.all([
          supabase
            .from("screening_sessions")
            .select(`
              id, bundle_code, capture_mode, status,
              patient_snapshot, started_at, completed_at,
              clinic_discarded_at, patient_discarded_at,
              clinic:clinics ( facility_name ),
              classification:classification_results ( classification, confidence_score, classified_at )
            `)
            .eq("id", sessionId)
            .maybeSingle(),
          supabase
            .from("thermal_captures")
            .select("foot, min_temp_c, max_temp_c, mean_temp_c, raw_image_path, processed_image_path, isolated_image_path, csv_path")
            .eq("session_id", sessionId),
        ]);

        if (sessRes.error || !sessRes.data) throw new Error(sessRes.error?.message ?? "Session not found");
        if (capsRes.error) throw capsRes.error;

        const rows = (capsRes.data ?? []) as ThermalCaptureRow[];
        const leftRow  = rows.find((r) => r.foot === "left")  ?? null;
        const rightRow = rows.find((r) => r.foot === "right") ?? null;

        //One batch sign for ALL paths -- six createSignedUrl calls in series
        //was the dominant latency. createSignedUrls(plural) is one round-trip.
        const allPaths: string[] = [];
        if (leftRow?.raw_image_path)        allPaths.push(leftRow.raw_image_path);
        if (leftRow?.processed_image_path)  allPaths.push(leftRow.processed_image_path);
        if (leftRow?.isolated_image_path)   allPaths.push(leftRow.isolated_image_path);
        if (rightRow?.raw_image_path)       allPaths.push(rightRow.raw_image_path);
        if (rightRow?.processed_image_path) allPaths.push(rightRow.processed_image_path);
        if (rightRow?.isolated_image_path)  allPaths.push(rightRow.isolated_image_path);

        const signedRes = allPaths.length
          ? await supabase.storage.from("thermal-images").createSignedUrls(allPaths, SIGN_EXPIRY)
          : { data: [], error: null };
        if (signedRes.error) throw signedRes.error;

        const urlByPath = new Map<string, string>();
        for (const item of signedRes.data ?? []) {
          if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
        }
        const signed = (path: string | null) =>
          path ? urlByPath.get(path) ?? null : null;

        const buildFoot = (row: ThermalCaptureRow | null): FootSigned | null => {
          if (!row) return null;
          return {
            rawUri:       signed(row.raw_image_path),
            processedUri: signed(row.processed_image_path),
            isolatedUri:  signed(row.isolated_image_path),
            csvPath:      row.csv_path,
            stats: {
              min:  Number(row.min_temp_c),
              max:  Number(row.max_temp_c),
              mean: Number(row.mean_temp_c),
            },
          };
        };

        if (cancelled) return;
        setSession(sessRes.data as unknown as SessionRow);
        setLeft(buildFoot(leftRow));
        setRight(buildFoot(rightRow));
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load bundle");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  //Light refetch on focus — pull the full classification row so the
  //Analyzed pill, the small summary, and the inline DpnResultView all
  //stay in sync after the user runs an assessment and comes back here.
  //Skips the (expensive) URL-signing step.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const { data, error } = await supabase
          .from("classification_results")
          .select(STORED_CLASSIFICATION_COLUMNS + ", classified_at")
          .eq("session_id", sessionId)
          .maybeSingle();
        if (cancelled || error) return;
        if (data) {
          const stored = data as unknown as StoredClassification & { classified_at: string };
          setSession((prev) => prev ? {
            ...prev,
            classification: [{
              classification:   stored.classification,
              confidence_score: Number(stored.confidence_score ?? 0),
              classified_at:    stored.classified_at,
            }],
          } : prev);
          setDpnResult(hydrateFromStored(stored));
        } else {
          setDpnResult(null);
        }
      })();
      return () => { cancelled = true; };
    }, [sessionId]),
  );

  // Per-role discard state. The user's own copy is hidden when their
  // role-specific column is non-null; the other party's copy is unaffected.
  const isClinicView = userRole === "clinic";
  const isPatientView = userRole === "patient";
  const discardedForMe = isClinicView
    ? !!session?.clinic_discarded_at
    : isPatientView ? !!session?.patient_discarded_at : false;
  const canDiscard = (isClinicView || isPatientView);

  const handleDiscardOrRestore = useCallback(() => {
    if (!session || !canDiscard) return;
    const restoring = discardedForMe;
    const title = restoring ? "Restore bundle?" : "Discard bundle?";
    const body  = restoring
      ? "This bundle will appear in your history and stats again."
      : "This hides the bundle from your history and stats. The data stays in the database — the other side keeps their copy and you can restore it any time.";
    Alert.alert(title, body, [
      { text: "Cancel", style: "cancel" },
      {
        text: restoring ? "Restore" : "Discard",
        style: restoring ? "default" : "destructive",
        onPress: async () => {
          setDiscardBusy(true);
          const { error: rpcErr } = await supabase.rpc(
            restoring ? "restore_session" : "discard_session",
            { p_session_id: session.id },
          );
          setDiscardBusy(false);
          if (rpcErr) {
            Alert.alert("Could not update", rpcErr.message);
            return;
          }
          if (restoring) {
            setSession((prev) => prev ? { ...prev,
              clinic_discarded_at: isClinicView ? null : prev.clinic_discarded_at,
              patient_discarded_at: isPatientView ? null : prev.patient_discarded_at,
            } : prev);
          } else {
            router.back();
          }
        },
      },
    ]);
  }, [session, canDiscard, discardedForMe, isClinicView, isPatientView, router]);

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
        rightIcon={canDiscard ? (
          <TouchableOpacity
            onPress={handleDiscardOrRestore}
            disabled={discardBusy}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            accessibilityLabel={discardedForMe ? "Restore bundle" : "Discard bundle"}
            accessibilityRole="button"
          >
            {discardBusy ? (
              <ActivityIndicator size="small" color={colors.textSec} />
            ) : (
              <Ionicons
                name={discardedForMe ? "arrow-undo-outline" : "archive-outline"}
                size={22}
                color={discardedForMe ? colors.accent : colors.textSec}
              />
            )}
          </TouchableOpacity>
        ) : undefined}
      />
      {discardedForMe ? (
        <View style={[styles.discardedBanner, { backgroundColor: `${colors.warning}1A`, borderColor: `${colors.warning}66` }]}>
          <Ionicons name="archive-outline" size={14} color={colors.warning} />
          <Text style={[styles.discardedBannerText, { color: colors.warning }]}>
            Discarded — hidden from your history. Tap the restore icon to bring it back.
          </Text>
        </View>
      ) : null}
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
        {(() => {
          const analyzed = !!(Array.isArray(session.classification)
            ? session.classification[0]
            : session.classification);
          const tagColor = analyzed ? colors.success : colors.warning;
          return (
            <View style={[styles.metaRow, { backgroundColor: colors.surface, borderColor: tagColor }]}>
              <View style={styles.inlineRow}>
                <Ionicons
                  name={analyzed ? "checkmark-circle" : "alert-circle-outline"}
                  size={14}
                  color={tagColor}
                />
                <Text style={[styles.metaText, { color: tagColor }]}>
                  {analyzed ? "Analyzed" : "Not Analyzed"}
                </Text>
              </View>
              <Text style={[styles.metaText, { color: colors.textSec }]}>
                {new Date(session.started_at).toLocaleString()}
              </Text>
            </View>
          );
        })()}

        {/* Submit-to-clinic CTA (patient self-captures only) */}
        {onSubmitToClinic && session.capture_mode === "patient_self" && !session.clinic ? (
          <TouchableOpacity
            onPress={onSubmitToClinic}
            activeOpacity={0.85}
            style={[styles.submitCta, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="paper-plane-outline" size={16} color={colors.textInverse} />
            <Text style={[styles.submitCtaText, { color: colors.textInverse }]}>
              Submit to a clinic
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Full DPN result — rendered when an assessment has been saved.
            Wraps DpnResultView (the same component used on the standalone
            Assessment screen) inside an "Analysis Details" section so the
            user can see verdict + per-foot + asymmetry + factors right
            here on the bundle. */}
        {dpnResult ? (
          <View style={styles.section}>
            <View style={styles.analysisHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSec }]}>ANALYSIS DETAILS</Text>
              {(() => {
                const cls = Array.isArray(session.classification) ? session.classification[0] : null;
                return cls ? (
                  <Text style={[styles.classMeta, { color: colors.textSec }]}>
                    {new Date(cls.classified_at).toLocaleDateString()}
                  </Text>
                ) : null;
              })()}
            </View>
            <DpnResultView result={dpnResult} />
          </View>
        ) : null}

        {/* Assess CTA -- clinic only, when there's no classification yet */}
        {onAssess
          && session.status === "completed"
          && !(Array.isArray(session.classification) && session.classification[0])
          ? (
            <TouchableOpacity
              onPress={onAssess}
              activeOpacity={0.85}
              style={[styles.submitCta, { backgroundColor: colors.accent }]}
            >
              <Ionicons name="pulse-outline" size={16} color={colors.textInverse} />
              <Text style={[styles.submitCtaText, { color: colors.textInverse }]}>
                Run DPN Assessment
              </Text>
            </TouchableOpacity>
          ) : null}

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
  // Derive a single row aspect from whichever colorized cell is present so
  // all three cells share a consistent shape. resizeMode="contain"
  // letterboxes the source image inside its cell.
  const [rowAspect, setRowAspect] = useState<number>(160 / 120);
  const aspectSourceUri = foot?.processedUri ?? foot?.rawUri ?? null;
  useEffect(() => {
    if (!aspectSourceUri) return;
    let cancelled = false;
    RNImage.getSize(
      aspectSourceUri,
      (w, h) => { if (!cancelled && w > 0 && h > 0) setRowAspect(w / h); },
      () => {/* keep default */},
    );
    return () => { cancelled = true; };
  }, [aspectSourceUri]);

  // Fixed slot labels — every bundle ships three slots in this order:
  //   1. Raw 320×240 (matches the live preview)
  //   2. Post-processed (median + CLAHE) cropped to ROI
  //   3. Isolated foot, cropped to ROI
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
        <ImageCell label="RAW"                       uri={foot?.rawUri ?? null}       icon="image-outline"    aspect={rowAspect} colors={colors} />
        <ImageCell label="POST-PROCESSED · CROPPED"  uri={foot?.processedUri ?? null} icon="sparkles-outline" aspect={rowAspect} colors={colors} />
        <ImageCell label="ISOLATED"                  uri={foot?.isolatedUri ?? null}  icon="scan-outline"     aspect={rowAspect} colors={colors} />
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
  label, uri, icon, aspect, colors,
}: {
  label: string;
  uri: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  aspect: number;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.imageCell}>
      <Text style={[styles.imageLabel, { color: colors.textSec }]}>{label}</Text>
      {uri ? (
        <ZoomableImage
          uri={uri}
          style={[
            styles.footImage,
            { aspectRatio: aspect, borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          resizeMode="contain"
        />
      ) : (
        <View style={[
          styles.footImage,
          styles.noImage,
          { aspectRatio: aspect, borderColor: colors.border, backgroundColor: colors.surface },
        ]}>
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

  discardedBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: Spacing.lg, marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1,
  },
  discardedBannerText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    lineHeight: 16,
  },

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
  footImage:  { width: "100%", aspectRatio: 160 / 120, borderRadius: Radius.sm, borderWidth: 1 } as any,
  //(aspectRatio above is just the fallback for the empty placeholder cell;
  // ImageCell overrides aspectRatio with the image's natural ratio)
  noImage:    { alignItems: "center", justifyContent: "center" },

  tempRow:    { flexDirection: "row", justifyContent: "space-around" },
  tempStat:   { alignItems: "center", gap: 2 },
  tempLabel:  { fontSize: 9, fontFamily: Typography.fonts.label, letterSpacing: 1 },
  tempValue:  { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.mono },

  submitCta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: Spacing.md, borderRadius: Radius.md,
  },
  submitCtaText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.heading },

  analysisHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingLeft: 2, marginBottom: Spacing.xs,
  },
  classCard: {
    borderWidth: 1, borderRadius: Radius.md,
    padding: Spacing.md, gap: 4,
  },
  classTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 0.5,
  },
  classMeta: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    marginTop: 2,
  },
});
