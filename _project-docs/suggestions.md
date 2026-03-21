# Suggestions & Alternatives — Vestigia
**Last updated:** 2026-03-21 (full codebase review v0.5.1)

This document captures improvement ideas, design alternatives, and architectural recommendations derived from reading the entire codebase. Items are grouped by category. Each item notes the **current approach**, the **suggested alternative**, and the **why**.

---

## 1. Code Quality

### 1.1 Centralize the App Version String
**Current:** Version hardcoded in three places — `login.tsx` shows `"Vestigia v1.0.0"`, `settings.tsx` shows `"0.3.0"` / `"v0.3.0"`, and `CHANGELOG.md` says `0.5.1`.
**Suggestion:** Create `constants/app.ts` and read from `expo-constants`:
```ts
import Constants from 'expo-constants';
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
```
Then use `APP_VERSION` everywhere. Update `package.json` `"version"` field to match CHANGELOG. Single source of truth eliminates the current 3-way mismatch.

### 1.2 Guard Debug Logging Behind `__DEV__`
**Current:** `lib/debug.ts` calls `console.log` unconditionally — production builds ship with debug output (CODE-16).
**Suggestion:**
```ts
export function dbg(tag: string, msg: string, data?: unknown) {
  if (!__DEV__) return;
  // ... rest unchanged
}
```
Zero runtime cost in production. Same API, no call-site changes needed.

### 1.3 Extract Three Stores Into Separate Files
**Current:** `store/sessionStore.ts` contains `useSessionStore`, `useDeviceStore`, and `useThermalStore` in one file — the file-path comments are misleading (CODE-17).
**Suggestion:** Split into `store/sessionStore.ts`, `store/deviceStore.ts`, `store/thermalStore.ts`. Each file is ~30 lines. Import paths just need updating at call sites. Matches the declared file path comments, and makes each store independently importable.

### 1.4 Typed Routes Instead of `as any` Casts
**Current:** Several `router.push("/(clinic)/patient-select" as any)` casts exist throughout the app.
**Suggestion:** Enable Expo Router's typed routes experiment in `app.json`:
```json
"experiments": { "typedRoutes": true }
```
Then run `npx expo customize tsconfig.json`. All route strings become type-checked — no more `as any` and route typos become compile-time errors.

### 1.5 PostgREST Join Normalization Utility
**Current:** The pattern `Array.isArray(raw.x) ? raw.x[0] ?? null : raw.x ?? null` appears in multiple screens (`clinic/index.tsx`, `clinic/session/[id].tsx`, `patient/session/[id].tsx`). History screen is missing it entirely (GAP-15).
**Suggestion:** Add to `lib/supabase.ts` (or a new `lib/utils.ts`):
```ts
export function normalizeJoin<T>(raw: T[] | T | null | undefined): T | null {
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}
```
Replace all inline patterns with `normalizeJoin(raw.classification)`. Also fixes GAP-15 automatically when applied to `history.tsx`.

### 1.6 Remove Dead `label` Prop From `TabIcon`
**Current:** `TabIcon` in `(clinic)/_layout.tsx` declares `label: string` in its TypeScript type and all call sites still pass it, but the prop is never used in the component body (CODE-18, introduced v0.5.1).
**Suggestion:** Remove `label` from the type and from all five `<TabIcon label="..." />` call sites. The accessibility fix (A11Y-05) replaces it with `tabBarAccessibilityLabel` at the `Tabs.Screen` level, making `label` fully redundant.

### 1.7 Fix Accessibility Labels on Icon-Only Tab Bar (A11Y-05)
**Current:** Tab bar has no `tabBarAccessibilityLabel` — screen readers announce "index tab" instead of "Home".
**Suggestion:** Add `tabBarAccessibilityLabel` to each `Tabs.Screen`:
```tsx
<Tabs.Screen
  name="index"
  options={{
    tabBarAccessibilityLabel: "Home",
    tabBarIcon: ({ focused }) => <TabIcon icon="home-outline" focused={focused} />,
  }}
/>
```

---

## 2. Navigation & Flow

### 2.1 Screening Flow as a Modal Stack
**Current:** The screening flow (`patient-select → live-feed → clinical-data → assessment`) navigates via `router.push()` within the clinic tabs layout. Each step is a separate full-screen Tabs child with `href: null`.
**Suggestion:** Extract the screening flow into its own group — e.g., `app/(clinic)/screening/_layout.tsx` — using a Stack with `presentation: 'modal'` and a `fullScreenGestureEnabled: false` option to prevent swipe-back mid-capture. This would:
- Give the flow its own navigation stack (no accidental back-swipe to home)
- Allow a custom step header with a progress indicator
- Make each step clearly a "transient" screen, not a persistent tab child

