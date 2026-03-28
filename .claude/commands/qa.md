Run a full QA audit on the entire codebase. Work through every area below, read the relevant files, and report all findings.
Use this for pre-release checks or after large changes. For targeted checks on specific files, use /qa-file instead.

---

## Area 1 — Code Quality
Read every file in `app/`, `components/`, `store/`, `hooks/`, `lib/`, `types/`.

Check for:
- TypeScript errors or use of `any` — flag file + line
- Missing explicit types on state, props, or function returns
- Unused imports or variables declared but never read
- `console.log` / `console.warn` with potentially sensitive data (tokens, passwords, patient info)
- Hardcoded secrets or API keys outside of `EXPO_PUBLIC_*` env vars
- Missing file path comment on line 1 (required by CLAUDE.md for every source file)
- Unused files that import nothing and export nothing meaningful

---

## Area 2 — UI Completeness
Read every screen file in `app/`.

For each screen check:
- Is it a real screen or an empty/stub file?
- Does it show an `ActivityIndicator` while async data loads?
- Does it show an error message if a Supabase fetch fails?
- Does it show an empty state message if a list returns zero rows?
- Are there any hardcoded placeholder strings still visible? (e.g. "Hello, Juan", "DPN-P-0042", "Cebu City Health Center", fake session IDs, hardcoded stats like "6 sessions today")
- Are there any `onPress` handlers that do nothing, call `console.log`, or only close a modal without acting?

---

## Area 3 — Functional Flow Tracing
Trace each flow by reading the source files. Verify every `router.push()` / `router.replace()` target actually exists as a file.

**Clinic screening flow:**
`patient-select → live-feed → clinical-data → assessment → history → session/[id]`

**Patient flow:**
`(patient)/index → (patient)/session/[id]`

**Admin flow:**
`(admin)/index → users → clinics`
- Do Activate/Deactivate buttons actually call Supabase `.update()`?

**Auth flow:**
- Sign Out wired across all three roles?
- Inactivity timeout (`useInactivityTimeout`) mounted in `_layout.tsx`?
- Deep link handler for password reset present?

---

## Area 4 — Supabase Integration
Read every file that calls `supabase.*`.

Check:
- Is every `.from()` call using the correct table name?
- Are PostgREST join results normalized? (array vs object — `Array.isArray(raw.x) ? raw.x[0] ?? null : raw.x ?? null`)
- Does every `insert()` / `update()` destructure `{ error }` and handle the failure case?
- Are there any screens still importing from `data/mockData` or using `MOCK_*` constants for display?
- Are there any screens that should write to Supabase but don't?

---

## Area 5 — Network Error Completeness
Read every file with `await supabase.*` calls.

For each async call verify:
- Is the `error` destructured from the response?
- Is there a visible error message shown to the user if the call fails?
- Is the loading state always set to `false` in a `finally` block or equivalent (not just in the success branch)?

---

## Area 6 — Performance Anti-patterns
Read `app/` and `components/`.

Flag any of the following:
- `FlatList` or `ScrollView` missing `keyExtractor`
- Inline arrow functions inside `FlatList` `renderItem` (creates new function every render)
- `generateMockThermalMatrix()` or other expensive calls at module scope (outside component/useEffect)
- `setInterval` or `setTimeout` in a `useEffect` without a cleanup `return () => clearInterval(...)`
- Animated values or refs created outside `useRef` / `useRef` pattern
- Large data arrays defined as module-level constants when they should be memoized

---

## Area 7 — Accessibility
Read every screen and component in `app/` and `components/`.

Check:
- Every `TouchableOpacity` and `Pressable` that contains only an icon (no visible text label) must have an `accessibilityLabel` prop
- Every image-like element rendered without alt text equivalent
- Read `constants/theme.ts` — extract all text color / background color pairs used in the app and calculate WCAG AA contrast ratio (minimum 4.5:1 for normal text, 3:1 for large text / UI components). Flag any failing pairs.

To calculate contrast ratio: use relative luminance formula.
- For a hex color `#RRGGBB`, convert each channel: if `c/255 <= 0.03928` then `c/255/12.92` else `((c/255 + 0.055)/1.055)^2.4`. Sum as `0.2126*R + 0.7152*G + 0.0722*B` to get luminance L. Contrast = `(L_lighter + 0.05) / (L_darker + 0.05)`.
- Flag any pair below 4.5:1 used for body text, or below 3:1 used for large headings or UI elements.

