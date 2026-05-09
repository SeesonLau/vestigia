# Chat 4 of 4 — Process Charts part B (Figures 2.6.11 – 2.6.20)

> **How to use this file:** open <https://claude.ai/new>, attach
> this file, and Claude will produce **10 Excalidraw flowcharts** —
> the second half of Section 2.6 (Sync, Tickets, Admin, Profile).
> The first half (Figs 2.6.1 – 2.6.10) lives in chat 3.
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
# Section 2.6 — Process Charts (part B: Figures 2.6.11 – 2.6.20)

This file is the second half of Section 2.6. The first half (Figs
2.6.1 – 2.6.10) is generated in chat 3. The same strict rules apply:
1–3 word labels, single line; one shared `Error` rounded terminal
per figure; every diamond enumerates at least two outgoing labelled
edges; every shape declared in the spec appears once on the canvas.

## Fig 2.6.11 — Save Online

**Layout:** 3 columns × 8 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · diamond · `Slots OK` · (2, 2)
- N3 · cylinder · `Upload Raw` · (2, 3)
- N4 · diamond · `Has Crop` · (2, 4)
- N5 · cylinder · `Upload Crop` · (1, 5)
- N6 · cylinder · `Upload Iso` · (2, 5)
- N7 · cylinder · `Upload CSV` · (2, 6)
- N8 · cylinder · `Insert Capture` · (2, 7)
- N9 · cylinder · `Update Session` · (2, 8)
- N10 · rounded · `End` · (1, 8)
- N11 · rounded · `Error` · (3, 2)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · `yes` · solid
- E3 · N2 → N11 · `no` · solid
- E4 · N3 → N4 · — · solid
- E5 · N4 → N5 · `yes` · solid (route west then south)
- E6 · N5 → N6 · — · solid (route east then south)
- E7 · N4 → N6 · `no` · solid (route south past N5)
- E8 · N6 → N7 · — · solid
- E9 · N7 → N8 · — · solid
- E10 · N8 → N9 · — · solid
- E11 · N9 → N10 · — · solid

**Verification:**

1. Shape count = 11. Edge count = 11.
2. Diamonds:
   - N2 (`Slots OK`): `yes` → N3, `no` → N11. PASS.
   - N4 (`Has Crop`): `yes` → N5, `no` → N6. PASS.
3. Two terminals: N10 `End`, N11 `Error`.
4. The optional `Upload Crop` step (N5) sits in column 1; the
   non crop path (E7) routes around it without clipping.

## Fig 2.6.12 — Save Offline

**Layout:** 3 columns × 7 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · diamond · `Both Feet` · (2, 2)
- N3 · hexagon · `Save Bundle` · (2, 3)
- N4 · cylinder · `AsyncStorage` · (2, 4)
- N5 · cylinder · `Device Files` · (2, 5)
- N6 · rectangle · `Code` · (2, 6)
- N7 · rounded · `End` · (2, 7)
- N8 · rounded · `Error` · (3, 2)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · `yes` · solid
- E3 · N2 → N8 · `no` · solid
- E4 · N3 → N4 · — · solid
- E5 · N4 → N5 · — · solid
- E6 · N5 → N6 · — · solid
- E7 · N6 → N7 · — · solid

**Verification:**

1. Shape count = 8. Edge count = 7.
2. Diamonds:
   - N2 (`Both Feet`): `yes` → N3, `no` → N8. PASS.
3. Two terminals: N7 `End`, N8 `Error`.
4. The cylinder chain N4 → N5 → N6 is linear; no implicit branches.

## Fig 2.6.13 — Submit to Clinic

**Layout:** 3 columns × 8 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · parallelogram · `Code` · (2, 2)
- N3 · diamond · `Format OK` · (2, 3)
- N4 · hexagon · `Submit RPC` · (2, 4)
- N5 · diamond · `Active` · (2, 5)
- N6 · cylinder · `Access Row` · (2, 6)
- N7 · cylinder · `Mark Submitted` · (2, 7)
- N8 · rectangle · `Toast` · (2, 8)
- N9 · rounded · `End` · (1, 8)
- N10 · rounded · `Error` · (3, 5)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `yes` · solid
- E4 · N3 → N2 · `no` · solid (route west then up; loop back to form)
- E5 · N4 → N5 · — · solid
- E6 · N5 → N6 · `yes` · solid
- E7 · N5 → N10 · `no` · solid (label `not found`)
- E8 · N6 → N7 · — · solid
- E9 · N7 → N8 · — · solid
- E10 · N8 → N9 · — · solid

**Verification:**

1. Shape count = 10. Edge count = 10.
2. Diamonds:
   - N3 (`Format OK`): `yes` → N4, `no` → N2. PASS.
   - N5 (`Active`): `yes` → N6, `no` → N10. PASS.