### 2.2 Step Progress Indicator on Screening Wizard
**Current:** No visual indicator of where the user is in the screening flow. Steps 1–4 (patient select, live feed, clinical data, assessment) are contextually clear but not labeled.
**Suggestion:** Add a `StepIndicator` component at the top of each screening screen showing: `● ● ○ ○` (filled = complete, hollow = upcoming). Build as a stateless component: `<StepIndicator steps={4} current={2} />`. This reduces user uncertainty during multi-step medical workflows.

### 2.3 Patient Creation From Patient Select Screen
**Current:** `patient-select.tsx` only searches/selects existing patients. If a patient is not found, the empty state says "No patients registered yet" — no way to add one.
**Suggestion:** Add an "Add New Patient" button (or FAB) at the bottom of `patient-select.tsx` that navigates to a `patient-create.tsx` screen with a form (patient code, DOB, sex, diabetes type/duration). This is likely a required clinical workflow.

### 2.4 Floating Action Button for "New Screening"
**Current:** "New Screening" is a Quick Action card in the home screen, accessible only by scrolling to it.
**Suggestion:** Add a FAB in the bottom-right corner of the home screen (above the tab bar) pinned with `position: 'absolute'`. This is the primary action of the app and should be instantly reachable from any scroll position.

### 2.5 Make Patient Settings Reachable (NAV-03)
**Current:** `(patient)/settings.tsx` exists but nothing navigates to it — it is a dead screen.
**Suggestion:** The patient layout currently has no tab bar (Stack-only). Add a settings icon button to the header of `(patient)/index.tsx` that pushes to `/(patient)/settings`. Alternatively, add a simple 2-tab patient layout (Dashboard | Settings).

### 2.6 Pull-to-Refresh on History and Patient Dashboard
**Current:** History and patient dashboard fetch data once on mount with no way to manually refresh.
**Suggestion:** Both `history.tsx` and `patient/index.tsx` use `FlatList` — add `refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchFn} />}` to allow pull-to-refresh. Small change, significant UX improvement.

### 2.7 Discard Confirmation Alerts
**Current:** "Discard" buttons in `clinical-data.tsx` and `assessment.tsx` immediately discard session data without confirmation.
**Suggestion:** Wrap discard handlers in `Alert.alert('Discard Session', 'This will delete all captured data...', [{text: 'Cancel'}, {text: 'Discard', onPress: handle, style: 'destructive'}])`. One of the highest risk accidental actions in the app.

---

## 3. UI Design Alternatives

### 3.1 2×2 Grid for Home Quick Actions
**Current:** Quick actions rendered as a vertical list of full-width row cards.
**Suggestion:** Replace with a 2-column grid of square icon cards (icon + label, centered). This is a common pattern for dashboards (like iOS home screen widgets) and fits all 4 actions without scrolling. Each card ~`(screenWidth - padding * 3) / 2` wide.

### 3.2 Skeleton Loaders Instead of ActivityIndicator
**Current:** Loading states use `<ActivityIndicator color={Colors.primary[300]} />`.
**Suggestion:** Use animated skeleton cards that match the shape of the content being loaded. Libraries: `@shopify/skeleton-placeholder` or `rn-placeholder`. For `patient-select.tsx`, show 3–5 fake patient cards. For `history.tsx`, show session card skeletons. Feels more polished and gives layout stability during load.

### 3.3 Session Card — More Contextual Information
**Current:** Session cards in history show basic info (date, status badge).
**Suggestion:** Add a small inline thermal thumbnail (just the colormap bar, not the full matrix) and the classification badge prominently. Consider showing the asymmetry delta value on the card for quick scanning. This allows clinicians to spot anomalies without opening each session.

### 3.4 Patient Avatar — Sex-Differentiated Icons
**Current:** `patient-select.tsx` line 144: Both male and female patients use `"person-outline"` despite the condition `patient.sex === "female" ? "person-outline" : "person-outline"` — the sex check does nothing.
**Suggestion:** Use `"person-outline"` for male, `"woman-outline"` for female. Or better: show the patient's initials from `patient_code` in the avatar instead of a generic icon, making patients easier to scan.

### 3.5 Empty State Illustrations
**Current:** Empty states use large muted icons (`"time-outline"` size 48) with text.
**Suggestion:** For the key empty states (no patients, no sessions), replace with a small illustration or a more prominent CTA. For example, the "No patients found" empty state in patient-select could show a "Register first patient →" link. The history empty state could show "Ready to start your first screening →".

