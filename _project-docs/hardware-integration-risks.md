# Hardware Integration — Known Risks & Potential Problems
**Last updated:** 2026-04-03
**Scope:** UVC camera integration via PureThermal Mini Pro JST-SR + FLIR Lepton 3.5

---

## Wiring Plan

```
PureThermal Mini Pro (JST-SR port)
        ↓
JST-SH 4-pin female housing (1.0mm pitch — same pitch as JST-SR, fits the same PCB header)
  Pin 1 → +5V  (USB VBUS, red)
  Pin 2 → D−   (USB Data−, white)
  Pin 3 → D+   (USB Data+, green)
  Pin 4 → GND  (black)
        ↓
USB-A male connector
        ↓  (for PC testing: plug directly into PC USB-A port)
        ↓  (for phone testing: use USB-A to USB-C adapter)
Android phone
```

**JST-SH vs JST-SR note:** Both are 1.0mm pitch and share the same PCB-side SH-series shrouded header. JST-SH female housing is physically compatible with the PureThermal's JST-SR port. SH uses crimp terminals; SR uses IDC — electrically identical once wired.

## Testing

| Question | Answer |
|---|---|
| Can I test on a PC first? | **Yes** — JST-SH to USB-A plugs directly into a PC. Use VLC or GetThermal to confirm the camera streams before touching the app. |
| Can I test on a physical Android phone? | **Yes** — JST-SH to USB-A, then USB-A to USB-C adapter into the phone. Phone must support USB OTG. |
| Can I test on the Android emulator? | **No** — emulators have no USB host hardware. Physical device required. |
| Can I test on iOS? | **No** — iOS has no UVC support. Android only. |

---

## Risk 1 — JitPack build failure (most likely first problem)

**What:** `com.github.saki4510t.UVCCamera:libuvccamera:master-SNAPSHOT` may fail to compile via JitPack against modern NDK / Gradle versions. The saki4510t library hasn't been updated since ~2019.

**Symptoms:**
```
Could not resolve com.github.saki4510t.UVCCamera:libuvccamera:master-SNAPSHOT
```
or a build error inside the native C++ compilation.

**Fix options (in order of effort):**
1. Pin to a specific commit hash instead of `master-SNAPSHOT`:
   ```groovy
   implementation 'com.github.saki4510t.UVCCamera:libuvccamera:<commit-hash>'
   ```
2. Clone the library locally, build it as an AAR, and include it as a local module:
   ```groovy
   implementation project(':libuvccamera')
   ```
3. Switch to a maintained fork (e.g. `com.github.ShiftHackZ:UVCAndroid`) — same API surface, more recently maintained.

---

## Risk 2 — USB OTG not supported on target phone

**What:** Not all Android phones support USB OTG (USB host mode). Budget or mid-range phones sometimes don't.

**Symptoms:** Device not detected even when plugged in. `NO_DEVICE` error from `connectCamera()`.

**Fix:** Verify the phone supports USB OTG. Test with a USB OTG adapter + USB flash drive first — if the file manager detects the drive, OTG works.

---

## Risk 3 — USB permission dialog not appearing

**What:** Android requires the user to explicitly grant USB permission per device. If the dialog never appears, the connection silently fails.

**Symptoms:** `connect()` promise hangs indefinitely or `onCancel` fires.

**Causes:**
- App not in foreground when permission is requested
- `usb_device_filter.xml` VID/PID mismatch (double-check decimal values: VID=7758, PID=256)
- USB intent filter not registered correctly in AndroidManifest.xml

**Fix:** Verify the AndroidManifest.xml `meta-data` points to `@xml/usb_device_filter` and the filter file has the correct decimal values.

---

## Risk 4 — Y16 / RAW format not negotiated

**What:** The `setPreviewSize()` call in `UVCModule.kt` tries `FRAME_FORMAT_RAW` first, then falls back to `FRAME_FORMAT_YUYV`. If neither succeeds, the camera won't stream.

**Symptoms:** `CONNECT_ERROR` from the promise, or frames arriving with wrong size/format.

