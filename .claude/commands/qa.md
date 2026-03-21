Run a full QA audit on the entire codebase. Cover ALL of the following areas and report every finding.

---

## 1. Code Quality
- TypeScript errors, `any` types, or missing explicit types
- Broken or missing imports
- Unused imports or declared-but-never-read variables
- `console.log` with potentially sensitive data (tokens, patient data, passwords)
- Hardcoded secrets or keys outside of `EXPO_PUBLIC_*` env vars
- Missing file path comment on line 1 of every source file

## 2. UI Completeness
For every screen in `app/`, check:
- Is it a real screen or an empty stub?
- Does it have a proper loading state (`ActivityIndicator`) for async data?
- Does it have an error state if a fetch fails?
- Does it have an empty state if there's no data?
- Are there any hardcoded placeholder strings still visible (e.g. "Hello, Juan", "DPN-P-0042", "Cebu City Health Center", fake IDs, fake stats)?
- Are there any hardcoded mock numbers used for display (e.g. Today's Sessions showing "6", "2", "4")?

## 3. Functional Flows — trace these end-to-end
Trace each flow by reading the relevant source files:

**Clinic screening flow:**
`patient-select → live-feed → clinical-data → assessment → history`
- Can a clinic operator select a patient, capture a frame, submit vitals, get a classification result, save it, and see it in history?
- Is every `router.push()`/`router.replace()` wired to a real route that exists?

**Patient dashboard flow:**
`(patient)/index → (patient)/session/[id]`
- Does the patient see their real sessions?
- Can they tap a session and view the detail?

**Admin flows:**
`(admin)/index → users → clinics`
- Are real users and clinics loaded?
- Do Activate/Deactivate actions actually call Supabase?

**Auth flow:**
- Does Sign Out work across all three roles?
- Is the inactivity timeout active?

## 4. Supabase Integration
Read every screen that uses Supabase and verify:
- Is every `.from()` call reading from the correct table?
- Are PostgREST joins normalized correctly (array vs object)?
- Is every `insert()` / `update()` result checked for errors?
- Are there any screens still reading from `MOCK_*` or `data/mockData`?
- Are there any screens that SHOULD be writing to Supabase but aren't?

## 5. Navigation
Check `app/` routing structure:
- Are all `router.push()` targets real files that exist?
- Are there any dead-end screens with no back navigation?
- Are there any screens unreachable from the main navigation?

## 6. Component Correctness
For components in `components/`:
- Are all required props passed where the component is used?
- Are there any components with broken prop types or missing required props?

---

## Output — Part 1: Inline Report

Report findings in this exact structure:

### Summary
- Total screens audited: N
- Total issues found: N
- Breakdown: N critical, N high, N medium, N low

### Findings Table
| ID | Severity | File | Line | Issue | Impact |

Use these severity levels:
- **Critical** — blocks real usage or crashes the app
- **High** — major feature gap or broken flow
- **Medium** — incomplete UI, UX gap, or missing state handling
- **Low** — code quality, style, or minor issue

### Flow Status
| Flow | Status | Blocker (if any) |
|------|--------|-----------------|
| Clinic screening (end-to-end) | ✅ Working / ⚠ Partial / ❌ Broken | |
| Patient dashboard | ... | |
| Admin user management | ... | |
| Admin clinic management | ... | |
| Auth / Sign Out | ... | |
| Inactivity timeout | ... | |

---

## Output — Part 2: Update Checklist Files

After producing the inline report, update all three checklist files. Use today's date in the **Last verified** line.

### Update `_project-docs/progress/ui-checklist.md`

Rewrite the entire file. For every screen in `app/`, produce one row:

| ID | Screen | Built | Real Data | Loading State | Error State | Empty State | Notes |

- **Built**: ✅ complete | 🔄 partial | ❌ stub
- **Real Data**: ✅ reads/writes Supabase | 🔄 partial | ❌ still mock
- **Loading State**: ✅ has ActivityIndicator | ❌ missing
- **Error State**: ✅ handles fetch errors | ❌ missing
- **Empty State**: ✅ handles no data | ❌ missing | N/A if not a list screen

Include a Summary section at the bottom listing counts per status.

---

### Update `_project-docs/progress/fr-checklist.md`

Rewrite the entire file. Keep the same FR-100 to FR-600 group structure. For each requirement row update the Status and Notes based on what you found in the code:

- ✅ Done — fully implemented and wired
- 🔄 Partial — UI exists but backend not wired, or only partially working
- ❌ Not started — no implementation found
- ⚠️ Stub — placeholder / mock / TODO only

Update the Summary counts table at the bottom.

---

### Update `_project-docs/progress/data-checklist.md`

Rewrite the entire file. Keep all existing sections (Schema Match, Foreign Keys, RLS Policies, TypeScript Types, WatermelonDB, Auth & Security). For each item, update the status based on what you find in the current codebase and any Supabase findings. Update the Summary section at the bottom.

---

## Output — Part 3: Update `_project-docs/progress/qa-bugs.md`

- Mark any previously listed issues that are now fixed with ~~strikethrough~~ and "✅ Fixed YYYY-MM-DD"
- Add any new issues discovered as new rows with a new ID
- Update the Tracking counts table at the bottom of the file
