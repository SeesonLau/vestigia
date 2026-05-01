// app/(clinic)/pairing.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { useTheme } from "../../constants/ThemeContext";
import { S } from "../../constants/strings";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

interface DeviceRow {
  id: string;
  device_code: string;
  firmware_version: string | null;
  is_active: boolean;
}

export default function PairingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  //USB device list
  const [usbDevices, setUsbDevices] = useState<DeviceRow[]>([]);
  const [usbLoading, setUsbLoading] = useState(true);
  const [newDeviceCode, setNewDeviceCode] = useState("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!user?.clinic_id) return;
    supabase
      .from("devices")
      .select("id, device_code, firmware_version, is_active")
      .eq("clinic_id", user.clinic_id)
      .order("device_code")
      .then(({ data }) => {
        setUsbDevices((data as DeviceRow[]) ?? []);
        setUsbLoading(false);
      });
  }, [user?.clinic_id]);

  const handleRegisterDevice = useCallback(async () => {
    const code = newDeviceCode.trim();
    if (!code) { Alert.alert("Required", "Enter a device code."); return; }
    if (!user?.clinic_id) return;
    setRegistering(true);
    const { data, error } = await supabase
      .from("devices")
      .insert({ clinic_id: user.clinic_id, device_code: code, is_active: true })
      .select("id, device_code, firmware_version, is_active")
      .single();
    setRegistering(false);
    if (error) {
      Alert.alert("Error", S.pairing.registerError);
    } else {
      setUsbDevices((prev) => [...prev, data as DeviceRow]);
      setNewDeviceCode("");
      Alert.alert("Success", S.pairing.registerSuccess);
    }
  }, [newDeviceCode, user?.clinic_id]);

  return (
    <ScreenWrapper scrollable>
      <Header
        title={S.pairing.title}
        leftIcon={<Ionicons name="chevron-back" size={24} color={colors.text} />}
        onLeftPress={() => router.back()}
      />

      <View style={styles.container}>

        {/* FLIR Lepton 3.5 info */}
        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>{S.pairing.flirSection}</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSec }]}>{S.pairing.flirSectionSubtitle}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sourceRow}>
            <View style={[styles.sourceIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="hardware-chip-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={[styles.sourceTitle, { color: colors.text }]}>{S.pairing.sourceFlir}</Text>
              <Text style={[styles.sourceSub, { color: colors.textSec }]}>UVC via USB-C · Plug in to begin</Text>
            </View>
            <View style={[styles.activePill, { backgroundColor: `${colors.success}1F`, borderColor: `${colors.success}4D` }]}>
              <Text style={[styles.activePillText, { color: colors.success }]}>Active</Text>
            </View>
          </View>
          <View style={[styles.infoRow, { marginTop: Spacing.md }]}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textSec} />
            <Text style={[styles.infoNote, { color: colors.textSec }]}>{S.pairing.flirNote}</Text>
          </View>
        </View>

        {/* USB Device Registration */}
        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>{S.pairing.usbDevices}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{S.pairing.registeredDevices}</Text>
          {usbLoading ? (
            <ActivityIndicator color={colors.accent} style={{ paddingVertical: Spacing.md }} />
          ) : usbDevices.length === 0 ? (
            <Text style={[styles.emptyNote, { color: colors.textSec }]}>{S.pairing.noDevicesRegistered}</Text>
          ) : (
            usbDevices.map((dev, i) => (
              <View key={dev.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <View style={styles.deviceRow}>
                  <View style={[styles.deviceIconWrap, { backgroundColor: colors.accentSoft }]}>
                    <Ionicons name="hardware-chip-outline" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.deviceInfo}>
                    <Text style={[styles.deviceCode, { color: colors.text }]}>{dev.device_code}</Text>
                    {dev.firmware_version && (
                      <Text style={[styles.deviceMeta, { color: colors.textSec }]}>fw {dev.firmware_version}</Text>
                    )}
                  </View>
                  <View style={[
                    styles.statusPill,
                    { backgroundColor: dev.is_active ? `${colors.success}1F` : `${colors.textSec}1F`,
                      borderColor: dev.is_active ? `${colors.success}4D` : `${colors.textSec}4D` },
                  ]}>
                    <Text style={[styles.statusPillText, { color: dev.is_active ? colors.success : colors.textSec }]}>
                      {dev.is_active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.fieldLabel, { color: colors.textSec }]}>{S.pairing.registerNewDevice}</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={S.pairing.deviceCodePlaceholder}
              placeholderTextColor={colors.textSec}
              value={newDeviceCode}
              onChangeText={setNewDeviceCode}
              autoCapitalize="characters"
            />
          </View>
          <Button
            label={registering ? "Registering..." : S.pairing.registerButton}
            onPress={handleRegisterDevice}
            loading={registering}
            variant="primary"
            size="md"
          />
        </View>

      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing["2xl"] },
  sectionHeader: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.heading,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
    marginTop: Spacing.lg,
    marginLeft: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    lineHeight: 18,
  },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  cardTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  sourceIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sourceInfo: { flex: 1 },
  sourceTitle: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.subheading },
  sourceSub: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono, marginTop: 2 },
  activePill: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  activePillText: { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  infoNote: { flex: 1, fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, lineHeight: 20 },
  fieldLabel: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.label, marginBottom: Spacing.xs, marginTop: Spacing.md, letterSpacing: 0.3 },
  inputRow: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.xs, minHeight: 48, justifyContent: "center" },
  input: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.mono, letterSpacing: 0.5 },
  emptyNote: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, marginBottom: Spacing.md, lineHeight: 20 },
  divider: { height: 1, marginVertical: Spacing.md },
  deviceRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.xs },
  deviceIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: Spacing.md },
  deviceInfo: { flex: 1 },
  deviceCode: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.subheading },
  deviceMeta: { fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono, marginTop: 2 },
  statusPill: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontFamily: Typography.fonts.label, letterSpacing: 0.5 },
});
