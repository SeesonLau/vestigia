# Chat 1 of 4 — Architecture diagrams + ERD (Sections 2.1 + 2.7)

> **How to use this file:** open <https://claude.ai/new>, attach
> this file, and Claude will produce **8 Excalidraw figures** — the
> seven system architecture views (Section 2.1) and the single
> entity relationship diagram (Section 2.7). The other thesis
> sections (2.4, 2.6) live in their own chat files; do not work on
> them here.
>
> Read the whole file once before starting. Skipping the
> verification step at the bottom of any figure spec is the most
> common cause of hallucinated drawings.

---

## Excalidraw setup (do this once before drawing every figure)

1. **Font Family → Font Picker → Use Nunito.** Click the Font Family
   selector in Excalidraw's top toolbar to open the font picker, then
   choose **Nunito**. Every text element in every figure uses Nunito,
   including shape labels, edge labels, and the figure caption.
2. **Sloppiness → Architect.** Click the Sloppiness selector and
   choose **Architect** (the leftmost, cleanest option). Architect
   produces straight, precise lines suitable for a thesis.
3. **Stroke style.** Solid for primary paths and required data flow;
   dashed only for fallback, optional, or future paths as marked in
   the figure spec.
4. **Bound arrows only.** Every arrow must be bound to its source and
   target shape ids — when you drop an arrow endpoint over a shape,
   Excalidraw shows a small dot to indicate the binding has taken.
   Free-floating arrows (endpoints in empty canvas) are forbidden.
5. **Elbow / orthogonal routing.** Right-angle arrows only. No
   diagonals. If an arrow would clip through an unrelated shape, add
   an intermediate waypoint to detour around it. A clean diagram has
   no line passing through a node it does not connect to.

---

## Project context

LumenAI / Vestigia is a React Native + Expo + Supabase mobile
application together with a Next.js admin web console for Diabetic
Peripheral Neuropathy thermal screening. It uses a FLIR Lepton 3.5
sensor on a PureThermal Mini Pro USB host, runs a remote HuggingFace
Spaces FastAPI server (YOLO + sklearn fusion classifier), and stores
data in row level security gated Postgres. The figures below document
the system at the level of detail needed for a thesis Methodology
chapter.

---

## Procedure for every figure

For each figure, follow this fixed five step procedure. Do not skip
any step. Failing the verification at step 3 and submitting anyway is
worse than asking the user a clarifying question.

1. **Place shapes.** Place every shape from the spec's shape table on
   the canvas at the listed grid position. Do not add any shape that
   is not in the table. Do not skip any shape that is.
2. **Bind arrows.** For each row in the spec's edge table, draw one
   bound elbow arrow from source to target with the listed label and
   stroke style.
3. **Verify.** Run the verification checklist printed at the bottom
   of the figure spec. Report the verification results inline in the
   chat output (one line per check, prefixed with ✓ or ✗) so the user
   can confirm every diamond, every edge, and every terminal at a
   glance.
4. **Fix.** If any verification check fails, redraw the affected
   shapes or arrows before continuing.
5. **Submit.** Save the final view via the Excalidraw MCP tool. The
   view name is the figure id, written as `Fig-2.X.Y_Short-Title`.

After every figure has been produced, list every view name in the
final summary checklist at the end of this file.

---

## Drawing rules

These rules apply to every figure unless a figure spec explicitly
overrides one of them.

### Typography

- Font family is Nunito throughout.
- Shape labels: 14 pt.
- Edge labels: 12 pt.
- Figure title (above the canvas, optional): 16 pt.
- Figure caption (below the canvas, in the thesis layout): 12 pt
  italic, formatted as `Fig 2.X.Y. <Title>`.

### Node label rule (strict)

Every label inside a shape is one keyword, **1–3 words, single line**.

- No line breaks inside any node's text.
- No version numbers (write `YOLO`, not `YOLOv11`).
- No parenthetical sub text (write `Lepton`, not `Lepton (160×120)`).
- No captions, tag lines, or sub labels stacked beneath a label.

Long descriptive text lives in the thesis prose body, never inside a
shape. Edge labels follow the same brevity (≤ 3 words).

### Shape semantics (strict)

