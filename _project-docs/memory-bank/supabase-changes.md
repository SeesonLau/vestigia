# Supabase Changes Log — Vestigia

---
## [2026-03-20 00:00] — MCP Connection Established + Schema Discovery

**Type:** SQL Query (read-only)
**Table(s) affected:** All public tables

### What was done
Connected Claude Code to Supabase via MCP (postgres stdio server using pooler URL).
Ran initial schema discovery query.

### SQL executed
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Why
To establish MCP access for development and discover the existing database structure.

### Result
Successfully connected. 8 tables found:
- `classification_results`
- `clinics`
- `devices`
- `patient_vitals`
- `patients`
- `profiles`
- `screening_sessions`
- `thermal_captures`

---

## [2026-03-20 00:01] — Full Schema + RLS + FK Audit (db-sync)
**Type:** SQL Query (read-only)
**Table(s) affected:** All public tables

### What was done
Full db-sync audit: queried all column definitions, RLS status, RLS policies, and foreign key relationships across all 8 tables.

### SQL executed
```sql
-- Columns
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- RLS status
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND relkind = 'r';

-- RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Foreign keys
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
```

### Why
To verify the live database matches the thesis schema (schema.md), confirm RLS is active, and identify any security gaps before wiring the app to real data.

### Result
- ✅ All 8 tables match thesis schema exactly
- ✅ RLS enabled on all 8 tables
- ✅ All 11 foreign key relationships verified
- ✅ All 6 INSERT policies verified correct — WITH CHECK clauses present on all (prior audit note was incorrect; a re-verification query confirmed this)
- ⚠️ 4 TypeScript types missing fields vs actual DB columns (fixed separately in types/index.ts)
- No schema changes made — read-only audit

---

## [2026-03-20 01:00] — Email Confirmation Redirect URL (Auth Config Change)

**Type:** Auth Configuration (app-side + Supabase dashboard)
**Table(s) affected:** `auth.users` (Supabase managed)

### What was done
Changed `emailRedirectTo` in `supabase.auth.signUp()` from `vestigia://confirm` (direct deep link) to the Edge Function URL:
```
https://[project-ref].supabase.co/functions/v1/auth-redirect
```

Also created `supabase/functions/auth-redirect/index.ts` — a Deno Edge Function that serves a Vestigia-themed HTML page handling both mobile (auto-opens app) and desktop (shows "use your phone" message) cases.

### Why
Direct deep links (`vestigia://`) only work on devices with the app installed. Clicking the confirmation link on a PC would show a browser error. The Edge Function acts as a smart redirect middleman.

### Result
- App code change: done
- Edge Function file: created (`supabase/functions/auth-redirect/index.ts`)
- **Pending:** Deploy Edge Function with `npx supabase functions deploy auth-redirect --project-ref yqgpykyogvoawlffkeoq`
- **Pending:** Add Edge Function URL to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

---
