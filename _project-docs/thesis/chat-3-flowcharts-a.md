# Chat 3 of 4 — Process Charts part A (Figures 2.6.1 – 2.6.10)

> **How to use this file:** open <https://claude.ai/new>, attach
> this file, and Claude will produce **10 Excalidraw flowcharts** —
> the first half of Section 2.6 (Auth, Capture, AI). The second
> half (Figs 2.6.11 – 2.6.20) lives in chat 4.
>
> Read the whole file once before starting. Skipping the
> verification step at the bottom of any figure spec is the most
> common cause of hallucinated drawings (clipped lines, diamonds
> with only one outgoing branch, redundant `Error → Error` chains).

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
# Section 2.6 — Process Charts (part A: Figures 2.6.1 – 2.6.10)

The strict rules apply: 1–3 word labels, single line; one shared
`Error` rounded terminal per figure; every diamond enumerates at
least two outgoing labelled edges; every shape declared in the spec
appears once on the canvas, no more, no less. Run the verification
checklist printed at the bottom of every spec, and report the
verification results inline before producing the Excalidraw view.

## Fig 2.6.1 — Patient Sign-Up

**Layout:** 3 columns × 8 rows. Cell 220 × 140 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · parallelogram · `Form` · (2, 2)
- N3 · diamond · `Validate` · (2, 3)
- N4 · hexagon · `Sign Up` · (2, 4)
- N5 · cylinder · `Profile` · (2, 5)
- N6 · rectangle · `Email Sent` · (2, 6)
- N7 · diamond · `Click Link` · (2, 7)
- N8 · hexagon · `Set Session` · (1, 8)
- N9 · rounded · `End` · (2, 8)
- N10 · rounded · `Error` · (3, 4)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `yes` · solid
- E4 · N3 → N2 · `no` · solid (route west then up; loops back to the form)
- E5 · N4 → N5 · — · solid
- E6 · N4 → N10 · `fail` · solid (route east)
- E7 · N5 → N6 · — · solid
- E8 · N6 → N7 · — · solid
- E9 · N7 → N8 · `yes` · solid (route south then west)
- E10 · N8 → N9 · — · solid
- E11 · N7 → N10 · `no` · solid (route east then north)

**Verification:**

1. Shape count = 10 (N1–N10).
2. Edge count = 11 (E1–E11).
3. Diamonds:
   - N3 (`Validate`): outgoing `yes` → N4, `no` → N2. Two labelled
     edges. PASS.
   - N7 (`Click Link`): outgoing `yes` → N8, `no` → N10. Two
     labelled edges. PASS.
4. Non terminal shapes (N2 through N8) each have at least one
   incoming and one outgoing edge.
5. Edge endpoints all resolve to shape ids in the table.
6. Reachability: every shape is on a path from N1 to N9 or N10. No
   orphan.
7. The `no` branch of N3 (edge E4) is drawn as a single bound arrow
   from N3 directly back to N2 — no intermediate `Show Errors` node.

## Fig 2.6.2 — Clinic Sign-Up

**Layout:** 3 columns × 8 rows. Cell 220 × 140 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · parallelogram · `Form` · (2, 2)
- N3 · diamond · `LTO Valid` · (2, 3)
- N4 · hexagon · `Edge Fn` · (2, 4)
- N5 · cylinder · `Clinic Row` · (2, 5)
- N6 · rectangle · `Show Code` · (2, 6)
- T1 · group rectangle · `Admin Web` · spans (1, 7) – (3, 8)
- N7 · hexagon · `Approve` · (1, 7) inside T1
- N8 · hexagon · `Reject` · (3, 7) inside T1
- N9 · rounded · `End` · (1, 8) inside T1
- N10 · rounded · `Rejected` · (3, 8) inside T1
- N11 · rounded · `Error` · (3, 4)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `yes` · solid
- E4 · N3 → N2 · `no` · solid (route west then up; loops back)
- E5 · N4 → N5 · — · solid
- E6 · N4 → N11 · `fail` · solid (route east)
- E7 · N5 → N6 · — · solid
- E8 · N6 → N7 · — · solid (route south then west into T1)
- E9 · N6 → N8 · — · solid (route south then east into T1)
- E10 · N7 → N9 · — · solid
- E11 · N8 → N10 · — · solid