- Rounded rectangle: terminal state — `Start`, `End`, `Error`,
  `Cancel`, `Unknown`, etc.
- Rectangle: process step.
- Diamond: decision (yes / no edges, or explicit value labels).
- Parallelogram: input / output (form field, file, parameter).
- Hexagon: external system call (Supabase RPC, Edge Function, AI API,
  native module method).
- Cylinder: data store (Postgres table, Storage bucket, AsyncStorage).

### Diamond completeness (strict)

Every diamond has **at least two outgoing labelled edges**.

- Two way diamonds use `yes` and `no`.
- Multi way diamonds enumerate every possible value (e.g. `Approve`,
  `Reject`, `Cancel` for a three way decision).
- A diamond with only one outgoing edge is a logic error and must be
  redrawn before the figure ships.
- The verification block at the end of every figure spec requires you
  to enumerate the outgoing edges of every diamond — do that
  enumeration honestly.

### One terminal per kind (strict)

Per figure, there is exactly one shared terminal of each kind:

- One `End` rounded terminal for the success path.
- One `Error` rounded terminal for every failure path. All failure
  paths route into the same `Error` shape; the failure context lives
  on the *edge label* (e.g. `fail`, `timeout`, `403`), not as an
  intermediate `Sign Up Error → Error` chain.
- One `Cancel` rounded terminal if the figure has a discard path.
- One `Unknown` rounded terminal only for paths where neither success
  nor failure applies (used in DPN classification only).

### No redundant relay nodes

When a flow says "loop back to form on validation failure", draw a
single bound arrow from the diamond directly back to the form shape.
Do not insert a `Show Errors` rectangle between them. Do not draw an
`Errors` rectangle that is itself the predecessor of a generic
`Error` terminal — that is the redundancy the user has called out.

### Bound arrows + elbow routing

Every arrow is a bound arrow (anchored to source and target shape
ids). Every arrow uses orthogonal routing — horizontal and vertical
segments only, joined by right angle corners. No diagonals.

If a routed arrow would clip through an unrelated shape, add an
intermediate waypoint to detour. The minimum clearance between any
arrow segment and any unrelated shape is 80 px.

### Colour palette (LumenAI brand)

- Teal `#0E7A89` — primary processes, data flow, `Start`, `End`.
- Amber `#B45309` — decision diamonds, warning paths.
- Red `#B91C1C` — `Error` rounded terminal stroke and red text only.
- Zinc grey `#52525B` — neutral, external boundaries.
- Background white. Shape fill is white; the stroke colour is the one
  listed above.

### Layout

- Flowcharts read top to bottom.
- Block diagrams read left to right (usually) or top to bottom for
  layered tier views.
