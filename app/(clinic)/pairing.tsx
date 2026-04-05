// app/(clinic)/pairing.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { StatusIndicator } from "../../components/ui/index";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { S } from "../../constants/strings";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { BLEDevice, ConnectionStatus } from "../../types";

interface DeviceRow {
  id: string;
  device_code: string;
  firmware_version: string | null;
  is_active: boolean;
}

// Mock BLE devices for UI
const MOCK_BLE_DEVICES: BLEDevice[] = [
  { id: "1", name: "ESP32-Thermal-01", rssi: -52 },
  { id: "2", name: "ESP32-Thermal-02", rssi: -68 },
  { id: "3", name: "ESP32-Thermal-03", rssi: -81 },
];

function rssiToStrength(rssi: number): { bars: number; label: string } {
  if (rssi > -60) return { bars: 4, label: "Excellent" };
  if (rssi > -70) return { bars: 3, label: "Good" };
  if (rssi > -80) return { bars: 2, label: "Fair" };
  return { bars: 1, label: "Weak" };
}

function SignalBars({ bars, activeColor, inactiveColor }: { bars: number; activeColor: string; inactiveColor: string }) {
  return (
    <View style={signalStyles.row}>
      {[1, 2, 3, 4].map((b) => (
        <View
          key={b}
          style={[
            signalStyles.bar,
            { height: 4 + b * 4, backgroundColor: b <= bars ? activeColor : inactiveColor },
          ]}
        />
      ))}
    </View>
  );
}