**Verification:**

1. Shape count = 11 inner shapes (N1–N11) plus 1 group rectangle
   (T1). T1 visually contains N7, N8, N9, N10.
2. Edge count = 11.
3. Diamonds:
   - N3 (`LTO Valid`): `yes` → N4, `no` → N2. PASS.
4. Three terminals: N9 `End` (success), N10 `Rejected` (separate
   from `Error`), N11 `Error` (transient failure of the Edge
   Function).
5. Non terminal shapes N2 through N6 each have ≥ 1 incoming and ≥ 1
   outgoing edge.
6. The `Approve / Reject` split lives in two separate hexagons
   inside the Admin Web group, each leading to its own terminal —
   no `Approved → End` redundancy.

## Fig 2.6.3 — Sign-In

**Layout:** 4 columns × 11 rows. Cell 200 × 120 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · parallelogram · `Credentials` · (2, 2)
- N3 · diamond · `Locked Out` · (2, 3)
- N4 · rounded · `Wait` · (4, 3)
- N5 · hexagon · `Sign In` · (2, 4)
- N6 · diamond · `Auth OK` · (2, 5)
- N7 · rectangle · `Increment` · (4, 5)
- N8 · hexagon · `Get Profile` · (2, 6)
- N9 · diamond · `Role Admin` · (2, 7)
- N10 · hexagon · `Sign Out` · (4, 7)
- N11 · rounded · `Blocked` · (4, 8)
- N12 · diamond · `Role Clinic` · (2, 8)
- N13 · hexagon · `Approval Check` · (2, 9)
- N14 · diamond · `Approved` · (2, 10)
- N15 · rectangle · `Route Home` · (2, 11)
- N16 · rounded · `End` · (1, 11)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `yes` · solid (lockout branch)
- E4 · N3 → N5 · `no` · solid
- E5 · N5 → N6 · — · solid
- E6 · N6 → N7 · `no` · solid
- E7 · N7 → N2 · — · solid (route east then up; retry credentials)
- E8 · N6 → N8 · `yes` · solid
- E9 · N8 → N9 · — · solid
- E10 · N9 → N10 · `yes` · solid (admin must use web)
- E11 · N10 → N11 · — · solid
- E12 · N9 → N12 · `no` · solid
- E13 · N12 → N13 · `yes` · solid
- E14 · N12 → N15 · `no` · solid (patient path; route west then south)
- E15 · N13 → N14 · — · solid
- E16 · N14 → N15 · `yes` · solid
- E17 · N14 → N10 · `no` · solid (rejected/pending clinic also signs out)
- E18 · N15 → N16 · — · solid

**Verification:**

1. Shape count = 16 (N1–N16). Eighteen edges (E1–E18).
2. Diamonds:
   - N3 (`Locked Out`): `yes` → N4, `no` → N5. PASS.
   - N6 (`Auth OK`): `yes` → N8, `no` → N7. PASS.
   - N9 (`Role Admin`): `yes` → N10, `no` → N12. PASS.
   - N12 (`Role Clinic`): `yes` → N13, `no` → N15. PASS.
   - N14 (`Approved`): `yes` → N15, `no` → N10. PASS.
   Five diamonds, each with exactly two labelled outgoing edges.
3. Terminals: N4 `Wait` (rate limited), N11 `Blocked` (admin or
   non approved clinic), N16 `End` (signed in successfully). Each
   reached by at least one edge.
4. The retry loop E7 (Increment → Credentials) is drawn as a single
   bound arrow that routes east of N5/N7 and curves up to enter N2
   from the right side. No clipping.