**Fix:** In `UVCModule.kt`, check the exact format constant names against the version of saki4510t you're using. The constants may differ between versions:
- `UVCCamera.FRAME_FORMAT_RAW` — Y16 radiometric (what we want)
- `UVCCamera.FRAME_FORMAT_YUYV` — pseudocolor fallback

Start with YUYV to confirm streaming works, then switch to RAW for temperature data.

---

## Risk 5 — Frame rate overwhelms JS thread

**What:** At 9 Hz, the native module emits a frame event every ~111ms. Each frame is 38,400 bytes encoded as base64 (~51KB strings). If the JS thread can't keep up, the event queue backs up.

**Symptoms:** App freezes, lag, or out-of-memory crash.

**Fix options:**
- Throttle frame emission in `UVCModule.kt` — only emit every Nth frame (e.g. every 3rd = ~3 Hz)
- Move preprocessing off the JS thread using a Worklet (react-native-worklets already installed)
- Only capture frames during the active scan window, not continuously

---

## Risk 6 — New Architecture (TurboModules) incompatibility

**What:** `IS_NEW_ARCHITECTURE_ENABLED` may be `true` in this project. Old-style React Native modules (bridge-based) work in compatibility mode in RN 0.71+ but could behave unexpectedly.

**Symptoms:** Module not found in `NativeModules.UVCCamera`, or event emitter silently fails.

**Fix:** If `NativeModules.UVCCamera` is undefined at runtime, disable New Architecture temporarily by adding to `gradle.properties`:
```
newArchEnabled=false
```
Then rebuild. Proper fix is to migrate the module to a TurboModule spec.

---

## Risk 7 — Phone charges the PureThermal instead of acting as host

**What:** USB-C is bidirectional. If the phone tries to charge from the PureThermal connection instead of acting as USB host, no data flows.

**Symptoms:** Phone shows "charging" notification when PureThermal is connected. Device not detected.

**Fix:** Some phones require a USB-C OTG adapter that explicitly signals host mode. A powered USB-C hub between the phone and the PureThermal can also resolve power negotiation issues. The PureThermal is bus-powered (draws ~63mA) so the phone must supply power.

---

## Risk 8 — `atob` not available in Hermes

**What:** `preprocessing.ts` uses `atob()` to decode base64 frames. Hermes (the JS engine used by React Native) supports `atob` from RN 0.70+, but older setups may not.

**Symptoms:** `atob is not defined` error when processing frames.

**Fix:** If `atob` is unavailable, replace with a base64 decode utility:
```ts
import { decode } from 'base-64' // npm install base-64
```

---

## Risk 9 — NDK version mismatch

**What:** The saki4510t library compiles native C/C++ code. It may require a specific NDK version.

**Symptoms:** NDK-related build errors mentioning `clang`, `abi`, or native compilation failures.

**Fix:** Check `android/gradle.properties` for `ndkVersion`. The library was written for NDK r14–r21. If using a newer NDK, try pinning:
```properties
ndkVersion=21.4.7075529
```

---

## Summary Table

| # | Risk | Likelihood | Impact | First thing to try |
|---|---|---|---|---|
| 1 | JitPack build failure | High | Blocks build | Pin to specific commit hash |
| 2 | Phone doesn't support OTG | Medium | Blocks hardware test | Test OTG with a USB drive first |
| 3 | USB permission dialog missing | Medium | Blocks connection | Check VID/PID decimal values in filter XML |
| 4 | Y16 format not negotiated | Medium | No temperature data | Start with YUYV, confirm streaming first |
| 5 | Frame rate overwhelms JS | Medium | App freezes | Throttle to every 3rd frame in Kotlin |
| 6 | New Architecture incompatibility | Low–Medium | Module not found | Set `newArchEnabled=false` in gradle.properties |
| 7 | Power negotiation — phone charges instead of hosting | Low–Medium | No device detection | Use a powered USB-C hub |
| 8 | `atob` not in Hermes | Low | Preprocessing crash | Replace with `base-64` npm package |
| 9 | NDK version mismatch | Low | Build failure | Pin NDK to `21.4.7075529` in gradle.properties |
