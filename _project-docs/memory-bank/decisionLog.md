# Decision Log — Vestigia

## [2026-03-20] Mock-first development approach
**Decision:** All stores check mock accounts/data before hitting Supabase.
**Why:** Allows full UI development and demos without a live backend or real devices.
**Trade-off:** Must remember to remove/gate mock fallbacks before production.
**Update 2026-03-20:** Mock accounts fully removed from authStore — all auth now through Supabase.

## [2026-03-20] Zustand over Redux
**Decision:** Use Zustand for all global state.
**Why:** Simpler API, no boilerplate, works well with React Native, sufficient for this app's complexity.
**Trade-off:** Less ecosystem tooling than Redux (no Redux DevTools native support).

## [2026-03-20] Expo Router for navigation
**Decision:** File-based routing with role-based route groups `(auth)`, `(clinic)`, `(patient)`, `(admin)`.
**Why:** Clean separation of role UIs, automatic deep linking, less manual navigator setup.
**Trade-off:** Expo Router v6 is newer — some edge cases in nested navigators.

## [2026-03-20] No external UI library
**Decision:** Custom StyleSheet components throughout.
**Why:** Full control over the medical-grade dark theme, avoid library conflicts with React Native version.
**Trade-off:** More upfront work building components.

## [2026-03-20] Supabase MCP via pooler (session mode, port 5432)
**Decision:** Use `aws-1-ap-northeast-2.pooler.supabase.com:5432` instead of direct DB connection.
**Why:** Direct DB port (5432 on db.*.supabase.co) is blocked by firewall. Pooler is accessible.
**Trade-off:** Session pooler has connection limits; fine for dev use.

## [2026-03-20] Edge Function as email confirmation redirect page
**Decision:** `emailRedirectTo` points to a Supabase Edge Function URL instead of directly to `vestigia://confirm`.
**Why:** Deep links only work on devices with the app installed. On PC/other devices, `vestigia://` fails silently with a browser error. The Edge Function serves a web page that handles both cases: auto-opens the app on mobile, shows a "use your phone" message on desktop.
**Trade-off:** Requires deploying the Edge Function and adding its URL to Supabase's allowed redirect URLs. One extra network hop for mobile users (browser flash is unavoidable regardless).

## [2026-03-20] Account-activated screen instead of auto-login after confirmation
**Decision:** After email confirmation deep link fires, route to `/(auth)/account-activated` and require the user to tap "Sign In" manually. Do not auto-login or route to the dashboard.
**Why:** User explicitly asked for this UX — they want to see confirmation that activation succeeded before proceeding. Also simpler: no need to set the session or fetch the profile in the deep link handler.
**Trade-off:** One extra tap vs auto-login. Accepted trade-off for clarity.

## [2026-03-20] babel-preset-expo handles decorators — do not add plugins manually
**Decision:** `babel.config.js` contains only `babel-preset-expo` with no extra plugins.
**Why:** `babel-preset-expo` already includes `@babel/plugin-proposal-decorators` and class-properties transforms. Adding them again in `plugins[]` causes duplicate execution, which corrupts class property assignments and produces "Cannot assign to read-only property 'NONE'" at runtime.
**Trade-off:** None — this is the correct configuration per Expo docs.