5. No `Error` terminal in this figure — this flow's failure paths
   are all expressed as `Wait` or `Blocked`.

## Fig 2.6.4 — Patient Password Reset

**Layout:** 3 columns × 9 rows. Cell 220 × 140 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · parallelogram · `Email` · (2, 2)
- N3 · hexagon · `Reset Email` · (2, 3)
- N4 · rectangle · `Email Sent` · (2, 4)
- N5 · diamond · `Click Link` · (2, 5)
- N6 · rectangle · `Web Bridge` · (2, 6)
- N7 · rectangle · `Deep Link` · (2, 7)
- N8 · hexagon · `Set Session` · (2, 8)
- N9 · parallelogram · `New Password` · (1, 9)
- N10 · hexagon · `Update User` · (2, 9)
- N11 · rounded · `End` · (3, 9)
- N12 · rounded · `Cancel` · (3, 5)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · — · solid
- E4 · N4 → N5 · — · solid
- E5 · N5 → N6 · `yes` · solid
- E6 · N5 → N12 · `no` · solid (user never opens the email)
- E7 · N6 → N7 · — · solid
- E8 · N7 → N8 · — · solid
- E9 · N8 → N9 · — · solid (route south west)
- E10 · N9 → N10 · — · solid
- E11 · N10 → N11 · — · solid

**Verification:**

1. Shape count = 12. Edge count = 11.
2. Diamonds: N5 (`Click Link`): `yes` → N6, `no` → N12. PASS.
3. Two terminals: N11 `End` (success), N12 `Cancel` (user did not
   click the email link). No `Error` terminal in this figure.
4. The `no` branch of N5 leads to a distinct `Cancel` terminal, not
   to a generic `Error → Error` chain.

## Fig 2.6.5 — Clinic Password Reset

**Layout:** 5 columns × 9 rows. Cell 200 × 130 px. Origin (60, 60).
Two side by side group rectangles separate the clinic mobile flow
from the admin web flow.

**Shapes:**

- T1 · group rectangle · `Clinic Mobile` · spans (1, 1) – (2, 6)
- T2 · group rectangle · `Admin Web` · spans (4, 1) – (5, 9)
- N1 · rounded · `Start` · (1, 1) inside T1
- N2 · rectangle · `Settings` · (1, 2) inside T1
- N3 · parallelogram · `Notes` · (1, 3) inside T1
- N4 · hexagon · `Reset RPC` · (1, 4) inside T1
- N5 · cylinder · `Reset Row` · (1, 5) inside T1
- N6 · rectangle · `Wait` · (1, 6) inside T1
- N7 · rounded · `End (Filed)` · (2, 6) inside T1
- N8 · rectangle · `Reset Queue` · (4, 1) inside T2
- N9 · rectangle · `Phone Verify` · (4, 2) inside T2
- N10 · parallelogram · `New Password` · (4, 3) inside T2
- N11 · hexagon · `Edge Fn` · (4, 4) inside T2
- N12 · diamond · `JWT OK` · (4, 5) inside T2
- N13 · diamond · `Admin OK` · (4, 6) inside T2
- N14 · hexagon · `Update User` · (4, 7) inside T2
- N15 · cylinder · `Approved` · (4, 8) inside T2
- N16 · rectangle · `Tell Clinic` · (4, 9) inside T2
- N17 · rounded · `End (Approved)` · (5, 9) inside T2
- N18 · rounded · `Error` · (5, 5)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · — · solid
- E4 · N4 → N5 · — · solid
- E5 · N5 → N6 · — · solid
- E6 · N6 → N7 · — · solid
- E7 · N8 → N9 · — · solid
- E8 · N9 → N10 · — · solid
- E9 · N10 → N11 · — · solid
- E10 · N11 → N12 · — · solid
- E11 · N12 → N13 · `yes` · solid
- E12 · N12 → N18 · `no` · solid (label `401`)
- E13 · N13 → N14 · `yes` · solid
- E14 · N13 → N18 · `no` · solid (label `403`)
- E15 · N14 → N15 · — · solid
- E16 · N15 → N16 · — · solid
- E17 · N16 → N17 · — · solid

