// app/(clinic)/pairing.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { S } from "../../constants/strings";
import { Radius, Spacing, Typography } from "../../constants/theme";
import {
  BleScanResult,
  connectBle,
  destroyBleManager,
  disconnectBle,
  requestBlePermissions,
  scanBle,
} from "../../lib/thermal/bleCamera";
import { disconnectWifi, pingWifi } from "../../lib/thermal/wifiCamera";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { useDeviceStore } from "../../store/sessionStore";

interface DeviceRow {
  id: string;
  device_code: string;
  firmware_version: string | null;
  is_active: boolean;
}

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
        <View key={b} style={[signalStyles.bar, { height: 4 + b * 4, backgroundColor: b <= bars ? activeColor : inactiveColor }]} />
      ))}
    </View>
  );
}

export default function PairingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const {
    cameraSource, setCameraSource,
    wifiIp, setWifiIp,
    wifiPort, setWifiPort,
    bleStatus, setBleStatus,
    wifiStatus, setWifiStatus,
    pairedDevice, setPairedDevice,
  } = useDeviceStore();

  //BLE state
  const [bleDevices, setBleDevices] = useState<BleScanResult[]>([]);
  const [selectedBleId, setSelectedBleId] = useState<string | null>(null);
  const [bleScanning, setBleScanning] = useState(false);
  const stopScanRef = useRef<(() => void) | null>(null);

  //WiFi state
  const [ipInput, setIpInput] = useState(wifiIp ?? "");
  const [portInput, setPortInput] = useState(String(wifiPort));
  const [wifiTesting, setWifiTesting] = useState(false);
  const [wifiConnecting, setWifiConnecting] = useState(false);

  //USB device registration
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

  useEffect(() => {
    return () => {
      stopScanRef.current?.();
      destroyBleManager();
    };
  }, []);

  //BLE scan
  const handleBleScan = useCallback(async () => {
    const granted = await requestBlePermissions();
    if (!granted) {
      Alert.alert("Permission Required", "Allow Bluetooth and Location to scan for devices.");
      return;
    }
    setBleScanning(true);
    setBleDevices([]);
    setSelectedBleId(null);
    setBleStatus("scanning");

    const stop = scanBle(
      (device) => setBleDevices((prev) => [...prev, device]),
      (err) => {
        Alert.alert("BLE Error", err);
        setBleScanning(false);
        setBleStatus("disconnected");
      },
      12000,
    );
    stopScanRef.current = stop;

    setTimeout(() => {
      stop();
      stopScanRef.current = null;
      setBleScanning(false);
      if (useDeviceStore.getState().bleStatus === "scanning") setBleStatus("disconnected");
    }, 12000);
  }, [setBleStatus]);

  //BLE connect — retrieves WiFi IP from device characteristic
  const handleBleConnect = useCallback(async () => {
    if (!selectedBleId) return;
    const device = bleDevices.find((d) => d.id === selectedBleId);
    if (!device) return;

    setBleStatus("connecting");
    try {
      const ip = await connectBle(selectedBleId);
      setBleStatus("connected");
      setPairedDevice({ id: device.id, name: device.name, rssi: device.rssi });

      if (ip) {
        setWifiIp(ip);
        setIpInput(ip);
        Alert.alert(
          "BLE Connected",
          `Device IP retrieved: ${ip}\n\nTap "Connect & Use" in the Wi-Fi section to start streaming.`,
        );
      } else {
        Alert.alert(
          "BLE Connected",
          "Connected but no IP was found on the device. Enter the IP manually.",
        );
      }
    } catch (err: unknown) {
      setBleStatus("error");
      Alert.alert("Connection Failed", err instanceof Error ? err.message : "BLE connection failed.");
    }
  }, [selectedBleId, bleDevices, setBleStatus, setPairedDevice, setWifiIp]);

  const handleBleDisconnect = useCallback(async () => {
    if (pairedDevice) await disconnectBle(pairedDevice.id);
    setBleStatus("disconnected");
    setPairedDevice(null);
    setSelectedBleId(null);
  }, [pairedDevice, setBleStatus, setPairedDevice]);

  //WiFi test
  const handleWifiTest = useCallback(async () => {
    const ip = ipInput.trim();
    const port = parseInt(portInput, 10) || 8080;
    if (!ip) { Alert.alert("Required", "Enter the device IP address."); return; }
    setWifiTesting(true);
    const reachable = await pingWifi(ip, port);
    setWifiTesting(false);
    if (reachable) {
      Alert.alert("Reachable", `ESP32 responded at ${ip}:${port}`);
    } else {
      Alert.alert("Unreachable", S.pairing.wifiUnreachable);
    }
  }, [ipInput, portInput]);

  //WiFi connect
  const handleWifiConnect = useCallback(() => {
    const ip = ipInput.trim();
    const port = parseInt(portInput, 10) || 8080;
    if (!ip) { Alert.alert("Required", "Enter the device IP address."); return; }
    setWifiConnecting(true);
    setWifiIp(ip);
    setWifiPort(port);
    // Actual WebSocket open happens in live-feed; here we just save config + mark source
    // Validate reachability first
    pingWifi(ip, port).then((ok) => {
      setWifiConnecting(false);
      if (ok) {
        setCameraSource("wifi");
        setWifiStatus("connected");
        Alert.alert("Ready", `ESP32 Wi-Fi configured.\nGo to Live Feed to start streaming.`);
      } else {
        Alert.alert("Unreachable", S.pairing.wifiUnreachable);
      }
    });
  }, [ipInput, portInput, setWifiIp, setWifiPort, setCameraSource, setWifiStatus]);

  const handleWifiDisconnect = useCallback(() => {
    disconnectWifi();
    setCameraSource("uvc");
    setWifiStatus("disconnected");
    setWifiIp(null);
    setIpInput("");
  }, [setCameraSource, setWifiStatus, setWifiIp]);

  //USB registration
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

  const wifiConnected = wifiStatus === "connected" && cameraSource === "wifi";

  return (
    <ScreenWrapper scrollable>
      <Header
        title={S.pairing.title}
        leftIcon={<Ionicons name="chevron-back" size={24} color={colors.text} />}
        onLeftPress={() => router.back()}
      />

      <View style={styles.container}>

        {/* Active Camera Source */}
        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>{S.pairing.activeSource}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: cameraSource === "wifi" ? colors.accent : colors.border }]}>
          <View style={styles.sourceRow}>
            <View style={[styles.sourceIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons
                name={cameraSource === "wifi" ? "wifi-outline" : "hardware-chip-outline"}
                size={20}
                color={colors.accent}
              />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={[styles.sourceTitle, { color: colors.text }]}>
                {cameraSource === "wifi"
                  ? `${S.pairing.sourceEsp32Wifi}${wifiIp ? ` — ${wifiIp}` : ""}`
                  : S.pairing.sourceFlir}
              </Text>
              <Text style={[styles.sourceSub, { color: colors.textSec }]}>
                {cameraSource === "wifi" ? "WebSocket stream" : "UVC via USB-C"}
              </Text>
            </View>
            <View style={[styles.activePill, { backgroundColor: `${colors.success}1F`, borderColor: `${colors.success}4D` }]}>
              <Text style={[styles.activePillText, { color: colors.success }]}>Active</Text>
            </View>
          </View>
        </View>

        {/* ── FLIR Lepton 3.5 ─────────────────────────────────── */}
        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>{S.pairing.flirSection}</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSec }]}>{S.pairing.flirSectionSubtitle}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textSec} />
            <Text style={[styles.infoNote, { color: colors.textSec }]}>{S.pairing.flirNote}</Text>
          </View>
          {cameraSource !== "uvc" && (
            <Button
              label={S.pairing.useThisCamera}
              onPress={() => {
                disconnectWifi();
                setWifiStatus("disconnected");
                setCameraSource("uvc");
              }}
              variant="secondary"
              size="md"
              style={styles.useBtn}
            />
          )}
          {cameraSource === "uvc" && (
            <View style={[styles.activeBanner, { backgroundColor: `${colors.success}1F`, borderColor: `${colors.success}4D` }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
              <Text style={[styles.activeBannerText, { color: colors.success }]}>Currently selected</Text>
            </View>
          )}
        </View>

        {/* ── ESP32 Wi-Fi ──────────────────────────────────────── */}
        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>{S.pairing.wifiSection}</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSec }]}>{S.pairing.wifiSectionSubtitle}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSec }]}>{S.pairing.wifi}</Text>
            <StatusIndicator status={wifiConnected ? "connected" : wifiStatus === "connecting" ? "connecting" : "disconnected"} />
          </View>

          {wifiConnected && (
            <View style={[styles.activeBanner, { backgroundColor: `${colors.success}1F`, borderColor: `${colors.success}4D` }]}>
              <Ionicons name="wifi-outline" size={14} color={colors.success} />
              <Text style={[styles.activeBannerText, { color: colors.success }]}>{S.pairing.wifiConnected} — {wifiIp}:{wifiPort}</Text>
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: colors.textSec }]}>{S.pairing.wifiIpLabel}</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={S.pairing.wifiIpPlaceholder}
              placeholderTextColor={colors.textSec}
              value={ipInput}
              onChangeText={setIpInput}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              editable={!wifiConnected}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSec }]}>{S.pairing.wifiPortLabel}</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="8080"
              placeholderTextColor={colors.textSec}
              value={portInput}
              onChangeText={setPortInput}
              keyboardType="numeric"
              editable={!wifiConnected}
            />
          </View>

          <View style={styles.wifiBtnRow}>
            <Button
              label={wifiTesting ? S.pairing.wifiTesting : S.pairing.wifiTest}
              onPress={handleWifiTest}
              loading={wifiTesting}
              variant="ghost"
              size="sm"
              style={styles.halfBtn}
            />
            {wifiConnected ? (
              <Button
                label={S.pairing.wifiDisconnect}
                onPress={handleWifiDisconnect}
                variant="ghost"
                size="sm"
                style={styles.halfBtn}
              />
            ) : (
              <Button
                label={wifiConnecting ? S.pairing.wifiConnecting : S.pairing.wifiConnect}
                onPress={handleWifiConnect}
                loading={wifiConnecting}
                variant="primary"
                size="sm"
                style={styles.halfBtn}
              />
            )}
          </View>
        </View>

        {/* ── BLE Discovery ────────────────────────────────────── */}
        <Text style={[styles.sectionHeader, { color: colors.textSec }]}>{S.pairing.bleSection}</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSec }]}>{S.pairing.bleSectionSubtitle}</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{S.pairing.connectionStatus}</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSec }]}>{S.pairing.ble}</Text>
            <StatusIndicator status={bleStatus} />
          </View>
          {pairedDevice && (
            <View style={[styles.activeBanner, { backgroundColor: `${colors.success}1F`, borderColor: `${colors.success}4D` }]}>
              <Ionicons name="bluetooth-outline" size={14} color={colors.success} />
              <Text style={[styles.activeBannerText, { color: colors.success }]}>
                {pairedDevice.name}
              </Text>
              <TouchableOpacity onPress={handleBleDisconnect} style={styles.disconnectBtn}>
                <Ionicons name="close-outline" size={16} color={colors.textSec} />
              </TouchableOpacity>
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
            <Text style={[styles.listTitle, { color: colors.textSec }]}>{S.pairing.availableDevices}</Text>
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
                  {isSelected && <View style={[styles.selectedBar, { backgroundColor: colors.accent }]} />}
                  <View style={[styles.deviceIconWrap, { backgroundColor: colors.accentSoft }]}>
                    <Ionicons name="bluetooth-outline" size={20} color={colors.accent} />
                  </View>
                  <View style={styles.deviceInfo}>
                    <Text style={[styles.deviceCode, { color: colors.text }]}>{device.name}</Text>
                    <Text style={[styles.deviceMeta, { color: colors.textSec }]}>{device.rssi} dBm · {label}</Text>
                  </View>
                  <SignalBars bars={bars} activeColor={colors.accent} inactiveColor={colors.border} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!bleScanning && bleDevices.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bluetooth-outline" size={40} color={colors.textSec} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: colors.textSec }]}>{S.pairing.noDevicesFound}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>{S.pairing.noDevicesFoundSubtitle}</Text>
          </View>
        )}

        {selectedBleId && bleStatus !== "connected" && (
          <Button
            label={bleStatus === "connecting" ? S.pairing.pairing : S.pairing.pairSelected}
            onPress={handleBleConnect}
            loading={bleStatus === "connecting"}
            variant="primary"
            size="lg"
            style={styles.pairBtn}
          />
        )}

        {/* ── USB Device Registration ──────────────────────────── */}
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
  //Active source card
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
  //Info row
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  infoNote: { flex: 1, fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, lineHeight: 20 },
  useBtn: { marginTop: Spacing.md },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  activeBannerText: { flex: 1, fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.subheading, letterSpacing: 0.3 },
  disconnectBtn: { padding: 2 },
  //Fields
  fieldLabel: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.label, marginBottom: Spacing.xs, marginTop: Spacing.md, letterSpacing: 0.3 },
  inputRow: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.xs, minHeight: 48, justifyContent: "center" },
  input: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.mono, letterSpacing: 0.5 },
  wifiBtnRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md },
  halfBtn: { flex: 1 },
  //Status
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm },
  statusLabel: { flex: 1, fontSize: Typography.sizes.xs, fontFamily: Typography.fonts.mono, letterSpacing: 1 },
  //BLE
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
  selectedBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: Radius.md, borderBottomLeftRadius: Radius.md },
  emptyState: { alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing["2xl"], paddingVertical: Spacing["2xl"] },
  emptyIcon: { marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.sizes.base, fontFamily: Typography.fonts.heading, marginBottom: Spacing.xs },
  emptySubtitle: { fontSize: Typography.sizes.sm, fontFamily: Typography.fonts.body, textAlign: "center", lineHeight: 20 },
  pairBtn: { marginTop: Spacing.sm, marginBottom: Spacing.lg },
  //USB devices
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

const signalStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 2, marginLeft: Spacing.md },
  bar: { width: 4, borderRadius: 2 },
});
