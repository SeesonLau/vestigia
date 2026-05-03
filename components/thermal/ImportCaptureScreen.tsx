// components/thermal/ImportCaptureScreen.tsx
//Shared Import Capture flow: pick 2 PNGs + 2 CSVs (one pair per foot),
//run the DPN classifier on the in-memory data, render result inline.

import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { scanPatient, type DPNScanResponse } from "../../lib/dpnApi";
import Header from "../layout/Header";
import ScreenWrapper from "../layout/ScreenWrapper";
import Button from "../ui/Button";
import DpnResultView from "./DpnResultView";

type Side = "left" | "right";
type Kind = "image" | "csv";

interface Picked {
  uri: string;
  name: string;
  size?: number;
}

type Slots = {
  leftImage:  Picked | null;
  leftCsv:   Picked | null;
  rightImage: Picked | null;
  rightCsv:  Picked | null;
};

const EMPTY: Slots = { leftImage: null, leftCsv: null, rightImage: null, rightCsv: null };

function csvToMatrix(csv: string): number[][] {
  return csv.trim().split(/\r?\n/).map((line) =>
    line.split(",").map((v) => {
      const n = parseFloat(v.trim());
      return Number.isNaN(n) ? 0 : n;
    }),
  );
}

async function readBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

async function readText(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
}