**Verification:**

1. Two group rectangles (T1 Clinic Mobile, T2 Admin Web) plus 18
   inner shapes (N1–N18) = 20 shapes total.
2. Edge count = 17.
3. Diamonds:
   - N12 (`JWT OK`): `yes` → N13, `no` → N18 (label `401`). PASS.
   - N13 (`Admin OK`): `yes` → N14, `no` → N18 (label `403`). PASS.
4. Three terminals: N7 `End (Filed)` for the clinic mobile side,
   N17 `End (Approved)` for the admin web side, N18 `Error` shared
   by the two privilege checks.
5. The two flows are visually separate; no edge crosses between
   T1 and T2.

## Fig 2.6.6 — Inactivity Timeout

**Layout:** 2 columns × 6 rows. Cell 240 × 150 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (1, 1)
- N2 · rectangle · `Hook` · (1, 2)
- N3 · diamond · `Touch` · (1, 3)
- N4 · rectangle · `Reset Timer` · (2, 3)
- N5 · diamond · `Elapsed` · (1, 4)
- N6 · hexagon · `Sign Out` · (1, 5)
- N7 · rectangle · `Login` · (1, 6)
- N8 · rounded · `End` · (2, 6)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `yes` · solid
- E4 · N4 → N3 · — · solid (route east loop, returns to top of N3)
- E5 · N3 → N5 · `no` · solid (route south)
- E6 · N5 → N3 · `no` · solid (loop east then north back to N3)
- E7 · N5 → N6 · `yes` · solid
- E8 · N6 → N7 · — · solid
- E9 · N7 → N8 · — · solid

**Verification:**

1. Shape count = 8. Edge count = 9.
2. Diamonds:
   - N3 (`Touch`): `yes` → N4, `no` → N5. PASS.
   - N5 (`Elapsed`): `yes` → N6, `no` → N3 (loop, no timeout yet).
     PASS.
3. The two looping arrows (E4 from `Reset Timer`, E6 from `Elapsed
   no`) both return to N3. They are drawn as separate bound arrows
   that take different east side routes so they do not overlap.
4. One terminal: N8 `End` after the user has been signed out.

## Fig 2.6.7 — Bilateral Capture

**Layout:** 3 columns × 9 rows. Cell 220 × 140 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · diamond · `Connected` · (2, 2)
- N3 · rectangle · `Connect` · (3, 2)
- N4 · rectangle · `Live Preview` · (2, 3)
- N5 · parallelogram · `Draw ROI` · (2, 4)
- N6 · rectangle · `Capture Left` · (2, 5)
- N7 · rectangle · `Buffer Left` · (2, 6)
- N8 · rectangle · `Capture Right` · (2, 7)
- N9 · rectangle · `Buffer Right` · (2, 8)
- N10 · hexagon · `Process` · (2, 9)
- N11 · cylinder · `Bundle` · (1, 9)
- N12 · rectangle · `Details` · (1, 8)
- N13 · rounded · `End` · (1, 7)
- N14 · rounded · `Cancel` · (3, 5)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · `no` · solid
- E3 · N3 → N2 · — · solid (route up; recheck after attempting connect — see Fig 2.6.9)
- E4 · N2 → N4 · `yes` · solid
- E5 · N4 → N5 · — · solid
- E6 · N5 → N6 · — · solid
- E7 · N6 → N7 · — · solid
- E8 · N7 → N8 · — · solid
- E9 · N8 → N9 · — · solid
- E10 · N9 → N10 · — · solid
- E11 · N10 → N11 · — · solid
- E12 · N11 → N12 · — · solid
- E13 · N12 → N13 · — · solid
- E14 · N6 → N14 · `discard` · dashed (route east)
- E15 · N8 → N14 · `discard` · dashed (route east)

