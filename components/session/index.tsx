// components/session/index.tsx
import React from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { ClinicalThresholds } from "../../constants/clinical";
import { Colors, Radius, Spacing, Typography } from "../../constants/theme";
import { ScreeningSession, SessionStatus } from "../../types";
import Input from "../ui/Input";

// ── SessionCard ────────────────────────────────────────────────
interface SessionCardProps {
  session: ScreeningSession;
  onPress?: () => void;
  style?: ViewStyle;
}

const statusConfig: Record<
  SessionStatus,
  { label: string; color: string; bg: string }
> = {
  pending: {
    label: "Pending",
    color: Colors.text.muted,
    bg: "rgba(77,106,150,0.15)",
  },
  capturing: {
    label: "Capturing",
    color: Colors.info,
    bg: "rgba(59,130,246,0.15)",
  },
  uploading: {
    label: "Uploading",
    color: Colors.warning,
    bg: "rgba(245,158,11,0.15)",
  },
  processing: {
    label: "Processing",
    color: Colors.primary[300],
    bg: "rgba(0,128,200,0.15)",
  },
  completed: {
    label: "Completed",
    color: Colors.teal[300],
    bg: "rgba(20,176,142,0.15)",
  },
  failed: { label: "Failed", color: "#f87171", bg: "rgba(239,68,68,0.15)" },
  discarded: {
    label: "Discarded",
    color: Colors.text.muted,
    bg: "rgba(77,106,150,0.1)",
  },
};

export function SessionCard({ session, onPress, style }: SessionCardProps) {
  const cfg = statusConfig[session.status];
  const date = new Date(session.started_at);
  const classification = session.classification?.classification;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[cardStyles.container, style]}
    >
      {/* Left accent bar */}
      <View
        style={[
          cardStyles.accentBar,
          {
            backgroundColor:
              classification === "POSITIVE"
                ? Colors.positive
                : classification === "NEGATIVE"
                  ? Colors.negative
                  : Colors.border.default,
          },
        ]}
      />

      <View style={cardStyles.content}>
        <View style={cardStyles.topRow}>
          <Text style={cardStyles.sessionId}>Session</Text>
          <View style={[cardStyles.statusPill, { backgroundColor: cfg.bg }]}>
            <Text style={[cardStyles.statusText, { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </View>
        </View>

        <Text style={cardStyles.date}>
          {date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          {"  "}
          <Text style={cardStyles.time}>
            {date.toLocaleTimeString("en-PH", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </Text>

        {classification && (
          <View style={cardStyles.resultRow}>
            <Text
              style={[
                cardStyles.resultText,
                {
                  color:
                    classification === "POSITIVE"
                      ? "#f87171"
                      : Colors.teal[300],
                },
              ]}
            >
              DPN {classification}
            </Text>
            {session.classification?.confidence_score != null && (
              <Text style={cardStyles.confidence}>
                {(session.classification.confidence_score * 100).toFixed(0)}%
              </Text>
            )}
          </View>
        )}
      </View>

      <Text style={cardStyles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ── VitalsForm ─────────────────────────────────────────────────
interface VitalsFormValues {
  blood_glucose: string;
  systolic_bp: string;
  diastolic_bp: string;
  heart_rate: string;
  hba1c: string;
}

interface VitalsFormErrors {
  blood_glucose?: string;
  systolic_bp?: string;
  diastolic_bp?: string;
  heart_rate?: string;
  hba1c?: string;
}

interface VitalsFormProps {
  values: VitalsFormValues;
  onChange: (key: keyof VitalsFormValues, value: string) => void;
  errors?: VitalsFormErrors;
  style?: ViewStyle;
}

export function VitalsForm({
  values,
  onChange,
  errors = {},
  style,
}: VitalsFormProps) {
  return (
    <View style={style}>
      <Input
        label="Blood Glucose"
        placeholder="e.g. 120"
        value={values.blood_glucose}
        onChangeText={(v) => onChange("blood_glucose", v)}
        keyboardType="numeric"
        suffix="mg/dL"
        error={errors.blood_glucose}
        hint={`Range: ${ClinicalThresholds.glucose.min}–${ClinicalThresholds.glucose.max} mg/dL`}
      />

      <View style={vitalsStyles.row}>
        <View style={vitalsStyles.half}>
          <Input
            label="Systolic BP"
            placeholder="e.g. 120"
            value={values.systolic_bp}
            onChangeText={(v) => onChange("systolic_bp", v)}
            keyboardType="numeric"
            suffix="mmHg"
            error={errors.systolic_bp}
          />
        </View>
        <View style={vitalsStyles.spacer} />
        <View style={vitalsStyles.half}>
          <Input
            label="Diastolic BP"
            placeholder="e.g. 80"
            value={values.diastolic_bp}
            onChangeText={(v) => onChange("diastolic_bp", v)}
            keyboardType="numeric"
            suffix="mmHg"
            error={errors.diastolic_bp}
          />
        </View>
      </View>

      <Input
        label="Heart Rate"
        placeholder="e.g. 72"
        value={values.heart_rate}
        onChangeText={(v) => onChange("heart_rate", v)}
        keyboardType="numeric"
        suffix="bpm"
        error={errors.heart_rate}
        hint="Optional"
      />

      <Input
        label="HbA1c"
        placeholder="e.g. 7.2"
        value={values.hba1c}
        onChangeText={(v) => onChange("hba1c", v)}
        keyboardType="decimal-pad"
        suffix="%"
        error={errors.hba1c}
        hint="Optional — enter if lab result is available"
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const cardStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sessionId: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
  date: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    color: Colors.text.primary,
  },
  time: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.secondary,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: Spacing.sm,
  },
  resultText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
    letterSpacing: 0.5,
  },
  confidence: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
  },
  chevron: {
    fontSize: 22,
    color: Colors.text.muted,
    paddingRight: Spacing.md,
  },
});

const vitalsStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  half: {
    flex: 1,
  },
  spacer: {
    width: Spacing.md,
  },
});