export default function ImportCaptureScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [slots, setSlots] = useState<Slots>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<DPNScanResponse | null>(null);

  const allReady = useMemo(
    () => !!(slots.leftImage && slots.leftCsv && slots.rightImage && slots.rightCsv),
    [slots],
  );

  const slotKey = (side: Side, kind: Kind): keyof Slots =>
    `${side}${kind === "image" ? "Image" : "Csv"}` as keyof Slots;

  async function pick(side: Side, kind: Kind) {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: kind === "image" ? ["image/png", "image/*"] : ["text/csv", "text/comma-separated-values", "*/*"],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;
      const picked: Picked = { uri: file.uri, name: file.name ?? "file", size: file.size ?? undefined };
      setSlots((s) => ({ ...s, [slotKey(side, kind)]: picked }));
      setErr(null);
      setResult(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not open file picker.");
    }
  }

  function clear(side: Side, kind: Kind) {
    setSlots((s) => ({ ...s, [slotKey(side, kind)]: null }));
    setResult(null);
  }

  async function analyze() {
    if (!slots.leftImage || !slots.leftCsv || !slots.rightImage || !slots.rightCsv) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const [leftB64, rightB64, leftCsvText, rightCsvText] = await Promise.all([
        readBase64(slots.leftImage.uri),
        readBase64(slots.rightImage.uri),
        readText(slots.leftCsv.uri),
        readText(slots.rightCsv.uri),
      ]);
      const leftMatrix  = csvToMatrix(leftCsvText);
      const rightMatrix = csvToMatrix(rightCsvText);
      //Diagnostic — visible in `npx react-native log-android` when debugging
      //input shape mismatches that cause the API to 500.
      console.log("[importCapture] left  png b64=", leftB64.length,
        "csv rows=", leftMatrix.length, "cols=", leftMatrix[0]?.length ?? 0);
      console.log("[importCapture] right png b64=", rightB64.length,
        "csv rows=", rightMatrix.length, "cols=", rightMatrix[0]?.length ?? 0);
      if (leftB64.length === 0 || rightB64.length === 0) {
        throw new Error("Could not read one of the image files (empty bytes). Try re-picking from local storage.");
      }
      if (leftMatrix.length < 10 || (leftMatrix[0]?.length ?? 0) < 10) {
        throw new Error(`Left CSV looks malformed (${leftMatrix.length}x${leftMatrix[0]?.length ?? 0}). Expected a comma-separated 2D temperature grid.`);
      }
      if (rightMatrix.length < 10 || (rightMatrix[0]?.length ?? 0) < 10) {
        throw new Error(`Right CSV looks malformed (${rightMatrix.length}x${rightMatrix[0]?.length ?? 0}). Expected a comma-separated 2D temperature grid.`);
      }
      const r = await scanPatient({
        left_image_b64:     leftB64,
        right_image_b64:    rightB64,
        left_temperatures:  leftMatrix,
        right_temperatures: rightMatrix,
      });
      setResult(r);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSlots(EMPTY);
    setResult(null);
    setErr(null);
  }

  return (
    <ScreenWrapper>
      <Header
        title="Import Capture"
        leftIcon={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.intro, { color: colors.textSec }]}>
          Provide a thermal image (PNG) and its temperature matrix (CSV) for each foot. The
          analyzer expects a 160×120 CSV grid in degrees Celsius.
        </Text>

        <FootGroup
          title="Left Foot"
          image={slots.leftImage}
          csv={slots.leftCsv}
          onPickImage={() => pick("left", "image")}
          onPickCsv={() => pick("left", "csv")}
          onClearImage={() => clear("left", "image")}
          onClearCsv={() => clear("left", "csv")}
        />
        <FootGroup
          title="Right Foot"
          image={slots.rightImage}
          csv={slots.rightCsv}
          onPickImage={() => pick("right", "image")}
          onPickCsv={() => pick("right", "csv")}
          onClearImage={() => clear("right", "image")}
          onClearCsv={() => clear("right", "csv")}
        />

        {err ? (
          <View style={[styles.banner, { backgroundColor: `${colors.error}1A`, borderColor: `${colors.error}66` }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={[styles.bannerText, { color: colors.error }]}>{err}</Text>
          </View>
        ) : null}

        {result ? <DpnResultView result={result} /> : null}

        <View style={styles.actions}>
          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.busyText, { color: colors.textSec }]}>Analyzing…</Text>
            </View>
          ) : (
            <>
              <Button
                label={result ? "Re-analyze" : "Analyze"}
                onPress={analyze}
                disabled={!allReady}
                size="lg"
                style={styles.actionBtn}
              />
              {(allReady || result) ? (
                <Button
                  label="Reset"
                  onPress={reset}
                  variant="secondary"
                  size="lg"
                  style={styles.actionBtn}
                />
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

function FootGroup({
  title, image, csv,
  onPickImage, onPickCsv, onClearImage, onClearCsv,
}: {
  title: string;
  image: Picked | null;
  csv: Picked | null;
  onPickImage: () => void;
  onPickCsv: () => void;
  onClearImage: () => void;
  onClearCsv: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.groupTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.slotRow}>
        <SlotTile
          icon="image-outline"
          label="Thermal Image (PNG)"
          picked={image}
          onPick={onPickImage}
          onClear={onClearImage}
          showThumbnail
        />
        <SlotTile
          icon="document-text-outline"
          label="Temperatures (CSV)"
          picked={csv}
          onPick={onPickCsv}
          onClear={onClearCsv}
        />
      </View>
    </View>
  );
}

function SlotTile({
  icon, label, picked, onPick, onClear, showThumbnail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  picked: Picked | null;
  onPick: () => void;
  onClear: () => void;
  showThumbnail?: boolean;
}) {
  const { colors } = useTheme();
  const filled = !!picked;
  return (
    <TouchableOpacity
      onPress={onPick}
      activeOpacity={0.7}
      style={[
        styles.tile,
        {
          backgroundColor: filled ? `${colors.accent}10` : colors.surface,
          borderColor: filled ? colors.accent : colors.border,
        },
      ]}
    >
      {filled && showThumbnail && picked!.uri ? (
        <Image source={{ uri: picked!.uri }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <Ionicons name={icon} size={26} color={filled ? colors.accent : colors.textSec} />
      )}
      <Text
        style={[styles.tileLabel, { color: filled ? colors.text : colors.textSec }]}
        numberOfLines={1}
      >
        {filled ? picked!.name : label}
      </Text>
      {filled ? (
        <TouchableOpacity onPress={onClear} hitSlop={10} style={styles.clearBtn}>
          <Ionicons name="close-circle" size={18} color={colors.textSec} />
        </TouchableOpacity>
      ) : (
        <Text style={[styles.tileHint, { color: colors.textSec }]}>Tap to select</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, paddingBottom: Spacing["2xl"], gap: Spacing.md },
  intro: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, lineHeight: 20 },

  group: {
    borderWidth: 1, borderRadius: Radius.xl,
    padding: Spacing.md, gap: Spacing.sm,
  },
  groupTitle: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading },
  slotRow: { flexDirection: "row", gap: Spacing.sm },

  tile: {
    flex: 1, minHeight: 120,
    borderWidth: 1, borderStyle: "dashed", borderRadius: Radius.lg,
    padding: Spacing.sm, alignItems: "center", justifyContent: "center", gap: 6,
    overflow: "hidden",
  },
  thumb: { width: 64, height: 64, borderRadius: Radius.md },
  tileLabel: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.body, textAlign: "center" },
  tileHint:  { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 1, textTransform: "uppercase" },
  clearBtn:  { position: "absolute", top: 6, right: 6 },

  banner: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  bannerText: { flex: 1, fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body },

  actions: { gap: Spacing.sm, marginTop: Spacing.md },
  actionBtn: { alignSelf: "stretch" },
  busy: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.md },
  busyText: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body },
});
