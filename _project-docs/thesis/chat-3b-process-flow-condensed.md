# Methodology — Chapter 2 condensed process-flow prompt

Paste the entire contents of this file into Claude web with the
Excalidraw integration enabled. The single prompt produces nine
Excalidraw views (Figures 2.6.1 – 2.6.9) covering the process flows
the thesis Methodology chapter needs: offline-online sync, clinic-
patient access requests, the thermal capture pipeline, the capture
UI, the AI assessment UI, the AI pipeline, history viewing, account
verification, and Customer Support.

The strict drawing rules are stated once at the top of the file and
apply to every figure. Two additional rules are emphasised because
they were the most common defects in the earlier draft:

- **Every flowchart must terminate at `End`.** A figure may contain
  one `Error` rounded terminal as a *side* branch only; the main path
  must reach `End`. Wherever possible, failure paths loop back to a
  retry step or fall through to a "save pending / keep queued" rectangle
  that itself reaches `End`. A figure whose only terminal is `Error`
  is rejected.
- **Every diamond has at least two outgoing labelled edges.** Two-way
  diamonds use `yes`/`no`. Multi-way diamonds enumerate every value
  (e.g. `approve` / `reject` / `cancel`). A diamond with a single
  outgoing edge is a logic error and must be redrawn.

---

## Excalidraw setup (do this once before drawing any figure)

1. **Font Family → Nunito.** Open the Font Family picker in the
   Excalidraw toolbar and select **Nunito**. Every text element in
   every figure renders in Nunito.
2. **Sloppiness → Architect.** Pick the leftmost (cleanest) option so
   lines render straight and precise.
3. **Stroke style.** Solid for primary paths and required data flow;
   dashed only when a figure spec explicitly says so.
4. **Bound arrows only.** Each arrow endpoint must dock onto a shape
   id (Excalidraw shows a small dot when the binding takes). Free-
   floating arrows are forbidden.
5. **Elbow / orthogonal routing.** Right-angle arrows only. If an
   arrow would clip an unrelated shape, add a waypoint to detour
   around it; keep a minimum clearance of 80 px between any arrow
   segment and any unrelated shape.

## Project context

LumenAI / Vestigia is a React Native + Expo + Supabase mobile
application together with a Next.js admin web console for Diabetic
Peripheral Neuropathy thermal screening. It uses a FLIR Lepton 3.5
sensor on a PureThermal Mini Pro USB host, runs a remote HuggingFace
Spaces FastAPI server (YOLO + sklearn fusion classifier), and stores
data in Row-Level-Security gated Postgres. The figures below document
the system at the level of detail needed for a thesis Methodology
chapter — bilateral capture, the offline guest flow, the admin
gating queue, and the Customer Support workflow are all in scope.

## Procedure for every figure

For each figure, follow this fixed five-step procedure. Do not skip
any step.

1. **Place shapes.** Drop every shape from the spec's shape table at
   the listed grid position. Do not add or omit any shape.
2. **Bind arrows.** For each row in the edge table, draw one bound
   elbow arrow from source to target with the listed label and
   stroke style.
3. **Verify.** Run the verification checklist printed at the bottom
   of the figure spec. Report results inline (✓ / ✗ per check) so the
   user can confirm every diamond and terminal at a glance.
4. **Fix.** If any check fails, redraw the affected shapes or arrows.
5. **Submit.** Save the final view via the Excalidraw MCP tool. The
   view name is `Fig-2.X.Y_Short-Title`.

After every figure has been produced, list every view name in the
final summary checklist at the end of the chat output.

---

## Drawing rules

### Typography

- Font family: Nunito throughout.
- Shape labels: 14 pt.
- Edge labels: 12 pt.
- Figure title (above canvas, optional): 16 pt.
- Figure caption (rendered in the thesis layout, not on the canvas):
  12 pt italic, formatted `Fig 2.X.Y. <Title>`.

### Node label rule (strict)

Every label inside a shape is **1–3 words, single line**.

- No line breaks inside a node's text.
- No version numbers (write `YOLO`, not `YOLOv11`).
- No parenthetical sub-text (write `Lepton`, not `Lepton (160×120)`).
- No stacked captions, tag lines, or sub-labels.

Edge labels follow the same brevity (≤ 3 words).

### Shape semantics (strict)