3. Two terminals: N9 `End`, N10 `Error`. The format failure does not
   route to `Error` — it loops back to the form for re entry.

## Fig 2.6.14 — Clinic Access Lifecycle

**Layout:** 4 columns × 9 rows, with three swim lanes. Cell 200 × 130
px. Origin (60, 60).

Lane separation: column 1 is the `Clinic` lane, columns 2–3 are the
`System` lane, column 4 is the `Patient` lane. Draw three vertical
lane dividers as labelled rectangles spanning all rows.

**Shapes:**

- T1 · group rectangle · `Clinic` · spans (1, 1) – (1, 9) (lane border)
- T2 · group rectangle · `System` · spans (2, 1) – (3, 9) (lane border)
- T3 · group rectangle · `Patient` · spans (4, 1) – (4, 9) (lane border)
- N1 · rounded · `Start` · (1, 1)
- N2 · rectangle · `Request` · (1, 2)
- N3 · hexagon · `Request RPC` · (2, 2)
- N4 · cylinder · `Pending` · (2, 3)
- N5 · rectangle · `Inbox` · (4, 3)
- N6 · diamond · `Decision` · (4, 4)
- N7 · hexagon · `Accept RPC` · (3, 5)
- N8 · cylinder · `Accepted` · (3, 6)
- N9 · hexagon · `Reject RPC` · (3, 4)
- N10 · cylinder · `Rejected` · (3, 3)
- N11 · diamond · `Revoke` · (4, 7)
- N12 · hexagon · `Revoke RPC` · (3, 7)
- N13 · cylinder · `Revoked` · (3, 8)
- N14 · rounded · `End (Active)` · (3, 9)
- N15 · rounded · `End (Rejected)` · (2, 9)
- N16 · rounded · `End (Revoked)` · (2, 8)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid (clinic crosses into system lane)
- E3 · N3 → N4 · — · solid
- E4 · N4 → N5 · — · solid (system crosses into patient lane)
- E5 · N5 → N6 · — · solid
- E6 · N6 → N7 · `yes` · solid (route west into system lane)
- E7 · N7 → N8 · — · solid
- E8 · N8 → N11 · — · solid (route east back to patient lane)
- E9 · N6 → N9 · `no` · solid (route west and up into system lane)
- E10 · N9 → N10 · — · solid
- E11 · N10 → N15 · — · solid
- E12 · N11 → N12 · `yes` · solid
- E13 · N12 → N13 · — · solid
- E14 · N13 → N16 · — · solid
- E15 · N11 → N14 · `no` · solid

**Verification:**

1. Three swim lane group rectangles (T1, T2, T3) plus 16 inner
   shapes (N1–N16) = 19 shapes total.
2. Edge count = 15.
3. Diamonds:
   - N6 (`Decision`): `yes` → N7, `no` → N9. PASS.
   - N11 (`Revoke`): `yes` → N12, `no` → N14. PASS.
4. Three terminals (one per outcome): N14 `End (Active)` — relationship
   continues, N15 `End (Rejected)` — patient declined, N16 `End
   (Revoked)` — relationship withdrawn after acceptance.
5. Lane crossings (E2, E4, E6, E8, E9) are drawn as elbow arrows
   that cross the lane dividers cleanly, not through any shape.

## Fig 2.6.15 — Submit Support Ticket

**Layout:** 3 columns × 8 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · parallelogram · `Form` · (2, 2)
- N3 · diamond · `Lengths OK` · (2, 3)
- N4 · hexagon · `Submit RPC` · (2, 4)
- N5 · cylinder · `Ticket Row` · (2, 5)
- N6 · rectangle · `Toast` · (2, 6)
- N7 · rectangle · `My Tickets` · (2, 7)
- N8 · hexagon · `List RPC` · (2, 8)
- N9 · rounded · `End` · (1, 8)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `yes` · solid
- E4 · N3 → N2 · `no` · solid (loop back to form for re entry)
- E5 · N4 → N5 · — · solid
- E6 · N5 → N6 · — · solid
- E7 · N6 → N7 · — · solid
- E8 · N7 → N8 · — · solid (refetch on focus event)
- E9 · N8 → N9 · — · solid

**Verification:**

1. Shape count = 9. Edge count = 9.
2. Diamonds:
   - N3 (`Lengths OK`): `yes` → N4, `no` → N2. PASS.
3. One terminal: N9 `End`. No `Error` terminal — validation failure
   loops back to the form, RPC failure surfaces as a Toast and the
   user retries.

## Fig 2.6.16 — Approve or Reject Clinic