### 3.6 High-Contrast / Ambient Mode Option
**Current:** Fixed dark-navy theme. In bright clinical environments with strong overhead lighting, dark UIs can be hard to read.
**Suggestion:** Add a theme toggle in clinic settings ("Dark" / "Light / High-Contrast") that switches to a high-luminance variant of the same color palette. Long-term investment, but relevant for clinical settings.

---

## 4. State Management

### 4.1 Persist Device State Across App Restarts
**Current:** `useDeviceStore` initializes `bleStatus: "disconnected"`, `pairedDevice: null` on every app start — the paired device is forgotten on restart.
**Suggestion:** Add `zustand/middleware/persist` with `AsyncStorage`:
```ts
import { persist, createJSONStorage } from 'zustand/middleware';
export const useDeviceStore = create(persist(
  (set) => ({ ... }),
  { name: 'device-store', storage: createJSONStorage(() => AsyncStorage) }
));
```
The device ID, name, and last-known status would survive restarts. Only the `bleStatus`/`wifiStatus` should reset (these are transient).

### 4.2 TanStack Query for Server State
**Current:** Every screen manages its own `loading`, `error`, `data` state with `useEffect` + `setState`. There are ~10 screens with identical patterns.
**Suggestion:** Replace with `@tanstack/react-query`. Benefits:
- Automatic caching, background refetch, stale-while-revalidate
- Unified loading/error state
- `useQuery('sessions', fetchSessions)` instead of manual useEffect
- `useMutation` for inserts/updates with optimistic updates
- Eliminates ~60% of boilerplate in each screen
This is the most impactful architectural suggestion.

### 4.3 Supabase Realtime for History Screen
**Current:** History screen loads once on mount and never updates unless the user navigates away and back.
**Suggestion:** Use Supabase realtime channels:
```ts
supabase.channel('sessions')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'screening_sessions' },
    (payload) => setSessions(prev => [payload.new, ...prev]))
  .subscribe();
```
When a new session completes (e.g., from another device on the same clinic), the history screen auto-updates without a manual refresh.

---

## 5. Performance

### 5.1 FlatList Instead of `.map()` in Patient Select
**Current:** `patient-select.tsx` renders `filtered.map((patient) => <TouchableOpacity ...>)` — no virtualization.
**Suggestion:** Replace with `<FlatList data={filtered} keyExtractor={(p) => p.id} renderItem={...} />`. For clinics with 50+ patients, the map approach renders all items into the DOM simultaneously. FlatList only renders visible items.

### 5.2 Thermal Map Rendering — Canvas Alternative
**Current:** `ThermalMap.tsx` renders each of the 80×62 = 4,960 cells as an individual `View`. This creates 4,960 React elements per frame update.
**Suggestion:** Replace with `@shopify/react-native-skia` (canvas-based). The entire 80×62 frame becomes a single `drawPixels` or `drawImage` call. Expected render time improvement: 10–20× faster frame updates. This is the single highest-impact performance optimization possible for the thermal feed.
Alternative if Skia is too heavy: use `react-native-canvas` or encode the matrix as a base64 PNG and render as `<Image>`.

### 5.3 Memoize ThermalMap Component
**Current:** `ThermalMap` receives `matrix`, `minTemp`, `maxTemp`, `meanTemp` as props but is not wrapped in `React.memo`.
**Suggestion:** Wrap the component export: `export default React.memo(ThermalMap)`. Since the parent re-renders when `fps` state changes, `ThermalMap` will currently re-render even when the matrix hasn't changed. `React.memo` prevents this.

### 5.4 Paginate Session History
**Current:** History fetches all sessions for a clinic: `.select("*")` with no limit.
**Suggestion:** Add cursor-based pagination:
```ts
.select("*").order("started_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
```
With `onEndReached` on FlatList to load more. For active clinics after months of use, unbounded queries will degrade.

---

## 6. Missing Features (Near-Term Roadmap)

