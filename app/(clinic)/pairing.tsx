// app/(clinic)/pairing.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Header from "../../components/layout/Header";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import { StatusIndicator } from "../../components/ui/index";
import {
  Colors,
  Radius,
  Spacing,
  Typography
} from "../../constants/theme";
import { BLEDevice, ConnectionStatus } from "../../types";

// Mock devices for UI
const MOCK_DEVICES: BLEDevice[] = [
  { id: "1", name: "DPN-Scanner-01", rssi: -52 },
  { id: "2", name: "DPN-Scanner-02", rssi: -68 },
  { id: "3", name: "DPN-Scanner-03", rssi: -81 },
];

function rssiToStrength(rssi: number): { bars: number; label: string } {
  if (rssi > -60) return { bars: 4, label: "Excellent" };
  if (rssi > -70) return { bars: 3, label: "Good" };
  if (rssi > -80) return { bars: 2, label: "Fair" };
  return { bars: 1, label: "Weak" };
}

function SignalBars({ bars }: { bars: number }) {
  return (
    <View style={signalStyles.row}>
      {[1, 2, 3, 4].map((b) => (
        <View
          key={b}
          style={[
            signalStyles.bar,
            { height: 4 + b * 4 },
            b <= bars ? signalStyles.active : signalStyles.inactive,
          ]}
        />
      ))}
    </View>
  );
}

export default function PairingScreen() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bleStatus, setBleStatus] = useState<ConnectionStatus>("disconnected");
  const [wifiStatus, setWifiStatus] =
    useState<ConnectionStatus>("disconnected");

  const handleScan = () => {
    setScanning(true);
    setDevices([]);
    setSelectedId(null);
    setBleStatus("scanning");
    // TODO: real BLE scan
    setTimeout(() => {
      setDevices(MOCK_DEVICES);
      setScanning(false);
      setBleStatus("disconnected");
    }, 2000);
  };

  const handlePair = () => {
    if (!selectedId) return;
    setBleStatus("connecting");
    // TODO: BLE connect
    setTimeout(() => {
      setBleStatus("connected");
      setWifiStatus("connecting");
      setTimeout(() => {
        setWifiStatus("connected");
      }, 1500);
    }, 2000);
  };

  const isPaired = bleStatus === "connected" && wifiStatus === "connected";

  return (
    <ScreenWrapper>
      <Header title="Device Pairing" subtitle="UI-02" />

      <View style={styles.container}>
        {/* Connection status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Connection Status</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>BLE</Text>
              <StatusIndicator status={bleStatus} />
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Wi-Fi</Text>
              <StatusIndicator status={wifiStatus} />
            </View>
          </View>
          {isPaired && (
            <View style={styles.pairedBanner}>
              <Text style={styles.pairedText}>
                ✓ Device paired and data stream active
              </Text>
            </View>
          )}
        </View>

        {/* Scan button */}
        <Button
          label={scanning ? "Scanning..." : "Scan for DPN Scanners"}
          onPress={handleScan}
          loading={scanning}
          variant="secondary"
          size="md"
          style={styles.scanBtn}
        />

        {/* Device list */}
        {devices.length > 0 && (
          <View style={styles.deviceList}>
            <Text style={styles.listTitle}>Available Devices</Text>
            {devices.map((device) => {
              const { bars, label } = rssiToStrength(device.rssi);
              const isSelected = selectedId === device.id;
              return (
                <TouchableOpacity
                  key={device.id}
                  onPress={() => setSelectedId(device.id)}
                  style={[
                    styles.deviceCard,
                    isSelected ? styles.deviceCardSelected : undefined,
                  ]}
                  activeOpacity={0.75}
                >
                  <View style={styles.deviceIcon}>
                    <Text style={styles.deviceIconText}>◈</Text>
                  </View>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceRssi}>
                      {device.rssi} dBm · {label}
                    </Text>
                  </View>
                  <SignalBars bars={bars} />
                  {isSelected && <View style={styles.selectedIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {!scanning && devices.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyTitle}>No devices found</Text>
            <Text style={styles.emptySubtitle}>
              Make sure your DPN Scanner is powered on and in range, then tap
              Scan.
            </Text>
          </View>
        )}

        {/* Pair button */}
        {selectedId && !isPaired && (
          <Button
            label={
              bleStatus === "connecting" ? "Pairing..." : "Pair Selected Device"
            }
            onPress={handlePair}
            loading={bleStatus === "connecting" || wifiStatus === "connecting"}
            variant="primary"
            size="lg"
            style={styles.pairBtn}
          />
        )}

        {isPaired && (
          <Button
            label="Proceed to Live Feed →"
            onPress={() => router.push("/(clinic)/live-feed")}
            variant="teal"
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
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  statusCard: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statusTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusItem: { flex: 1 },
  statusLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
    marginBottom: 4,
    letterSpacing: 1,
  },
  statusDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border.subtle,
    marginHorizontal: Spacing.lg,
  },
  pairedBanner: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(20, 176, 142, 0.12)",
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(20, 176, 142, 0.3)",
  },
  pairedText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
    color: Colors.teal[300],
    letterSpacing: 0.3,
  },
  scanBtn: { marginBottom: Spacing.lg },
  listTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    color: Colors.text.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  deviceList: { marginBottom: Spacing.xl },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg.glass,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    position: "relative",
    overflow: "hidden",
  },
  deviceCardSelected: {
    borderColor: Colors.primary[400],
    backgroundColor: "rgba(0, 128, 200, 0.1)",
  },
  selectedIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.primary[400],
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.bg.glassLight,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  deviceIconText: {
    fontSize: 18,
    color: Colors.primary[300],
  },
  deviceInfo: { flex: 1 },
  deviceName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
    color: Colors.text.primary,
  },
  deviceRssi: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.mono,
    color: Colors.text.muted,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing["3xl"],
  },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.heading,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.text.muted,
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
  bar: {
    width: 4,
    borderRadius: 2,
  },
  active: { backgroundColor: Colors.primary[300] },
  inactive: { backgroundColor: Colors.border.default },
});
