# Hardware Reference — FLIR Lepton 3.5 + PureThermal Mini Pro
**Last updated:** 2026-04-25

> This file is the single source of truth for all hardware documentation, firmware references, and Android integration links related to the thermal camera stack.

---

## Reference Links

| Resource | URL | Purpose |
|---|---|---|
| Android UVC Library (reference app) | https://github.com/MartyMacGyver/UVCCamera | Android UVC camera library + sample app (fork of saki4510t). Reference for UVC integration on non-rooted Android. |
| PureThermal Firmware Source | https://github.com/groupgets/purethermal1-firmware | STM32 firmware for PureThermal Mini Pro. Contains UVC descriptor definitions (usbd_uvc_if.c, uvc_desc.h). |
| PureThermal Mini Pro JST-SR Datasheet | https://groupgets-files.s3.amazonaws.com/PureThermal_Pro/PureThermal%20Mini%20Pro%20JST-SR-%20Datasheet%20-%201.1.pdf | Hardware pinout, power specs, board dimensions, USB specs. |
| Lepton Engineering Datasheet (Rev 400) | https://groupgets-files.s3.amazonaws.com/purethermal/Lepton%20Engineering%20Datasheet%20Rev%20400%20%28500-0659-00-09%29.pdf | Full sensor spec: resolution, frame rate, power, SPI protocol, radiometric output format. |
| Lepton Software IDD (Rev 303) | https://groupgets-files.s3.amazonaws.com/purethermal/Lepton-Software-IDD-Rev303.pdf | SDK interface spec: CCI (I2C) commands, RAD registers, AGC control, Y16/RAW14 data format, Kelvin conversion. |
| Eclipse + JTAG Debug Setup | https://github.com/groupgets/purethermal1-firmware | Same repo as firmware — contains Eclipse project and JTAG debug config for STM32. |

---

## Hardware Stack

```
FLIR Lepton 3.5 sensor
    ↓ SPI (frame data) + I2C/CCI (control) — internal to PureThermal board
PureThermal Mini Pro JST-SR (STM32F412CGU6)
    ↓ USB 2.0 Full Speed (UVC 1.0)
JST-SR connector → USB-C cable
    ↓
Android phone (USB host / OTG mode)
    ↓
UVCModule.kt → libuvccamera.aar → JS (React Native)
```

---

## UVC Format Descriptors (PureThermal Firmware)

The PureThermal firmware exposes **5 UVC video format descriptors**, confirmed from `usbd_uvc_if.c`:

| Index | Format | Bit depth | Data type | Use |
|---|---|---|---|---|
| 1 | **YUYV** | 8-bit per channel | AGC visual (luma+chroma) | Visual display only — NOT temperature |
| 2 | **Y16** | 16-bit | RAW14 radiometric, little-endian | **Temperature data — use this** |
| 3 | **GREY** | 8-bit | AGC grayscale | Visual only |
| 4 | **RGB565** | 16-bit | AGC color | Visual only |
| 5 | **BGR3** | 24-bit | AGC color | Visual only |

> **Critical:** Only Y16 contains actual temperature values. YUYV/GREY/RGB565/BGR3 are all AGC-processed visual representations with no temperature information.

---

## Y16 / RAW14 Temperature Format

- Each pixel = **2 bytes, little-endian unsigned 16-bit integer**
- Value unit = **Kelvin × 100** (e.g., 30000 = 300.00K = 26.85°C)
- Frame size = 160 × 120 × 2 = **38,400 bytes**
- Frame rate = **9 Hz** (hardcoded in Lepton 3.5 firmware)

**Kelvin → Celsius conversion:**
```
raw_value = byte[i] | (byte[i+1] << 8)   // little-endian
temp_C    = (raw_value - 27315) / 100.0   // 27315 = 273.15°C × 100
```

This conversion is already implemented in `lib/thermal/preprocessing.ts` → `parseY16Frame()`.

---

## libuvccamera Format Constants (MartyMacGyver / saki4510t)

| Constant | Value | Maps to |
|---|---|---|
| `FRAME_FORMAT_YUYV` | 0 | YUYV UVC descriptor — AGC data |
| `FRAME_FORMAT_MJPEG` | 1 | MJPEG — not relevant |
| `DEFAULT_PREVIEW_MODE` | 0 | Same as YUYV |

> **⚠️ Critical gap:** The libuvccamera Java API has **NO constant for Y16 or RAW14**. `FRAME_FORMAT_YUYV` will match the YUYV UVC descriptor (AGC visual data), not Y16. This means the current `UVCModule.kt` implementation cannot retrieve temperature data through the standard API.

---

## Known Integration Problem

**Current state (UVCModule.kt):**
```kotlin
camera.setPreviewSize(160, 120, UVCCamera.FRAME_FORMAT_YUYV)  // Gets YUYV/AGC bytes
camera.setFrameCallback(frameCallback, UVCCamera.PIXEL_FORMAT_RAW)
```

**What this gives us:** 8-bit AGC luma+chroma bytes, interpreted by `parseY16Frame` as if they were 16-bit Kelvin values → **wrong temperatures**.

**What we need:** Y16 UVC descriptor selected → 16-bit little-endian Kelvin×100 per pixel.

**Solution path:** Call `libuvc` C API directly via JNI (bypassing the Java wrapper), request Y16 by its UVC GUID `{59313631-0000-0010-8000-00AA00389B71}`. The `libuvc.so` is already compiled into the AAR build outputs.

---

## PureThermal Hardware Specs Summary

| Spec | Value |
|---|---|
| MCU | STM32F412CGU6 ARM Cortex-M4 |
| Board size | 19.5 × 15.32mm |
| USB | USB 2.0 Full Speed, UVC 1.0 |
| USB VID | 0x1e4e (7758 decimal) |
| USB PID | 0x0100 (256 decimal) |
| Connector | JST-SR 4-pin (1.0mm pitch) |
| Power | Bus-powered; avg ~62.6mA, 230mA peak (FFC shutter) |
| Max voltage | 5.5V |
| Lepton interface | SPI (frames) + I2C/CCI (control) — internal |

## FLIR Lepton 3.5 Specs Summary

| Spec | Value |
|---|---|
| Resolution | 160 × 120 pixels |
| Frame rate | 9 Hz (firmware-limited) |
| Spectral range | 8–14 µm LWIR |
| NETD | < 50mK |
| Scene range | -10°C to +140°C (radiometric) |
| Output | Y16 / RAW14 (radiometric), YUYV (AGC) |
| FFC | Automatic flat-field correction (shutter click) |
| Startup time | ~5s to thermal stabilization |

---

## USB Device Filter (AndroidManifest)

Already correctly configured in `android/app/src/main/res/xml/usb_device_filter.xml`:
```xml
<usb-device vendor-id="7758" product-id="256" />
```
This matches PureThermal VID `0x1e4e` / PID `0x0100`.

---

## Key Files in This Project

| File | Purpose |
|---|---|
| `android/app/src/main/java/.../UVCModule.kt` | Native Android UVC module — needs Y16 fix |
| `lib/thermal/uvcCamera.ts` | JS bridge to UVCModule native module |
| `lib/thermal/preprocessing.ts` | Y16 byte parsing + temperature conversion |
| `app/(clinic)/live-feed.tsx` | Camera UI, frame display, capture flow |
| `android/app/libs/libuvccamera-release.aar` | Pre-built UVC library (includes libuvc.so) |
| `android/app/src/main/res/xml/usb_device_filter.xml` | USB VID/PID filter for auto-launch |