- Rounded rectangle: terminal state — `Start`, `End`, `Error`,
  `Cancel`, `Unknown`.
- Rectangle: process step.
- Diamond: decision (yes / no edges, or explicit value labels).
- Parallelogram: input / output (form field, file, parameter).
- Hexagon: external system call (Supabase RPC, Edge Function, AI API,
  native module method).
- Cylinder: data store (Postgres table, Storage bucket, AsyncStorage).

### Diamond completeness (strict)

Every diamond has at least **two outgoing labelled edges**.

- Two-way diamonds use `yes`/`no` or a pair of explicit values.
- Multi-way diamonds enumerate every value the decision can take.
- The verification block of each figure spec enumerates every
  diamond's outgoing edges — do that enumeration honestly.

### Terminal policy (strict, project-specific)

- Every figure has exactly one `End` rounded terminal, and the `End`
  terminal is reachable from `Start` along the main path.
- A figure may have at most one `Error` rounded terminal, used only
  as a side branch for unrecoverable failures. **`Error` may not be
  the only terminal in a figure.** Where possible, prefer a retry
  loop or a "save pending" / "keep queued" rectangle that funnels
  into `End` over an `Error` terminal.
- A `Cancel` rounded terminal is allowed when the figure has an
  explicit discard path (the user backs out of the flow).
- An `Unknown` rounded terminal is allowed only in the AI Assessment
  UI flow (Fig 2.6.5), to model the inconclusive verdict — neither
  success nor failure.

### No redundant relay nodes

When a flow says "loop back to form on validation failure", draw a
single bound arrow from the diamond directly back to the form shape.
Do not insert a `Show Errors` rectangle between them.

### Bound arrows + elbow routing

Every arrow is a bound arrow with orthogonal routing — horizontal and
vertical segments only, joined by right-angle corners. No diagonals.
If a routed arrow would clip an unrelated shape, add a waypoint to
detour. Minimum clearance: 80 px.

### Colour palette (LumenAI brand)

- Teal `#0E7A89` — primary processes, data flow, `Start`, `End`.
- Amber `#B45309` — decision diamonds, warning paths.
- Red `#B91C1C` — `Error` rounded terminal stroke.
- Zinc grey `#52525B` — neutral, external boundaries.
- Background white. Shape fill is white; stroke uses the palette
  colour appropriate to the shape's role above.

### Layout

