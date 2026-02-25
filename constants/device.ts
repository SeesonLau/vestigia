// constants/device.ts
export const DeviceConfig = {
  ble: {
    serviceUUID: "DPN-SERVICE-UUID",
    characteristicUUID: "DPN-CHAR-UUID",
    scanTimeout: 10000, // ms
    pairingTimeout: 5000, // ms
    namePrefix: "DPN-Scanner",
  },
  wifi: {
    host: "192.168.4.1",
    port: 3333,
    endpoint: "ws://192.168.4.1:3333/thermal",
    connectTimeout: 5000,
    dataStartTimeout: 2000,
  },
  thermal: {
    width: 80,
    height: 62,
    targetFps: 10,
    minFps: 10,
  },
};