export default function PairingScreen() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  //BLE state
  const [bleScanning, setBleScanning] = useState(false);
  const [bleDevices, setBleDevices] = useState<BLEDevice[]>([]);
  const [selectedBleId, setSelectedBleId] = useState<string | null>(null);
  const [bleStatus, setBleStatus] = useState<ConnectionStatus>("disconnected");
  const isPaired = bleStatus === "connected";

  //USB / Supabase device state
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

  const handleBleScan = () => {
    setBleScanning(true);
    setBleDevices([]);
    setSelectedBleId(null);
    setBleStatus("scanning");
    // TODO: real BLE scan
    setTimeout(() => {
      setBleDevices(MOCK_BLE_DEVICES);
      setBleScanning(false);
      setBleStatus("disconnected");
    }, 2000);
  };

  const handleBlePair = () => {
    if (!selectedBleId) return;
    setBleStatus("connecting");
    // TODO: BLE connect
    setTimeout(() => setBleStatus("connected"), 2000);
  };

  const handleRegisterDevice = async () => {
    const code = newDeviceCode.trim();
    if (!code) {
      Alert.alert("Required", "Enter a device code to register.");
      return;
    }
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
  };

  return (
    <ScreenWrapper scrollable>
      <Header title={S.pairing.title} />

      <View style={styles.container}>
        {/* USB Device Registration */}
        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>
          {S.pairing.usbDevices}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {S.pairing.registeredDevices}
          </Text>

          {usbLoading ? (
            <ActivityIndicator color={colors.accent} style={{ paddingVertical: Spacing.md }} />
          ) : usbDevices.length === 0 ? (
            <Text style={[styles.emptyNote, { color: colors.textSec }]}>
              {S.pairing.noDevicesRegistered}
            </Text>
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
                      <Text style={[styles.deviceMeta, { color: colors.textSec }]}>
                        fw {dev.firmware_version}
                      </Text>
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

          {/* Register new device */}
          <Text style={[styles.registerLabel, { color: colors.textSec }]}>
            {S.pairing.registerNewDevice}
          </Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.codeInput, { color: colors.text }]}
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
            style={styles.registerBtn}
          />
        </View>

        {/* BLE Section (ESP32 Waveshare) */}
        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>
          {S.pairing.bleSection}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSec }]}>
          {S.pairing.bleSectionSubtitle}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {S.pairing.connectionStatus}
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={[styles.statusLabel, { color: colors.textSec }]}>{S.pairing.ble}</Text>
              <StatusIndicator status={bleStatus} />
            </View>
          </View>
          {isPaired && (
            <View style={[styles.pairedBanner, { backgroundColor: `${colors.success}1F`, borderColor: `${colors.success}4D` }]}>
              <View style={styles.pairedRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                <Text style={[styles.pairedText, { color: colors.success }]}>
                  {S.pairing.pairedBanner}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Button
          label={bleScanning ? S.pairing.scanning : S.pairing.scanForDevices}
          onPress={handleBleScan}
          loading={bleScanning}
          variant="secondary"
          size="md"
          style={styles.scanBtn}
        />

        {bleDevices.length > 0 && (
          <View style={styles.deviceList}>
            <Text style={[styles.listTitle, { color: colors.textSec }]}>
              {S.pairing.availableDevices}
            </Text>
            {bleDevices.map((device) => {
              const { bars, label } = rssiToStrength(device.rssi);
              const isSelected = selectedBleId === device.id;
              return (
                <TouchableOpacity
                  key={device.id}
                  onPress={() => setSelectedBleId(device.id)}
                  style={[
                    styles.bleCard,
                    {
                      backgroundColor: isSelected ? `${colors.accent}1F` : colors.card,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  {isSelected && (
                    <View style={[styles.selectedBar, { backgroundColor: colors.accent }]} />
                  )}
                  <View style={[styles.deviceIconWrap, { backgroundColor: colors.accentSoft }]}>
                    <Ionicons name="hardware-chip-outline" size={20} color={colors.accent} />
                  </View>
                  <View style={styles.deviceInfo}>
                    <Text style={[styles.deviceCode, { color: colors.text }]}>{device.name}</Text>
                    <Text style={[styles.deviceMeta, { color: colors.textSec }]}>
                      {device.rssi} dBm · {label}
                    </Text>
                  </View>
                  <SignalBars bars={bars} activeColor={colors.accent} inactiveColor={colors.border} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!bleScanning && bleDevices.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="radio-outline" size={48} color={colors.textSec} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: colors.textSec }]}>
              {S.pairing.noDevicesFound}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>
              {S.pairing.noDevicesFoundSubtitle}
            </Text>
          </View>
        )}

        {selectedBleId && !isPaired && (
          <Button
            label={bleStatus === "connecting" ? S.pairing.pairing : S.pairing.pairSelected}
            onPress={handleBlePair}
            loading={bleStatus === "connecting"}
            variant="primary"
            size="lg"
            style={styles.pairBtn}
          />
        )}
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
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  emptyNote: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  divider: { height: 1, marginVertical: Spacing.md },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  deviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  deviceInfo: { flex: 1 },
  deviceCode: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },
  deviceMeta: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: Typography.fonts.label,
    letterSpacing: 0.5,
  },
  registerLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.label,
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  inputRow: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    minHeight: 48,
    justifyContent: "center",
  },
  codeInput: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.mono,
    letterSpacing: 1,
  },
  registerBtn: {},
  statusRow: { flexDirection: "row", alignItems: "center" },
  statusItem: { flex: 1 },
  statusLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    marginBottom: 4,
    letterSpacing: 1,
  },
  pairedBanner: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  pairedRow: { flexDirection: "row", alignItems: "center" },
  pairedText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
    letterSpacing: 0.3,
    marginLeft: 6,
  },
  scanBtn: { marginBottom: Spacing.lg },
  listTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  deviceList: { marginBottom: Spacing.xl },
  bleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    position: "relative",
    overflow: "hidden",
  },
  selectedBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing["3xl"],
  },
  emptyIcon: { marginBottom: Spacing.lg },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    lineHeight: 22,
  },
  pairBtn: { marginTop: Spacing.sm },
});

const signalStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    marginLeft: Spacing.md,
  },
  bar: { width: 4, borderRadius: 2 },
});