- Group related shapes inside a labelled rectangle (e.g. "Native
  side", "Cloud", "Admin web") when the spec calls for it.
- Each diagram fits on a single page — target around 8 × 6 inches at
  300 dpi. Generous spacing (≥ 80 px clearance between any arrow
  segment and any unrelated shape) is mandatory.

---

## Abbreviation glossary (renders ONCE in the thesis prose, not inside every diagram)

This table goes into the chapter body — typically as a short "List of
Abbreviations" page at the start of the Methodology chapter. Do not
embed it inside every figure. The strict node label rule already
requires every shape to use these abbreviations as bare keywords, and
a 22 row legend would dominate any single figure.

| Abbrev | Meaning |
|---|---|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| AsyncStorage | React Native key-value local store |
| BLE | Bluetooth Low Energy |
| CLAHE | Contrast-Limited Adaptive Histogram Equalisation |
| CSV | Comma-Separated Values |
| DB | Database |
| DOH | Department of Health (PH) |
| DPN | Diabetic Peripheral Neuropathy |
| EMA | Exponential Moving Average |
| HF | HuggingFace |
| JWT | JSON Web Token |
| LTO | License To Operate |
| OTG | On-The-Go (USB) |
| PNG | Portable Network Graphics |
| PSGC | Philippine Standard Geographic Code |
| RLS | Row-Level Security |
| ROI | Region of Interest |
| RPC | Remote Procedure Call |
| STM32 | ST Microelectronics 32-bit MCU |
| TIFF | Tagged Image File Format |
| UVC | USB Video Class |
| VoSPI | Video over SPI (Lepton output) |
| YOLO | You Only Look Once (object detector) |

---
# Section 2.1 — System Architecture (7 figures)

This section is composed of formal block diagrams. Treat the layout
grid as a structural constraint, not a hint. Sub shapes inside a
group rectangle are placed in vertical column order so that the
group's labelled border can be drawn cleanly around them. No
decorative flourishes, no whimsical labels — these are thesis grade
architecture diagrams.

## Fig 2.1.1 — System Overview

**Type:** block diagram, left to right tier flow.
**Layout:** 6 columns × 5 rows. Cell 240 × 160 px. Origin (60, 60).

**Shapes (id · type · label · grid position):**

- T1 · group rectangle · `Hardware` · spans (1, 2) – (1, 4)
- T2 · group rectangle · `Firmware` · spans (2, 2) – (2, 4)
- T3 · group rectangle · `Mobile App` · spans (3, 2) – (3, 4)
- T4 · group rectangle · `Cloud` · spans (4, 1) – (4, 5)
- T5 · group rectangle · `Web Admin` · spans (5, 2) – (5, 4)
- T6 · hexagon · `HF Spaces` · (6, 3)
- N1 · rectangle · `Lepton` · inside T1 row 2
- N2 · rectangle · `PureThermal` · inside T1 row 3
- N3 · rectangle · `Camera FW` · inside T2 row 2
- N4 · rectangle · `UVC Module` · inside T2 row 3
- N5 · rectangle · `Expo Router` · inside T3 row 2
- N6 · rectangle · `Stores` · inside T3 row 3
- N7 · rectangle · `Lib` · inside T3 row 4
- N8 · cylinder · `Postgres` · inside T4 row 1
- N9 · rectangle · `Auth` · inside T4 row 2
- N10 · cylinder · `Storage` · inside T4 row 3
- N11 · hexagon · `Edge Fns` · inside T4 row 4
- N12 · hexagon · `RPCs` · inside T4 row 5
- N13 · rectangle · `Routes` · inside T5 row 2
- N14 · rectangle · `Admin RPC` · inside T5 row 3

**Edges (id · source → target · label · style):**

Arrows connect group rectangles, not the inner shapes. Bind each
arrow endpoint to the group's border.

- E1 · T1 → T2 · `USB` · solid
- E2 · T2 → T3 · `JNI` · solid
- E3a · T3 → T4 · `HTTPS` · solid
- E3b · T4 → T3 · `HTTPS` · solid (drawn parallel to E3a, offset)
- E4a · T5 → T4 · `HTTPS` · solid
- E4b · T4 → T5 · `HTTPS` · solid (drawn parallel to E4a, offset)
- E5 · T3 → T6 · `HTTPS` · solid

**Verification (run before submitting; report results inline):**

1. Tier groups present: T1 Hardware, T2 Firmware, T3 Mobile App, T4
   Cloud, T5 Web Admin, T6 HF Spaces. Six groups.
2. Sub shape count: 14 (N1–N14). Each sub shape lives inside the
   group named in its grid position.
3. Edges: 7 total (E1, E2, E3a, E3b, E4a, E4b, E5). Each is bound at
   both endpoints to a group rectangle.
4. No edge clips through any group it does not connect to.
5. Bidirectional pairs (E3a/E3b and E4a/E4b) are drawn as two
   parallel arrows offset slightly so both arrowheads are visible.

## Fig 2.1.2 — Hardware Tier

**Type:** block diagram, left to right physical signal chain.
**Layout:** 6 columns × 3 rows. Cell 220 × 160 px. Origin (60, 60).

**Shapes:**

- N1 · rectangle · `Lepton` · (1, 2)
- N2 · rectangle · `STM32` · (2, 2)
- N3 · rectangle · `UVC` · (3, 2)
- N4 · rectangle · `USB-OTG` · (4, 2)
- N5 · rectangle · `Phone` · (5, 2)
- N6 · rectangle · `ESP32` · (5, 3) (dashed stroke — future hardware)

**Edges:**

- E1 · N1 → N2 · `VoSPI` · solid
- E2 · N2 → N1 · `I²C` · dashed
- E3 · N2 → N3 · — · solid
- E4 · N3 → N4 · — · solid
- E5 · N4 → N5 · `USB` · solid
- E6 · N6 → N5 · `BLE` · dashed

**Verification:**

1. Six shapes (N1–N6). N6 has dashed stroke.
2. Six edges. E2 (I²C control channel) is dashed because it is the
   reverse control direction; E6 is dashed because the ESP32 path is
   future hardware.
3. Every arrow bound at both endpoints; every arrow uses elbow
   routing.
4. No diamond in this figure (block diagram has no decisions).

## Fig 2.1.3 — Firmware and Native UVC Pipeline

**Type:** block diagram, left to right pipeline with a five way fork
at the end.
**Layout:** 9 columns × 6 rows. Cell 200 × 130 px. Origin (60, 60).

**Shapes:**

- T1 · group rectangle · `Native Side` · spans (1, 2) – (8, 4)
- N1 · parallelogram · `Y16` · (1, 3) (input)
- N2 · rectangle · `Median` · (2, 3)
- N3 · rectangle · `EMA` · (3, 3)
- N4 · rectangle · `CLAHE` · (4, 3)
- N5 · rectangle · `Upscale` · (5, 3)
- N6 · rectangle · `Unsharp` · (6, 3)
- N7 · rectangle · `Emissivity` · (7, 3)
- N8 · rectangle · `Palette` · (8, 3)
- N9 · parallelogram · `Live Preview` · (9, 1) (output)
- N10 · parallelogram · `3-Slot PNG` · (9, 2) (output)
- N11 · parallelogram · `TIFF` · (9, 3) (output)
- N12 · parallelogram · `CSV` · (9, 4) (output)
- N13 · parallelogram · `Masked CSV` · (9, 5) (output)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · — · solid
- E4 · N4 → N5 · — · solid
- E5 · N5 → N6 · — · solid
- E6 · N6 → N7 · — · solid
- E7 · N7 → N8 · — · solid
- E8 · N8 → N9 · — · solid
- E9 · N8 → N10 · — · solid
- E10 · N8 → N11 · — · solid
- E11 · N8 → N12 · — · solid
- E12 · N8 → N13 · — · solid

**Verification:**

1. Thirteen shapes total. Eight pipeline shapes (N1–N8) live inside
   the `Native Side` group rectangle T1. Five output parallelograms
   (N9–N13) live outside T1.
2. Pipeline arrows E1–E7 form a single horizontal chain.
3. Fork arrows E8–E12 originate at N8 (`Palette`); each terminates
   at a distinct output parallelogram. Five arrows total.
4. No diamond; no `Error` terminal.
5. Group rectangle T1's border encloses N1 through N8 only.

## Fig 2.1.4 — Mobile App Tier

**Type:** block diagram, clustered.
**Layout:** 5 columns × 7 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes:**

- T1 · group rectangle · `RN App` · spans (1, 1) – (3, 7)
- T2 · group rectangle · `Expo Router` · spans (1, 2) – (1, 5) inside T1
- T3 · group rectangle · `Stores` · spans (2, 2) – (2, 5) inside T1
- T4 · group rectangle · `Libs` · spans (3, 2) – (3, 7) inside T1
- N1 · rectangle · `Auth` · inside T2 row 2
- N2 · rectangle · `Clinic` · inside T2 row 3
- N3 · rectangle · `Patient` · inside T2 row 4
- N4 · rectangle · `Offline` · inside T2 row 5
- N5 · rectangle · `Auth Store` · inside T3 row 2
- N6 · rectangle · `Session Store` · inside T3 row 3
- N7 · rectangle · `DPN Store` · inside T3 row 4
- N8 · rectangle · `ROI Store` · inside T3 row 5
- N9 · rectangle · `UVC Camera` · inside T4 row 2
- N10 · rectangle · `Capture` · inside T4 row 3
- N11 · rectangle · `Bundle Store` · inside T4 row 4
- N12 · rectangle · `DPN API` · inside T4 row 5
- N13 · rectangle · `Avatar Upload` · inside T4 row 6
- N14 · rectangle · `Admin Lib` · inside T4 row 7
- N15 · hexagon · `UVC Module` · (5, 3)
- N16 · cylinder · `Supabase` · (5, 5)
- N17 · hexagon · `HF Spaces` · (5, 7)

**Edges:**

- E1 · N9 → N15 · `JNI` · solid
- E2 · T3 → N16 · `HTTPS` · solid (one bound arrow from the Stores
  group rectangle border to Supabase)
- E3 · N12 → N17 · `HTTPS` · solid

**Verification:**

1. Outer group T1 (`RN App`) contains three sub groups (T2, T3, T4)
   and 14 inner rectangles (N1–N14).
2. External shapes outside T1: N15 hexagon, N16 cylinder, N17
   hexagon. Three external nodes.
3. Three edges total. All bound; all elbow routed; none clip through
   the RN App group except their declared endpoints.
4. No diamond.

## Fig 2.1.5 — Cloud Backend Tier

**Type:** block diagram, clustered.
**Layout:** 5 columns × 8 rows. Cell 200 × 120 px. Origin (60, 60).

**Shapes:**

- T1 · group rectangle · `Supabase` · spans (1, 1) – (4, 8)
- T2 · group rectangle · `Postgres` · spans (1, 2) – (1, 8) inside T1
- T3 · group rectangle · `Auth` · (2, 2) inside T1
- T4 · group rectangle · `Storage` · spans (2, 4) – (2, 6) inside T1
- T5 · group rectangle · `Edge Fns` · spans (3, 2) – (3, 4) inside T1
- T6 · group rectangle · `RPCs` · spans (4, 2) – (4, 8) inside T1
- N1 · cylinder · `profiles` · inside T2 row 2
- N2 · cylinder · `clinics` · inside T2 row 3
- N3 · cylinder · `patients` · inside T2 row 4
- N4 · cylinder · `sessions` · inside T2 row 5
- N5 · cylinder · `captures` · inside T2 row 6
- N6 · cylinder · `results` · inside T2 row 7
- N7 · cylinder · `tickets` · inside T2 row 8
- N8 · rectangle · `auth.users` · inside T3
- N9 · cylinder · `avatars` · inside T4 row 4
- N10 · cylinder · `images` · inside T4 row 5
- N11 · cylinder · `csv` · inside T4 row 6
- N12 · hexagon · `Clinic Signup` · inside T5 row 2
- N13 · hexagon · `Auth Redirect` · inside T5 row 3
- N14 · hexagon · `Set Password` · inside T5 row 4
- N15 · hexagon · `Reset Request` · inside T6 row 2
- N16 · hexagon · `Submit Ticket` · inside T6 row 3
- N17 · hexagon · `Approve Clinic` · inside T6 row 4
- N18 · hexagon · `Reject Clinic` · inside T6 row 5
- N19 · hexagon · `Resolve Ticket` · inside T6 row 6
- N20 · hexagon · `Submit Session` · inside T6 row 7
- N21 · hexagon · `Find Patient` · inside T6 row 8
- X1 · rectangle · `Mobile App` · (5, 4) (external, outside T1)
- X2 · rectangle · `Web Admin` · (5, 6) (external, outside T1)

**Edges:**

- E1 · X1 → T6 · `RPC` · solid
- E2 · X2 → T6 · `RPC` · solid
- E3 · X2 → N14 · `Invoke` · solid

**Verification:**

1. Outer Supabase group T1 contains five sub groups (T2 Postgres, T3
   Auth, T4 Storage, T5 Edge Fns, T6 RPCs).
2. Twenty one inner shapes (N1–N21) total inside T1. Two external
   rectangles (X1, X2) outside T1.
3. Three edges total. E1 and E2 are bound to the RPCs group border;
   E3 is bound to the specific Set Password hexagon (N14) inside T5.
4. No edge clips through the Supabase outer rectangle except at the
   declared entry points.

## Fig 2.1.6 — Web Admin Tier

**Type:** block diagram, top to bottom.
**Layout:** 3 columns × 8 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes:**

- T1 · group rectangle · `web/` · spans (1, 1) – (2, 8)
- N1 · rectangle · `Root` · (2, 1) inside T1
- N2 · rectangle · `Layout` · (2, 2) inside T1
- N3 · rectangle · `Login` · (1, 3) inside T1
- N4 · rectangle · `Dashboard` · (2, 3) inside T1
- N5 · rectangle · `Clinics` · (1, 4) inside T1
- N6 · rectangle · `Resets` · (2, 4) inside T1
- N7 · rectangle · `Tickets` · (1, 5) inside T1
- N8 · rectangle · `Auth Hook` · (2, 6) inside T1
- N9 · rectangle · `Admin RPC` · (2, 7) inside T1
- N10 · cylinder · `Supabase` · (3, 7) (external)

**Edges:**

- E1 · N1 → N4 · `redirect` · solid
- E2 · N2 → N8 · `gate` · solid
- E3 · N8 → N10 · `HTTPS` · solid
- E4 · N9 → N10 · `HTTPS` · solid

**Verification:**

1. Group T1 contains nine inner shapes (N1–N9). Supabase cylinder
   N10 is external.
2. Four edges total. All bound; all elbow routed.
3. No diamond.

## Fig 2.1.7 — External AI Tier

**Type:** block diagram, left to right with a self loop on the
health poll diamond.
**Layout:** 5 columns × 4 rows. Cell 220 × 150 px. Origin (60, 60).

**Shapes:**

- N1 · rectangle · `Mobile App` · (1, 2)
- N2 · diamond · `Health Poll` · (3, 2)
- T1 · group rectangle · `HF Spaces` · spans (5, 1) – (5, 3)
- N3 · rectangle · `YOLO` · (5, 1) inside T1
- N4 · rectangle · `Fusion` · (5, 3) inside T1

**Edges:**

- E1 · N1 → N2 · `Health` · solid
- E2 · N2 → N2 · `wait` · dashed (self loop on the cold start retry)
- E3 · N2 → T1 · `Predict` · solid (labelled `ready` on the diamond's other branch)
- E4 · T1 → N1 · `Result` · solid (return path)
- E5 · N3 → N4 · — · solid (internal HF Spaces flow)

**Verification:**

1. N2 is a diamond. It has at least two outgoing edges:
   - E2 (self loop, label `wait`) on the `not ready` branch.
   - E3 (to `HF Spaces`, label `Predict` with branch label `ready`)
     on the `ready` branch.
   Two outgoing edges: PASS.
2. Five edges total (E1, E2, E3, E4, E5).
3. Group T1 (`HF Spaces`) contains two inner rectangles (N3 YOLO,
   N4 Fusion). E5 is internal to the group.
4. No edge clips through any unrelated shape.
5. The polling self loop E2 is drawn as a small horizontal arc above
   the diamond, returning to its left side. Use a dashed stroke.

# Section 2.7 — Database (1 figure)

Only one figure in this section: the entity relationship diagram of
the LumenAI Postgres schema. No process charts.

## Fig 2.7.1 — Entity Relationship Diagram

**Type:** ERD, four cluster groups arranged left to right with
foreign key arrows between clusters.
**Layout:** 5 columns × 7 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes (entities are rendered as plain rectangles holding the table
name only — no column listings inside the rectangle):**

- T1 · group rectangle (dashed border) · `Reference` · spans (1, 1) – (1, 4)
- T2 · group rectangle · `Identity` · spans (2, 1) – (2, 3)
- T3 · group rectangle · `Sessions` · spans (3, 1) – (3, 5)
- T4 · group rectangle · `Workflow` · spans (4, 1) – (4, 5)
- N1 · rectangle (dashed) · `ph_regions` · inside T1 row 1
- N2 · rectangle (dashed) · `ph_provinces` · inside T1 row 2
- N3 · rectangle (dashed) · `ph_cities` · inside T1 row 3
- N4 · rectangle (dashed) · `ph_barangays` · inside T1 row 4
- N5 · rectangle (dashed) · `auth.users` · inside T2 row 1
- N6 · rectangle · `profiles` · inside T2 row 2
- N7 · rectangle · `clinics` · inside T2 row 3
- N8 · rectangle · `patients` · inside T3 row 1
- N9 · rectangle · `screening_sessions` · inside T3 row 2
- N10 · rectangle · `thermal_captures` · inside T3 row 3
- N11 · rectangle · `patient_vitals` · inside T3 row 4
- N12 · rectangle · `classification_results` · inside T3 row 5
- N13 · rectangle · `clinic_access_relationships` · inside T4 row 1
- N14 · rectangle · `clinic_password_reset_requests` · inside T4 row 2
- N15 · rectangle · `support_tickets` · inside T4 row 3
- N16 · rectangle · `data_requests` · inside T4 row 4
- N17 · rectangle · `system_config` · inside T4 row 5

Style note: dashed stroke marks tables that are seeded once at
deploy time and not modified at runtime (the four PSGC tables and
auth.users). All other entity rectangles use the solid teal stroke.

**Edges (foreign key relationships, written as
`source_table.column → referenced_table`):**

All edges are solid bound elbow arrows. The arrowhead points toward
the referenced (1) end. All FKs in this schema are N to 1 (no many
to many, no self references).

PSGC chain (inside T1):

- E1 · N2 → N1 · `region_code` · solid
- E2 · N3 → N2 · `province_code` · solid
- E3 · N4 → N3 · `city_code` · solid

Identity:

- E4 · N6 → N5 · `id` · solid
- E5 · N6 → N7 · `clinic_id` · dashed (optional FK — only set on clinic operator profiles)
- E6 · N7 → N6 · `owner_profile_id` · solid
- E7 · N7 → N1 · `region_code` · solid
- E8 · N7 → N2 · `province_code` · dashed (optional)
- E9 · N7 → N3 · `city_code` · solid
- E10 · N7 → N4 · `barangay_code` · solid

Sessions:

- E11 · N8 → N7 · `clinic_id` · solid
- E12 · N8 → N6 · `profile_id` · solid
- E13 · N9 → N8 · `patient_id` · solid
- E14 · N9 → N7 · `clinic_id` · solid
- E15 · N9 → N6 · `operator_id` · solid
- E16 · N9 → N6 · `subject_profile_id` · solid (parallel to E15, offset)
- E17 · N10 → N9 · `session_id` · solid
- E18 · N11 → N9 · `session_id` · solid
- E19 · N12 → N9 · `session_id` · solid

Workflow:

- E20 · N13 → N7 · `clinic_id` · solid
- E21 · N13 → N6 · `patient_profile_id` · solid
- E22 · N14 → N6 · `clinic_profile_id` · solid
- E23 · N14 → N6 · `reviewed_by` · dashed (optional)
- E24 · N15 → N6 · `submitter_profile_id` · solid
- E25 · N15 → N6 · `resolved_by` · dashed (optional)
- E26 · N16 → N6 · `from_profile_id` · solid
- E27 · N16 → N6 · `to_profile_id` · solid (parallel to E26, offset)

**Verification before submitting:**

1. Cluster groups present: T1 Reference (dashed), T2 Identity, T3
   Sessions, T4 Workflow. Four groups.
2. Entity count: 17 (N1–N17). The five entities with dashed strokes
   are N1, N2, N3, N4, N5. The remaining 12 use the solid teal
   stroke.
3. Edge count: 27. Every edge is a bound elbow arrow with the FK
   column name as its label. No edge labels exceed three words; the
   FK column name itself is treated as a single token.
4. Parallel arrows (E15 and E16; E26 and E27) are drawn offset by
   roughly 30 px so both arrowheads are clearly visible.
5. No edge clips through an unrelated entity rectangle. Edges that
   cross cluster boundaries enter and exit each cluster on the
   nearest side; if a route would clip, add a waypoint to detour.
6. No diamond. No `Error` terminal. No process flow.


---

## Final summary you must emit

After producing every view, list every figure name in a single
Markdown checklist:

```
- [ ] Fig 2.1.1_System-Overview
- [ ] Fig 2.1.2_Hardware-Tier
- [ ] Fig 2.1.3_Firmware-UVC-Pipeline
- [ ] Fig 2.1.4_Mobile-App-Tier
- [ ] Fig 2.1.5_Cloud-Backend-Tier
- [ ] Fig 2.1.6_Web-Admin-Tier
- [ ] Fig 2.1.7_External-AI-Tier
- [ ] Fig 2.7.1_ERD
```

Stop after the checklist. Do not generate Section 2.6 figures
(those are handled in chats 3 and 4) and do not generate the
Section 2.4 prose subsections (those are handled in chat 2).