**Verification:**

1. Shape count = 14. Edge count = 15.
2. Diamonds:
   - N2 (`Connected`): `yes` → N4, `no` → N3. PASS.
3. Two terminals: N13 `End` for the success path, N14 `Cancel` for
   the discard path. The two `discard` dashed arrows (E14, E15)
   both terminate at N14.
4. The Connect retry loop (E2 → N3 → E3 → N2) is one rectangle and
   two arrows; no redundant `Connect Failed → Error` chain.
5. No `Error` terminal in this figure — capture failures fall back
   to `Cancel` via the discard branches.

## Fig 2.6.8 — Foot Isolation

**Layout:** 3 columns × 9 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · parallelogram · `Matrix` · (2, 2)
- N3 · diamond · `Crop` · (2, 3)
- N4 · rectangle · `Moat` · (1, 4)
- N5 · rectangle · `Threshold` · (1, 5)
- N6 · rectangle · `Largest BFS` · (1, 6)
- N7 · rectangle · `Fill Holes` · (1, 7)
- N8 · rectangle · `Re-clip` · (1, 8)
- N9 · rectangle · `Otsu` · (3, 4)
- N10 · rectangle · `Largest BFS 2` · (3, 5)
- N11 · parallelogram · `Mask` · (2, 9)
- N12 · rounded · `End` · (2, 9) — see note below

Note on N11/N12: the parallelogram `Mask` (N11) sits at column 2
row 8.5 (visually between rows 8 and 9), and the rounded `End` (N12)
sits below it at row 9. To realise this in Excalidraw, place N11 at
grid (2, 8) lower half and N12 at (2, 9). Adjust spacing as needed
so the two shapes don't overlap.

Updated grid placement:

- N1 · rounded · `Start` · (2, 1)
- N2 · parallelogram · `Matrix` · (2, 2)
- N3 · diamond · `Crop` · (2, 3)
- N4 · rectangle · `Moat` · (1, 4)
- N5 · rectangle · `Threshold` · (1, 5)
- N6 · rectangle · `Largest BFS` · (1, 6)
- N7 · rectangle · `Fill Holes` · (1, 7)
- N8 · rectangle · `Re-clip` · (1, 8)
- N9 · rectangle · `Otsu` · (3, 4)
- N10 · rectangle · `Largest 2` · (3, 5)
- N11 · parallelogram · `Mask` · (2, 9)
- N12 · rounded · `End` · (2, 10)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `yes` · solid (route west)
- E4 · N4 → N5 · — · solid
- E5 · N5 → N6 · — · solid
- E6 · N6 → N7 · — · solid
- E7 · N7 → N8 · — · solid
- E8 · N8 → N11 · — · solid (route south then east)
- E9 · N3 → N9 · `no` · solid (route east)
- E10 · N9 → N10 · — · solid
- E11 · N10 → N11 · — · solid (route south then west)
- E12 · N11 → N12 · — · solid

**Verification:**

1. Shape count = 12. Edge count = 12.
2. Diamonds:
   - N3 (`Crop`): `yes` → N4, `no` → N9. PASS.
3. The two algorithm branches (cropped and uncropped) merge at N11
   (`Mask`); no orphan steps.
4. One terminal: N12 `End`. No `Error` terminal in this internal
   algorithm.

## Fig 2.6.9 — UVC Camera Connect

**Layout:** 3 columns × 9 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · rectangle · `Enumerate` · (2, 2)
- N3 · diamond · `Found` · (2, 3)
- N4 · diamond · `Permission` · (2, 4)
- N5 · rectangle · `Request` · (2, 5)
- N6 · diamond · `Granted` · (2, 6)
- N7 · hexagon · `Connect` · (2, 7)
- N8 · rectangle · `Stream` · (2, 8)
- N9 · rounded · `End` · (2, 9)
- N10 · rounded · `Error` · (3, 5)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `yes` · solid
- E4 · N3 → N10 · `no` · solid (label `no device`)
- E5 · N4 → N7 · `yes` · solid (already granted; route west around N5/N6)
- E6 · N4 → N5 · `no` · solid
- E7 · N5 → N6 · — · solid
- E8 · N6 → N7 · `yes` · solid
- E9 · N6 → N10 · `no` · solid (label `denied`)
- E10 · N7 → N8 · — · solid
- E11 · N8 → N9 · — · solid