---

## Area 8 — Navigation Completeness
Read `app/` directory structure and all `router.push()` / `router.replace()` / `<Link>` calls.

Check:
- Every route target maps to a real file
- No screen is a dead end (every screen reachable has a way back or to exit)
- Tab bar or drawer links all point to real routes
- Dynamic routes (e.g. `session/[id]`) receive the `id` param at the call site

---

## Area 9 — Regression Verification
Read `_project-docs/progress/qa-bugs.md`.

For every item marked with ~~strikethrough~~ and "✅ Fixed":
- Find the relevant file and line
- Confirm the fix actually exists in the current code
- If the fix is missing or reverted, un-strikethrough the item and re-open it

---

## Output Format

### Inline Report (in chat)

Produce one table per area. Every table must have these columns:

| ID | File | Line | Issue | Severity | Impact |

Severity values: `Critical` | `High` | `Medium` | `Low`

After all area tables, produce:

**Flow Status Table**
| Flow | Status | Blocker |
|------|--------|---------|
| Clinic screening (end-to-end) | ✅ Working / ⚠ Partial / ❌ Broken | |
| Patient dashboard | | |
| Admin user management | | |
| Admin clinic management | | |
| Auth / Sign Out (all roles) | | |
| Inactivity timeout | | |
| Password reset deep link | | |

**Summary Table**
| Area | Issues Found | Critical | High | Medium | Low |
|------|-------------|----------|------|--------|-----|
| Code Quality | | | | | |
| UI Completeness | | | | | |
| Functional Flows | | | | | |
| Supabase Integration | | | | | |
| Network Error Handling | | | | | |
| Performance | | | | | |
| Accessibility | | | | | |
| Navigation | | | | | |
| Regression | | | | | |
| **Total** | | | | | |

---

### File Updates (write to disk after the inline report)

**1. Rewrite `_project-docs/progress/qa-bugs.md`**

Use this structure — one section per QA area, not severity:

```
# QA Report — Bugs & Issues
**Last verified:** YYYY-MM-DD

## Code Quality
| ID | File | Line | Issue | Severity | Status |

## UI / UX
| ID | File | Line | Issue | Severity | Status |

## Supabase / Data Integration
| ID | File | Line | Issue | Severity | Status |

## Performance
| ID | File | Line | Issue | Severity | Status |

## Accessibility
| ID | File | Line | Issue | Severity | Status |

## Security
| ID | File | Line | Issue | Severity | Status |

## Navigation
| ID | File | Line | Issue | Severity | Status |

## Auth (History)
(keep all existing AUTH-xx rows, all should be fixed)

## Schema / Database
| ID | File | Line | Issue | Severity | Status |

## Tracking
| Area | Total | Open | Fixed |
```

- Preserve all existing IDs (BUG-xx, GAP-xx, UX-xx, etc.)
- Mark fixed items with ~~strikethrough~~ and `✅ Fixed YYYY-MM-DD`
- Assign new IDs for new findings continuing from the highest existing number
- Status column values: `Open` | `✅ Fixed YYYY-MM-DD` | `Deferred`

---

**2. Rewrite `_project-docs/progress/ui-checklist.md`**

| ID | Screen | File | Built | Real Data | Loading | Error State | Empty State | Notes |

- Built: ✅ complete | 🔄 partial | ❌ stub
- Real Data: ✅ Supabase | 🔄 partial | ❌ mock
- Loading: ✅ | ❌
- Error State: ✅ | ❌
- Empty State: ✅ | ❌ | N/A

Include a Summary counts section at the bottom.

---

**3. Rewrite `_project-docs/progress/fr-checklist.md`**

Keep FR-100 to FR-600 group structure. Update Status and Notes for each row based on current code. Update the Summary counts table.

Status values: ✅ Done | 🔄 Partial | ❌ Not started | ⚠️ Stub

---

**4. Rewrite `_project-docs/progress/data-checklist.md`**

Keep all existing sections (Schema Match, Foreign Keys, RLS Policies, TypeScript Types, WatermelonDB, Auth & Security). Update status based on current code. Update the Summary section.
