# Tech Context — Vestigia

## Core Stack
| Layer | Technology | Version |
|---|---|---|
| Framework | React Native + Expo | RN 0.81.5, Expo 54.0.33 |
| Routing | Expo Router | 6.0.23 |
| Language | TypeScript | 5.9.2 (strict) |
| State | Zustand | 5.0.11 |
| Local DB | WatermelonDB | TBD — not yet installed |
| Cloud DB | Supabase | 2.99.2 |
| React | React | 19.1.0 |

## Database Strategy — Offline-First Dual DB
- **Local:** WatermelonDB — offline capture, temporary session storage, queue for sync
- **Cloud:** Supabase (PostgreSQL) — persistent storage, syncs when online
- **Auth:** Supabase built-in auth (`auth.users`) — `profiles` table extends it via FK
- **Sync direction:** Local → Supabase (push on connectivity restore)
- **Full schema:** see `_project-docs/memory-bank/schema.md`

## Supabase
- **Project ref:** `yqgpykyogvoawlffkeoq`
- **Region:** ap-northeast-2 (Asia Pacific - Seoul)
- **Pooler:** `aws-1-ap-northeast-2.pooler.supabase.com:5432` (session mode)
- **MCP:** Configured in `.mcp.json` via `@modelcontextprotocol/server-postgres`
- **Env vars:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Database Tables (Supabase)
- `profiles` — extends auth.users with role (patient/clinic/admin)
- `clinics` — healthcare facilities
- `patients` — patient records linked to clinics (anonymized via patient_code)
- `devices` — thermal imaging hardware (hardware specs TBD)
- `screening_sessions` — scan session lifecycle records
- `thermal_captures` — 160×120 thermal matrix + angiosome temps + TCI (Lepton 3.5 — was documented as 80×62 which is Lepton 2.x)
- `patient_vitals` — blood glucose, BP, HbA1c per session
- `classification_results` — AI output, asymmetries, confidence score

## Hardware — Thermal Camera

### Camera + Carrier Board
| Item | Spec |
|---|---|
| **Camera module** | FLIR Lepton 3.5 (LWIR, radiometric) |
| **Carrier board** | GroupGets PureThermal Mini Pro JST-SR (PURETHERMAL-M-PRO-JST) |
| **Board MCU** | STM32F412CGU6 ARM Cortex-M4 (1M Flash, 512K RAM) |
| **Board dimensions** | 19.5 × 15.32mm |
| **Lepton interface (internal)** | SPI (frame data) + I2C/CCI (control) — internal to board, not exposed externally |
| **Host interface** | USB 2.0 Full Speed via JST-SR connector → JST-SR to USB-C cable to phone |
| **USB class** | UVC 1.0 (USB Video Class) — plug-and-play, no custom driver on Android 5.0+ |
| **USB VID/PID** | `0x1e4e` / `0x0100` |
| **Frame rate** | 9 Hz (hardcoded in firmware) |
| **Resolution** | 160×120 pixels (Lepton 3.5) |
| **Power** | Bus-powered via USB JST-SR; avg ~62.6mA with Lepton, 230mA peak during shutter |
| **Max input voltage** | 5.5V |
| **Firmware** | Open source (groupgets/purethermal1-firmware), STM32, customizable |
| **Firmware update** | USB DFU mode (hold BOOT + press RST); tool: `dfu-util` |

### JST-SR Connector Pinout
| Pin | Signal |
|---|---|
| +5V | Power |
| D- | USB Data − |
| D+ | USB Data + |
| GND | Ground |

> The JST-SR connector carries **real USB 2.0 signals** (D+/D−). A JST-SR to USB-C cable is a valid USB connection — not a passive pin remap. The device is a proper USB peripheral.

### Output Formats (UVC)
| Format | Bits/px | Use case |
|---|---|---|
| Y16 / RAW14 | 16 | **Use this** — raw radiometric temperature data per pixel |
| YUYV | 16 | Default at boot — pseudocolor |
| GREY | 8 | 8-bit AGC output |
| RGB565 | 16 | Color mapped |
| BGR3 | 24 | Color mapped |

**For DPN screening, use Y16 (RAW14)** — gives raw 14-bit temperature values per pixel. Frame size: 160 × 120 × 2 bytes = 38,400 bytes/frame (~345 KB/s at 9fps).

### Android Compatibility
- Android 5.0+ supports UVC natively — the PureThermal enumerates as a standard USB video device
- Works with VLC, GetThermal, and any UVC-capable app on Android
- **React Native has no built-in UVC support** — requires a native Android module using `android.hardware.usb` + a UVC library (e.g. `uvccamera` for Android) bridged to React Native

### Physical Wiring Plan
```
PureThermal Mini Pro JST-SR port
        ↓
JST-SH 4-pin female housing (1.0mm pitch — compatible with JST-SR header, same pitch)
Wired to USB-A male:
  Pin 1 (+5V)  → USB-A VBUS (red)
  Pin 2 (D−)   → USB-A D−   (white)
  Pin 3 (D+)   → USB-A D+   (green)
  Pin 4 (GND)  → USB-A GND  (black)
        ↓
USB-A to USB-C adapter
        ↓
Android phone (USB host / OTG mode)
```

**Why JST-SH instead of JST-SR:** Both use 1.0mm pitch and mate with the same PCB-side SH-series shrouded headers. JST-SH female housing fits the PureThermal's connector. JST-SH is crimp-type (manual wire insertion); JST-SR is IDC (insulation displacement). Electrically and mechanically compatible at the connector level.

**PC testing:** The same JST-SH to USB-A cable plugs directly into a PC for testing with VLC or GetThermal before bringing it to the phone.

### What Is Needed for Guaranteed App Connection
1. **JST-SH female 4-pin housing** wired to USB-A — physical connection to PureThermal
2. **USB-A to USB-C adapter** — connects to Android phone
3. **Android USB host / OTG mode** — verify phone supports it (test with a USB flash drive first)
4. **Native Android UVC module** — built in `UVCModule.kt` using saki4510t/UVCCamera library
5. **`expo run:android`** — must build natively; Expo Go cannot load the UVC native module

### Matrix Dimension Note
All previous references to `80×62` were based on Lepton 2.x. The confirmed camera (Lepton 3.5) outputs **160×120**. This affects:
- FR-506 preprocessing module (`normalizeMatrix`, `segmentFootRegion`, `buildApiPayload`)
- `thermal_captures` schema and any type definitions referencing matrix size

## UI & Fonts
- No external UI library — custom StyleSheet components
- **Fonts:** Space Grotesk (400/500/600/700) + Space Mono (400)
- **Icons:** Expo Vector Icons, Expo Symbols, React Native SVG
- **Animations:** Reanimated 4.1.1 + Gesture Handler 2.28.0

## Dev Setup
```bash
npm install
npx expo start
```
Requires `.env.local` with Supabase URL and anon key.

## Mock Accounts (dev/demo)
| Email | Password | Role |
|---|---|---|
| clinic@email.com | 12345678 | clinic |
| admin@email.com | 12345678 | admin |
| patient@email.com | 12345678 | patient |