- Flowcharts read top to bottom.
- Group related shapes inside a labelled rectangle (e.g. "Clinic
  side", "Patient side", "Cloud") when the spec calls for it.
- Each diagram fits a single page (target ~8 × 6 inches at 300 dpi).
  Generous spacing (≥ 80 px clearance between any arrow segment and
  any unrelated shape) is mandatory.

---

## Abbreviation glossary (renders ONCE in the thesis prose, not inside every diagram)

This table belongs in the Methodology chapter's prose body, typically
as a "List of Abbreviations" page. Do not embed it inside every
figure. The strict node-label rule already requires every shape to
use these abbreviations as bare keywords.

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
| ROI | Region of Interest |
| RPC | Remote Procedure Call |
| TIFF | Tagged Image File Format |
| UVC | USB Video Class |
| YOLO | You Only Look Once (object detector) |

---

# Section 2.6 — Process Charts

Grid convention for every figure unless overridden: 3 columns × N
rows, cell 220 × 140 px, origin (60, 60). Some figures use 5 columns
where two sub-flows need to read side by side; that is stated in
the figure's `Layout` line.

Verification expectations apply uniformly: every shape declared in
the spec appears once on the canvas, no more, no less; every diamond
has at least two outgoing labelled edges; `End` is reachable from
`Start`; `Error` (when present) is a side branch only.

---

## Fig 2.6.1 — Offline-Online Data Synchronization

A capture that was taken offline (clinic or patient) is later
uploaded once the device is online. Patient captures go through the
`submit_session_to_clinic` RPC; clinic captures upload directly into
Storage + `thermal_captures` + `screening_sessions`. Failed uploads
do not Error — they stay queued in AsyncStorage for the next attempt.

**Layout:** 3 columns × 8 rows.

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · cylinder · `AsyncStorage` · (2, 2)
- N3 · diamond · `Online?` · (2, 3)
- N4 · diamond · `Role?` · (2, 4)
- N5 · hexagon · `Upload Clinic` · (1, 5)
- N6 · hexagon · `Submit RPC` · (3, 5)
- N7 · diamond · `Success?` · (2, 6)
- N8 · rectangle · `Mark Synced` · (1, 7)
- N9 · rectangle · `Keep Queued` · (3, 7)
- N10 · rounded · `End` · (2, 8)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `yes` · solid
- E4 · N3 → N9 · `no` · solid (route east)
- E5 · N4 → N5 · `clinic` · solid
- E6 · N4 → N6 · `patient` · solid
- E7 · N5 → N7 · — · solid
- E8 · N6 → N7 · — · solid
- E9 · N7 → N8 · `yes` · solid (route west)
- E10 · N7 → N9 · `no` · solid (route east)
- E11 · N8 → N10 · — · solid
- E12 · N9 → N10 · — · solid

**Verification:**

1. Shape count = 10 (N1–N10). Edge count = 12 (E1–E12).
2. Diamonds:
   - N3 (`Online?`): `yes` → N4, `no` → N9. PASS.
   - N4 (`Role?`): `clinic` → N5, `patient` → N6. PASS.
   - N7 (`Success?`): `yes` → N8, `no` → N9. PASS.
3. `End` (N10) reachable from `Start` along the success path
   (N1→N2→N3→N4→N5/N6→N7→N8→N10).
4. No `Error` terminal — failures route to `Keep Queued` (N9) and
   then to `End` on the next sync attempt.
5. Every non-terminal shape has at least one incoming and one
   outgoing edge.

---

## Fig 2.6.2 — Patient-Clinic Data Request Access

A clinic asks for access to a patient's screening history. The
patient accepts or rejects. A patient may also revoke an existing
acceptance. All three state changes converge on a shared
`Update Status` rectangle that writes the new `clinic_access.status`
and then terminates at `End`.

**Layout:** 5 columns × 7 rows.

**Shapes:**

- N1 · rounded · `Start` · (3, 1)
- N2 · diamond · `Initiator?` · (3, 2)
- N3 · hexagon · `Send Request` · (1, 3)
- N4 · cylinder · `Clinic Access` · (3, 3)
- N5 · diamond · `Revoke?` · (5, 3)
- N6 · parallelogram · `Notify Patient` · (1, 4)
- N7 · hexagon · `Revoke RPC` · (5, 4)
- N8 · diamond · `Response?` · (1, 5)
- N9 · hexagon · `Approve RPC` · (1, 6)
- N10 · hexagon · `Reject RPC` · (2, 6)
- N11 · rectangle · `Update Status` · (3, 6)
- N12 · rounded · `End` · (3, 7)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · `clinic` · solid (route west)
- E3 · N2 → N5 · `patient` · solid (route east)
- E4 · N3 → N4 · — · solid
- E5 · N4 → N6 · — · solid (route south then west)
- E6 · N6 → N8 · — · solid
- E7 · N8 → N9 · `approve` · solid
- E8 · N8 → N10 · `reject` · solid (route east)
- E9 · N9 → N11 · — · solid (route east)
- E10 · N10 → N11 · — · solid (route east)
- E11 · N5 → N7 · `yes` · solid
- E12 · N5 → N11 · `no` · solid (route south then west)
- E13 · N7 → N11 · — · solid (route west)
- E14 · N11 → N12 · — · solid

**Verification:**

1. Shape count = 12 (N1–N12). Edge count = 14 (E1–E14).
2. Diamonds:
   - N2 (`Initiator?`): `clinic` → N3, `patient` → N5. PASS.
   - N5 (`Revoke?`): `yes` → N7, `no` → N11. PASS.
   - N8 (`Response?`): `approve` → N9, `reject` → N10. PASS.
3. `End` (N12) reachable from every branch through `Update Status`.
4. No `Error` terminal — every decision either updates the access
   row or routes directly to `Update Status` (the "no revoke" leaf
   is a legitimate no-op terminal path that still reaches `End`).
5. All three RPC hexagons (N3, N7, N9, N10) — note this is *four*
   external calls — converge on the same `Update Status` rectangle.

---

## Fig 2.6.3 — Thermal Capture Pipeline

The native UVC processing pipeline. A raw Y16 frame from the Lepton
becomes either a rendered live preview or a saved 3-slot capture
bundle. This figure represents the per-frame algorithm, not the user
UI; the UI is Fig 2.6.4.

**Layout:** 3 columns × 13 rows.

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · parallelogram · `Y16 Frame` · (2, 2)
- N3 · rectangle · `Median Filter` · (2, 3)
- N4 · rectangle · `EMA Smooth` · (2, 4)
- N5 · rectangle · `CLAHE` · (2, 5)
- N6 · rectangle · `Upscale` · (2, 6)
- N7 · rectangle · `Unsharp` · (2, 7)
- N8 · rectangle · `Emissivity` · (2, 8)
- N9 · rectangle · `Palette` · (2, 9)
- N10 · diamond · `Mode?` · (2, 10)
- N11 · parallelogram · `Preview` · (1, 11)
- N12 · parallelogram · `Capture` · (3, 11)
- N13 · cylinder · `Slots` · (3, 12)
- N14 · rounded · `End` · (2, 13)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · — · solid
- E4 · N4 → N5 · — · solid
- E5 · N5 → N6 · — · solid
- E6 · N6 → N7 · — · solid
- E7 · N7 → N8 · — · solid
- E8 · N8 → N9 · — · solid
- E9 · N9 → N10 · — · solid
- E10 · N10 → N11 · `live` · solid (route west)
- E11 · N10 → N12 · `capture` · solid (route east)
- E12 · N12 → N13 · — · solid
- E13 · N11 → N14 · — · solid (route south then east)
- E14 · N13 → N14 · — · solid (route south then west)

**Verification:**

1. Shape count = 14 (N1–N14). Edge count = 14 (E1–E14).
2. Diamond N10 (`Mode?`): `live` → N11, `capture` → N12. PASS.
3. `End` (N14) reachable from both `live` and `capture` branches.
4. No `Error` terminal — pipeline always produces an output (frame
   or bundle). Pipeline-internal failures (e.g. dropped frame) are
   handled inside the rectangles and not surfaced as a top-level
   branch.

---

## Fig 2.6.4 — Thermal Capture UI Flow

User-facing capture flow shared by both clinic and patient roles.
The user plugs the camera in, picks Raw or Enhanced mode, captures
the left and right feet, and the resulting bundle is saved either
to the cloud (clinic) or locally (patient).

**Layout:** 3 columns × 11 rows.

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · rectangle · `Live Feed` · (2, 2)
- N3 · diamond · `Camera?` · (2, 3)
- N4 · parallelogram · `Plug Camera` · (3, 3)
- N5 · diamond · `Mode?` · (2, 4)
- N6 · rectangle · `Draw ROI` · (3, 4)
- N7 · diamond · `Foot Side?` · (2, 5)
- N8 · rectangle · `Capture Left` · (1, 6)
- N9 · rectangle · `Capture Right` · (3, 6)
- N10 · cylinder · `Slots` · (2, 7)
- N11 · diamond · `Both Done?` · (2, 8)
- N12 · diamond · `Role?` · (2, 9)
- N13 · hexagon · `Save Cloud` · (1, 10)
- N14 · hexagon · `Save Local` · (3, 10)
- N15 · rounded · `End` · (2, 11)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `no` · solid (route east)
- E4 · N4 → N3 · — · solid (loop back; route north then west)
- E5 · N3 → N5 · `yes` · solid
- E6 · N5 → N6 · `enhanced` · solid (route east)
- E7 · N6 → N7 · — · solid (route south then west)
- E8 · N5 → N7 · `raw` · solid
- E9 · N7 → N8 · `left` · solid (route west)
- E10 · N7 → N9 · `right` · solid (route east)
- E11 · N8 → N10 · — · solid
- E12 · N9 → N10 · — · solid
- E13 · N10 → N11 · — · solid
- E14 · N11 → N7 · `no` · solid (loop back; route west then north)
- E15 · N11 → N12 · `yes` · solid
- E16 · N12 → N13 · `clinic` · solid (route west)
- E17 · N12 → N14 · `patient` · solid (route east)
- E18 · N13 → N15 · — · solid (route south then east)
- E19 · N14 → N15 · — · solid (route south then west)

**Verification:**

1. Shape count = 15 (N1–N15). Edge count = 19 (E1–E19).
2. Diamonds:
   - N3 (`Camera?`): `no` → N4, `yes` → N5. PASS.
   - N5 (`Mode?`): `raw` → N7, `enhanced` → N6. PASS.
   - N7 (`Foot Side?`): `left` → N8, `right` → N9. PASS.
   - N11 (`Both Done?`): `no` → N7, `yes` → N12. PASS.
   - N12 (`Role?`): `clinic` → N13, `patient` → N14. PASS.
3. `End` (N15) reachable from both `Save Cloud` and `Save Local`.
4. No `Error` terminal — every failure case loops back (Camera not
   plugged → Plug Camera → re-check; not both feet → re-capture).

---

## Fig 2.6.5 — AI Assessment UI Flow

The clinic-side flow that runs the DPN classifier on a saved bundle.
Inconclusive verdicts use the `Unknown` rounded terminal per the
terminal-policy rule.

**Layout:** 3 columns × 10 rows.

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · rectangle · `Tap Assess` · (2, 2)
- N3 · rectangle · `Loading` · (2, 3)
- N4 · diamond · `Warm?` · (2, 4)
- N5 · rectangle · `Cold Poll` · (3, 4)
- N6 · hexagon · `DPN API` · (2, 5)
- N7 · diamond · `Response?` · (2, 6)
- N8 · diamond · `Retry?` · (3, 6)
- N9 · diamond · `Result?` · (2, 7)
- N10 · rectangle · `Show Positive` · (1, 8)
- N11 · rectangle · `Show Negative` · (3, 8)
- N12 · rounded · `Unknown` · (2, 8)
- N13 · cylinder · `Save Result` · (2, 9)
- N14 · rectangle · `Mark Pending` · (3, 9)
- N15 · rounded · `End` · (2, 10)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · — · solid
- E4 · N4 → N5 · `cold` · solid (route east)
- E5 · N5 → N6 · — · solid (route south then west)
- E6 · N4 → N6 · `warm` · solid
- E7 · N6 → N7 · — · solid
- E8 · N7 → N9 · `success` · solid
- E9 · N7 → N8 · `fail` · solid (route east)
- E10 · N8 → N6 · `yes` · solid (loop back; route north then west)
- E11 · N8 → N14 · `no` · solid
- E12 · N9 → N10 · `positive` · solid (route west)
- E13 · N9 → N11 · `negative` · solid (route east)
- E14 · N9 → N12 · `inconclusive` · solid
- E15 · N10 → N13 · — · solid (route south then east)
- E16 · N11 → N13 · — · solid (route south then west)
- E17 · N13 → N15 · — · solid
- E18 · N14 → N15 · — · solid (route south then west)

**Verification:**

1. Shape count = 15 (N1–N15). Edge count = 18 (E1–E18).
2. Diamonds:
   - N4 (`Warm?`): `warm` → N6, `cold` → N5. PASS.
   - N7 (`Response?`): `success` → N9, `fail` → N8. PASS.
   - N8 (`Retry?`): `yes` → N6, `no` → N14. PASS.
   - N9 (`Result?`): `positive` → N10, `negative` → N11,
     `inconclusive` → N12. PASS (three labelled edges).
3. `End` (N15) reachable from positive, negative, and "no retry"
   branches. `Unknown` (N12) is the rule-blessed terminal for the
   inconclusive verdict and is a *side* terminal, not the only one.
4. No `Error` terminal — the no-retry path falls through to
   `Mark Pending` which then reaches `End`.

---

## Fig 2.6.6 — AI Pipeline (server side)

The HuggingFace Spaces FastAPI inference pipeline. Receives a
bilateral PNG + CSV payload and returns a verdict. The "foot not
found" branch falls back to using the full frame as the ROI rather
than failing the request.

**Layout:** 3 columns × 11 rows.

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · parallelogram · `Bundle` · (2, 2)
- N3 · rectangle · `Decode` · (2, 3)
- N4 · hexagon · `YOLO` · (2, 4)
- N5 · diamond · `Detected?` · (2, 5)
- N6 · rectangle · `Use ROI` · (1, 6)
- N7 · rectangle · `Use Frame` · (3, 6)
- N8 · rectangle · `Features` · (2, 7)
- N9 · rectangle · `Asymmetry` · (2, 8)
- N10 · hexagon · `Classifier` · (2, 9)
- N11 · parallelogram · `Verdict` · (2, 10)
- N12 · rounded · `End` · (2, 11)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · — · solid
- E4 · N4 → N5 · — · solid
- E5 · N5 → N6 · `yes` · solid (route west)
- E6 · N5 → N7 · `no` · solid (route east)
- E7 · N6 → N8 · — · solid (route south then east)
- E8 · N7 → N8 · — · solid (route south then west)
- E9 · N8 → N9 · — · solid
- E10 · N9 → N10 · — · solid
- E11 · N10 → N11 · — · solid
- E12 · N11 → N12 · — · solid

**Verification:**

1. Shape count = 12 (N1–N12). Edge count = 12 (E1–E12).
2. Diamond N5 (`Detected?`): `yes` → N6, `no` → N7. PASS.
3. `End` (N12) reachable from both detection branches via the
   converging `Features` rectangle.
4. No `Error` terminal — the "no foot" branch falls back to using
   the full frame as the ROI, so the pipeline always produces a
   verdict.

---

## Fig 2.6.7 — Cloud-Local Session History

Both clinic and patient roles use this flow. A toggle in the History
screen chooses between the cloud query (Supabase, RLS-gated, filters
out role-specific discarded rows) and the local query (AsyncStorage
on the device). Toolbar applies filter / sort / search before render.

**Layout:** 3 columns × 9 rows.

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · rectangle · `Open History` · (2, 2)
- N3 · diamond · `Source?` · (2, 3)
- N4 · hexagon · `Fetch Cloud` · (1, 4)
- N5 · cylinder · `AsyncStorage` · (3, 4)
- N6 · rectangle · `Filter Sort` · (2, 5)
- N7 · diamond · `Empty?` · (2, 6)
- N8 · rectangle · `Empty State` · (3, 7)
- N9 · rectangle · `Render List` · (1, 7)
- N10 · diamond · `Tap Row?` · (1, 8)
- N11 · rectangle · `Open Detail` · (1, 9)
- N12 · rounded · `End` · (2, 10)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `cloud` · solid (route west)
- E4 · N3 → N5 · `local` · solid (route east)
- E5 · N4 → N6 · — · solid (route south then east)
- E6 · N5 → N6 · — · solid (route south then west)
- E7 · N6 → N7 · — · solid
- E8 · N7 → N9 · `no` · solid (route west)
- E9 · N7 → N8 · `yes` · solid (route east)
- E10 · N9 → N10 · — · solid
- E11 · N10 → N11 · `yes` · solid
- E12 · N10 → N12 · `no` · solid (route east)
- E13 · N11 → N12 · — · solid (route east)
- E14 · N8 → N12 · — · solid (route south then west)

**Verification:**

1. Shape count = 12 (N1–N12). Edge count = 14 (E1–E14).
2. Diamonds:
   - N3 (`Source?`): `cloud` → N4, `local` → N5. PASS.
   - N7 (`Empty?`): `no` → N9, `yes` → N8. PASS.
   - N10 (`Tap Row?`): `yes` → N11, `no` → N12. PASS.
3. `End` (N12) reachable from every branch (open detail, no tap,
   and empty state).
4. No `Error` terminal — the empty state is a legitimate `End`
   path, not a failure.

---

## Fig 2.6.8 — Clinic-Admin Account Verification

A clinic submits a sign-up, the row lands in `clinics` with
`approval_status = 'pending'`, the admin reviews and either approves
or rejects with a reason. Both branches terminate at `End`.

**Layout:** 3 columns × 10 rows.

**Shapes:**

- N1 · rounded · `Start` · (2, 1)
- N2 · parallelogram · `Signup Form` · (2, 2)
- N3 · hexagon · `Signup RPC` · (2, 3)
- N4 · cylinder · `Clinics Row` · (2, 4)
- N5 · rectangle · `Admin Notify` · (2, 5)
- N6 · rectangle · `Admin Review` · (2, 6)
- N7 · diamond · `Verdict?` · (2, 7)
- N8 · hexagon · `Approve RPC` · (1, 8)
- N9 · hexagon · `Reject RPC` · (3, 8)
- N10 · rectangle · `Allow Login` · (1, 9)
- N11 · parallelogram · `Reason Email` · (3, 9)
- N12 · rounded · `End` · (2, 10)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · — · solid
- E4 · N4 → N5 · — · solid
- E5 · N5 → N6 · — · solid
- E6 · N6 → N7 · — · solid
- E7 · N7 → N8 · `approve` · solid (route west)
- E8 · N7 → N9 · `reject` · solid (route east)
- E9 · N8 → N10 · — · solid
- E10 · N9 → N11 · — · solid
- E11 · N10 → N12 · — · solid (route south then east)
- E12 · N11 → N12 · — · solid (route south then west)

**Verification:**

1. Shape count = 12 (N1–N12). Edge count = 12 (E1–E12).
2. Diamond N7 (`Verdict?`): `approve` → N8, `reject` → N9. PASS.
3. `End` (N12) reachable from both approve and reject branches.
4. No `Error` terminal — a reject is a legitimate admin outcome,
   not a failure of the flow.

---

## Fig 2.6.9 — Customer Support

The user opens the Customer Support screen. A top-level segmented
control toggles between the Submit form and the My Tickets list. The
submit RPC auto-assigns a QA-code subject (UX-NN, BUG-NN, etc.). The
list pipe applies filter / sort / search and lets the user expand a
ticket to read the admin response.

**Layout:** 5 columns × 9 rows.

**Shapes:**

- N1 · rounded · `Start` · (3, 1)
- N2 · rectangle · `Open Support` · (3, 2)
- N3 · diamond · `Tab?` · (3, 3)
- N4 · parallelogram · `Form` · (1, 4)
- N5 · diamond · `Validate` · (1, 5)
- N6 · hexagon · `Submit RPC` · (1, 6)
- N7 · cylinder · `Tickets` · (1, 7)
- N8 · rectangle · `Show Code` · (1, 8)
- N9 · hexagon · `Fetch List` · (5, 4)
- N10 · rectangle · `Filter Sort` · (5, 5)
- N11 · rectangle · `Render List` · (5, 6)
- N12 · diamond · `Tap Row?` · (5, 7)
- N13 · rectangle · `Expand Ticket` · (5, 8)
- N14 · rounded · `End` · (3, 9)

**Edges:**

- E1 · N1 → N2 · — · solid
- E2 · N2 → N3 · — · solid
- E3 · N3 → N4 · `submit` · solid (route west)
- E4 · N3 → N9 · `list` · solid (route east)
- E5 · N4 → N5 · — · solid
- E6 · N5 → N6 · `yes` · solid
- E7 · N5 → N4 · `no` · solid (loop back; route west then north)
- E8 · N6 → N7 · — · solid
- E9 · N7 → N8 · — · solid
- E10 · N8 → N14 · — · solid (route south then east)
- E11 · N9 → N10 · — · solid
- E12 · N10 → N11 · — · solid
- E13 · N11 → N12 · — · solid
- E14 · N12 → N13 · `yes` · solid
- E15 · N12 → N14 · `no` · solid (route south then west)
- E16 · N13 → N14 · — · solid (route south then west)

**Verification:**

1. Shape count = 14 (N1–N14). Edge count = 16 (E1–E16).
2. Diamonds:
   - N3 (`Tab?`): `submit` → N4, `list` → N9. PASS.
   - N5 (`Validate`): `yes` → N6, `no` → N4 (loop back). PASS.
   - N12 (`Tap Row?`): `yes` → N13, `no` → N14. PASS.
3. `End` (N14) reachable from both tabs and from both "tap row"
   branches.
4. No `Error` terminal — a validation failure loops back to the
   form rather than terminating in `Error`.

---

# Final summary checklist

After producing every figure, list every saved Excalidraw view name
in this checklist and confirm each one passed its verification block.

- [ ] `Fig-2.6.1_Offline-Online-Sync`
- [ ] `Fig-2.6.2_Patient-Clinic-Access`
- [ ] `Fig-2.6.3_Thermal-Capture-Pipeline`
- [ ] `Fig-2.6.4_Thermal-Capture-UI`
- [ ] `Fig-2.6.5_AI-Assessment-UI`
- [ ] `Fig-2.6.6_AI-Pipeline`
- [ ] `Fig-2.6.7_Cloud-Local-History`
- [ ] `Fig-2.6.8_Clinic-Admin-Verification`
- [ ] `Fig-2.6.9_Customer-Support`

If any verification check failed and could not be resolved by
redrawing, list the failed check in the summary so the user can
review before pasting any figure into the thesis.