**Layout:** 4 columns × 7 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · rectangle · `Queue` · (2, 2)
- N3 · rectangle · `Filter` · (2, 3)
- N4 · parallelogram · `Pick Row` · (2, 4)
- N5 · diamond · `Action` · (2, 5)
- N6 · rectangle · `Approve Modal` · (1, 6)
- N7 · hexagon · `Approve RPC` · (1, 7)
- N8 · rectangle · `Reject Modal` · (3, 6)
- N9 · hexagon · `Reject RPC` · (3, 7)
- N10 · cylinder · `Updated` · (2, 7)
- N11 · rectangle · `Reload` · (4, 7)
- N12 · rounded · `End` · (4, 6)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · — · solid
- E4 · N4 → N5 · — · solid
- E5 · N5 → N6 · `Approve` · solid (route west then south)
- E6 · N5 → N8 · `Reject` · solid (route east then south)
- E7 · N6 → N7 · — · solid
- E8 · N8 → N9 · — · solid
- E9 · N7 → N10 · — · solid (route east into the cylinder)
- E10 · N9 → N10 · — · solid (route west into the cylinder)
- E11 · N10 → N11 · — · solid
- E12 · N11 → N12 · — · solid

**Verification:**

1. Shape count = 12. Edge count = 12.
2. Diamonds:
   - N5 (`Action`): `Approve` → N6, `Reject` → N8. Two labelled
     branches. PASS.
3. The Approve and Reject modals are placed symmetrically on either
   side of the central column; their RPC hexagons sit beneath them.
   Both branches converge on the shared `Updated` cylinder N10 — no
   redundant `Approved → End / Rejected → End` chain.
4. One terminal: N12 `End`.

## Fig 2.6.17 — Set Clinic Password

**Layout:** 3 columns × 11 rows. Cell 200 × 120 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · rectangle · `Queue` · (2, 2)
- N3 · parallelogram · `Pick Row` · (2, 3)
- N4 · rectangle · `Phone Verify` · (2, 4)
- N5 · parallelogram · `New Password` · (2, 5)
- N6 · hexagon · `Edge Fn` · (2, 6)
- N7 · diamond · `JWT OK` · (2, 7)
- N8 · diamond · `Admin OK` · (2, 8)
- N9 · diamond · `Match` · (2, 9)
- N10 · hexagon · `Update User` · (2, 10)
- N11 · cylinder · `Approved` · (2, 11)
- N12 · rounded · `End` · (1, 11)
- N13 · rounded · `Error` · (3, 7)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · — · solid
- E4 · N4 → N5 · — · solid
- E5 · N5 → N6 · — · solid
- E6 · N6 → N7 · — · solid
- E7 · N7 → N8 · `yes` · solid
- E8 · N7 → N13 · `no` · solid (label `401`)
- E9 · N8 → N9 · `yes` · solid
- E10 · N8 → N13 · `no` · solid (label `403`, route east)
- E11 · N9 → N10 · `yes` · solid
- E12 · N9 → N13 · `no` · solid (label `400`, route east)
- E13 · N10 → N11 · — · solid
- E14 · N11 → N12 · — · solid

**Verification:**

1. Shape count = 13. Edge count = 14.
2. Diamonds:
   - N7 (`JWT OK`): `yes` → N8, `no` → N13 (label `401`). PASS.
   - N8 (`Admin OK`): `yes` → N9, `no` → N13 (label `403`). PASS.
   - N9 (`Match`): `yes` → N10, `no` → N13 (label `400`). PASS.
   Three diamonds, each with exactly two labelled outgoing edges.
3. Two terminals: N12 `End`, N13 `Error`. The three failure
   branches (E8, E10, E12) all converge on the single `Error`
   rounded shape, with HTTP status codes (`401`, `403`, `400`) on
   the edge labels — no `JWT Failed → Error` chain, no per status
   error rectangle.
4. The single `Error` terminal placement (column 3, row 7) keeps
   the three failure routes on the right side of the canvas; each
   takes its own east bound elbow path so the three arrowheads are
   separated.

## Fig 2.6.18 — Resolve Support Ticket

**Layout:** 3 columns × 9 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · rectangle · `Inbox` · (2, 2)
- N3 · parallelogram · `Pick Ticket` · (2, 3)
- N4 · diamond · `In Progress` · (2, 4)
- N5 · hexagon · `Mark Progress` · (1, 5)
- N6 · parallelogram · `Response` · (2, 5)
- N7 · diamond · `Length OK` · (2, 6)
- N8 · hexagon · `Resolve RPC` · (2, 7)
- N9 · cylinder · `Updated` · (2, 8)
- N10 · rectangle · `Reload` · (2, 9)
- N11 · rounded · `End` · (1, 9)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · — · solid
- E4 · N4 → N5 · `yes` · solid (route west)
- E5 · N5 → N9 · — · solid (route south then east; admin marked it
  in progress, no response yet, the row is updated and the admin
  comes back later)