### 6.1 Patient Creation Screen
A `patient-create.tsx` screen under `(clinic)/` for registering new patients. The current system has no UI for this — patients presumably need to be added directly to Supabase. Fields needed: patient code (must match clinic's convention), DOB, sex, diabetes type, diabetes duration.

### 6.2 Session Report Export (PDF)
After a session is saved, offer a "Share Report" button that generates a formatted PDF with: clinic name, patient code, date, classification result, angiosome table, thermal image, and clinical disclaimer. Libraries: `expo-print` + `expo-sharing`, or `react-native-pdf` for display, or `@react-pdf/renderer` (web).

### 6.3 Dashboard Analytics — Trend Charts
The clinic home currently shows only today's stats. Suggestion: add a sparkline or bar chart showing the past 7 days' positive rate. Could use `react-native-svg` charts or `victory-native`. This gives clinics actionable trend visibility at a glance.

### 6.4 Push Notifications for Session Completion
When a session is saved and a result is available (future: real AI processing), notify the operator and/or patient via push. Foundation: `expo-notifications` + a Supabase Edge Function triggered on `classification_results` insert.

### 6.5 Error Boundary at App Root
No `ErrorBoundary` component exists. If any screen throws synchronously during render, the entire app crashes to a white screen.
**Suggestion:** Add `react-native-error-boundary` or a custom class component at `app/_layout.tsx` root level with a fallback "Something went wrong — restart the app" screen.

---

## 7. UX Flow Observations

### 7.1 The Screening Flow Lacks a Checkpoint Before Clinical Data Entry
**Observation:** The flow `live-feed → clinical-data → assessment` requires a full capture before entering vitals. If the capture is poor quality (bad thermal reading), the user must navigate all the way back to live-feed to re-capture, losing any partially-entered vitals.
**Suggestion:** Add a "Preview & Confirm Capture" intermediate screen between live-feed and clinical-data. Show the captured matrix with quality indicators. Only proceed to vitals entry after confirming capture quality.

### 7.2 No Contextual Patient Information During Screening
**Observation:** After selecting a patient, the patient's name/code disappears from the UI. During live-feed, clinical-data, and assessment screens, there is no visual reminder of which patient is being screened.
**Suggestion:** Add a small persistent "patient badge" at the top of live-feed, clinical-data, and assessment screens showing the selected patient code and diabetes type. This is especially important in busy clinic settings where interruptions happen.

### 7.3 Assessment Screen — No Explanation of Classification
**Observation:** The assessment result shows POSITIVE/NEGATIVE with a confidence score but no plain-language explanation of what it means.
**Suggestion:** Add a collapsible "What does this mean?" section on the assessment screen explaining DPN positive/negative classification in simple terms, and what the clinical next steps should be. This supports both patient education and operator training.

### 7.4 Patient Dashboard is Passive — No Action Prompts
**Observation:** The patient role currently only views past session results. There is no engagement layer.
**Suggestion:** Add a "Next Screening Due" reminder based on the last session date (e.g., "Your last screening was 30 days ago. Ask your clinic to schedule your next visit."). This leverages the existing `started_at` data with no schema changes.

---

## 8. Priority Matrix

| # | Suggestion | Impact | Effort | Priority |
|---|---|---|---|---|
| 1.2 | `__DEV__` guard on `dbg()` | Medium | Tiny (2 lines) | ⭐ High |
| 1.5 | `normalizeJoin()` utility + fix GAP-15 | High | Small (30 min) | ⭐ High |
| 1.7 | `tabBarAccessibilityLabel` fix | Medium | Tiny (5 lines) | ⭐ High |
| 2.7 | Discard confirmation Alerts | High | Small (30 min) | ⭐ High |
| 7.2 | Patient badge during screening | High | Small (1hr) | ⭐ High |
| 1.1 | Centralize version string | Low | Small (1hr) | Medium |
| 1.4 | Typed routes (`typedRoutes: true`) | Medium | Small (1hr) | Medium |
| 2.3 | Patient creation screen | High | Large (half-day) | Medium |
| 2.5 | Fix NAV-03 — patient settings link | Medium | Tiny (5 lines) | Medium |
| 2.6 | Pull-to-refresh on history | Medium | Small (30 min) | Medium |
| 4.1 | Persist device state with Zustand persist | Medium | Small (1hr) | Medium |
| 5.1 | FlatList in patient-select | Medium | Small (30 min) | Medium |
| 5.3 | React.memo on ThermalMap | Low | Tiny (1 line) | Medium |
| 6.5 | Error Boundary at app root | High | Small (1hr) | Medium |
| 4.2 | TanStack Query for server state | High | Large (multi-day) | Long-term |
| 5.2 | react-native-skia thermal rendering | High | Large (multi-day) | Long-term |
| 2.1 | Screening flow as modal stack | Medium | Large (multi-day) | Long-term |
| 3.1 | 2×2 grid for quick actions | Low | Medium (half-day) | Long-term |
| 3.6 | High-contrast mode | Low | Large | Long-term |
| 6.2 | PDF report export | Medium | Large | Long-term |
| 6.3 | Dashboard trend charts | Medium | Large | Long-term |