**Verification:**

1. Shape count = 10. Edge count = 11.
2. Diamonds:
   - N3 (`Found`): `yes` → N4, `no` → N10 (label `no device`). PASS.
   - N4 (`Permission`): `yes` → N7, `no` → N5. PASS.
   - N6 (`Granted`): `yes` → N7, `no` → N10 (label `denied`). PASS.
   Three diamonds, each with two labelled outgoing edges.
3. Two terminals: N9 `End`, N10 `Error`. Both failure edges (E4 and
   E9) route into the same `Error` rounded shape with distinct edge
   labels (`no device`, `denied`).

## Fig 2.6.10 — DPN Classification

**Layout:** 3 columns × 9 rows. Cell 220 × 140 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · hexagon · `Health` · (2, 2)
- N3 · diamond · `Ready` · (2, 3)
- N4 · rectangle · `Wait` · (3, 3)
- N5 · diamond · `Timeout` · (3, 4)
- N6 · hexagon · `Predict` · (2, 5)
- N7 · diamond · `Foot Valid` · (2, 6)
- N8 · cylinder · `Save Result` · (2, 7)
- N9 · rectangle · `Render` · (2, 8)
- N10 · rounded · `End` · (2, 9)
- N11 · rounded · `Unknown` · (1, 7)
- N12 · rounded · `Error` · (3, 5)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `no` · solid (poll again)
- E4 · N4 → N5 · — · solid
- E5 · N5 → N2 · `no` · solid (route west then north back to N2)
- E6 · N5 → N12 · `yes` · solid (60 second timeout reached)
- E7 · N3 → N6 · `yes` · solid
- E8 · N6 → N7 · — · solid
- E9 · N7 → N11 · `no` · solid (route west; classifier rejects input)
- E10 · N7 → N8 · `yes` · solid
- E11 · N8 → N9 · — · solid
- E12 · N9 → N10 · — · solid

**Verification:**

1. Shape count = 12. Edge count = 12.
2. Diamonds:
   - N3 (`Ready`): `yes` → N6, `no` → N4. PASS.
   - N5 (`Timeout`): `yes` → N12 (error), `no` → N2 (poll again).
     PASS.
   - N7 (`Foot Valid`): `yes` → N8, `no` → N11 (Unknown). PASS.
3. Three terminals: N10 `End` (success), N11 `Unknown` (foot detector
   rejected the input — distinct from error), N12 `Error` (timeout
   reached). Each terminal is reached by at least one labelled edge.
4. The cold start polling loop is implemented as the cycle
   N2 → N3 → (if no) → N4 → N5 → (if no) → N2. Each transition is a
   distinct bound arrow.


---

## Final summary you must emit

After producing every view, list every figure name in a single
Markdown checklist:

```
- [ ] Fig 2.6.1_Patient-SignUp
- [ ] Fig 2.6.2_Clinic-SignUp
- [ ] Fig 2.6.3_SignIn
- [ ] Fig 2.6.4_Patient-PwReset
- [ ] Fig 2.6.5_Clinic-PwReset
- [ ] Fig 2.6.6_Inactivity-Timeout
- [ ] Fig 2.6.7_Bilateral-Capture
- [ ] Fig 2.6.8_Foot-Isolation
- [ ] Fig 2.6.9_UVC-Connect
- [ ] Fig 2.6.10_DPN-Classify
```

Stop after the checklist. Do not generate the second half of
Section 2.6 (those are handled in chat 4).