- E6 · N4 → N6 · `no` · solid
- E7 · N6 → N7 · — · solid
- E8 · N7 → N8 · `yes` · solid
- E9 · N7 → N6 · `no` · solid (loop back to response — admin retypes)
- E10 · N8 → N9 · — · solid
- E11 · N9 → N10 · — · solid
- E12 · N10 → N11 · — · solid

**Verification:**

1. Shape count = 11. Edge count = 12.
2. Diamonds:
   - N4 (`In Progress`): `yes` → N5, `no` → N6. PASS.
   - N7 (`Length OK`): `yes` → N8, `no` → N6 (loop back to retype).
     PASS.
3. The two outcomes of the diamond N4 (mark in progress vs write a
   response) both terminate at the same `Updated` cylinder N9 — no
   redundant relay shape.
4. One terminal: N11 `End`.

## Fig 2.6.19 — Avatar Upload and Crop

**Layout:** 3 columns × 9 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · rectangle · `Tap Avatar` · (2, 2)
- N3 · diamond · `Source` · (2, 3)
- N4 · hexagon · `Camera` · (1, 4)
- N5 · hexagon · `Library` · (3, 4)
- N6 · rectangle · `Crop Modal` · (2, 5)
- N7 · parallelogram · `Confirm` · (2, 6)
- N8 · hexagon · `Manipulate` · (2, 7)
- N9 · hexagon · `Upload` · (2, 8)
- N10 · hexagon · `Update URL` · (2, 9)
- N11 · rounded · `End` · (1, 9)
- N12 · rounded · `Cancel` · (3, 6)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `Camera` · solid (route west)
- E4 · N3 → N5 · `Library` · solid (route east)
- E5 · N4 → N6 · — · solid (route east then south)
- E6 · N5 → N6 · — · solid (route west then south)
- E7 · N6 → N7 · — · solid
- E8 · N7 → N8 · — · solid
- E9 · N7 → N12 · `cancel` · dashed (route east; user backs out)
- E10 · N8 → N9 · — · solid
- E11 · N9 → N10 · — · solid
- E12 · N10 → N11 · — · solid

**Verification:**

1. Shape count = 12. Edge count = 12.
2. Diamonds:
   - N3 (`Source`): `Camera` → N4, `Library` → N5. Two labelled
     branches. PASS.
3. The two source paths (E5, E6) both converge on the same `Crop
   Modal` rectangle N6 — no parallel processing chains.
4. Two terminals: N11 `End`, N12 `Cancel`. The cancel path E9 is
   dashed because it represents an optional user action.

## Fig 2.6.20 — Account Deactivation

**Layout:** 3 columns × 7 rows. Cell 220 × 130 px. Origin (60, 60).

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · rectangle · `Confirm Modal` · (2, 2)
- N3 · diamond · `Confirmed` · (2, 3)
- N4 · rounded · `Cancel` · (3, 3)
- N5 · hexagon · `Update Profile` · (2, 4)
- N6 · diamond · `Update OK` · (2, 5)
- N7 · hexagon · `Sign Out` · (2, 6)
- N8 · rectangle · `Login` · (2, 7)
- N9 · rounded · `End` · (1, 7)
- N10 · rounded · `Error` · (3, 5)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `no` · solid
- E4 · N3 → N5 · `yes` · solid
- E5 · N5 → N6 · — · solid
- E6 · N6 → N10 · `no` · solid
- E7 · N6 → N7 · `yes` · solid
- E8 · N7 → N8 · — · solid
- E9 · N8 → N9 · — · solid

**Verification:**

1. Shape count = 10. Edge count = 9.
2. Diamonds:
   - N3 (`Confirmed`): `yes` → N5, `no` → N4. PASS.
   - N6 (`Update OK`): `yes` → N7, `no` → N10. PASS.
3. Three terminals: N4 `Cancel` (user backed out before submit), N9
   `End` (deactivation succeeded), N10 `Error` (database update
   failed). All three are distinct rounded shapes with
   role appropriate stroke colours.
4. The N6 → N10 failure edge is a single bound arrow — no `Show
   Error → Error` chain.


---

## Final summary you must emit

After producing every view, list every figure name in a single
Markdown checklist:

```
- [ ] Fig 2.6.11_Save-Online
- [ ] Fig 2.6.12_Save-Offline
- [ ] Fig 2.6.13_Submit-To-Clinic
- [ ] Fig 2.6.14_Clinic-Access
- [ ] Fig 2.6.15_Submit-Ticket
- [ ] Fig 2.6.16_Admin-Approve
- [ ] Fig 2.6.17_Admin-Set-Password
- [ ] Fig 2.6.18_Admin-Resolve-Ticket
- [ ] Fig 2.6.19_Avatar-Upload
- [ ] Fig 2.6.20_Account-Deactivate
```

Stop after the checklist. Do not generate the first half of
Section 2.6 (those are handled in chat 3).
