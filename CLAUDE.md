# CLAUDE.md — Vestigia Project

## Session Start Protocol
At the START of every session:
1. Check if `_project-docs/memory-bank/` folder exists
2. If it exists, read ALL files in it before doing anything
3. Summarize the current project state to the user
4. If it doesn't exist, create it with the starter files below

## Session End Protocol
At the END of every session (or after any significant change):
1. Update the relevant memory-bank files
2. Create a session log file in `_project-docs/sessions/` named `YYYY-MM-DD-vX.X.X.md`
3. Bump version in `progress.md` and `CHANGELOG.md` if significant changes were made
4. Never skip this — it is mandatory
5. Tell the user which files were updated and what changed

## Session Log Structure
```
_project-docs/sessions/
└── YYYY-MM-DD-vX.X.X.md   ← one file per session, named by date + version
```

Each session file must include:
```md
# Session — vX.X.X
**Date:** YYYY-MM-DD
**Version:** old → new

## What We Did
- bullet list of work done

## Files Created
| File | Purpose |

## Files Modified
| File | What changed |

## Files Deleted
(if any)

## Pending
(anything requiring manual action outside the codebase)

## Known Issues at End of Session
- open bugs or gaps remaining

## Next Session
1. top priorities for next time
```

## Memory Bank Structure
```
_project-docs/memory-bank/
├── projectbrief.md        ← What the project is and its goals
├── productContext.md      ← Why it exists, problems it solves
├── systemPatterns.md      ← Architecture decisions and patterns
├── techContext.md         ← Tech stack, setup, dependencies
├── activeContext.md       ← What is currently being worked on
├── progress.md            ← What's done, what's left, known issues
├── decisionLog.md         ← Why decisions were made (ADR)
└── supabase-changes.md    ← Log of all Supabase changes
```

## Supabase Change Logging
After EVERY Supabase interaction (SQL, RLS, schema, functions):
1. Create or update `_project-docs/memory-bank/supabase-changes.md`
2. Use this format:

```
---
## [YYYY-MM-DD HH:MM] — Short Title
**Type:** Schema Change | RLS Policy | SQL Query | Function | Index | Migration
**Table(s) affected:** table1, table2

### What was done
Brief description

### SQL executed
```sql
-- paste SQL here
```

### Why
Reason for the change

### Result
Success, errors, notes
---
```

## Session Prompts

**Start of session:**
```
Initialize session. Read all files in _project-docs/memory-bank/ and give me a summary of the current project state before we begin.
```

**End of session:**
```
Session ending. Update all relevant _project-docs/memory-bank/ files with everything we did today. Include a supabase-changes.md entry for any database changes made. Tell me which files were updated.
```

**Generate memory bank from scratch:**
```
This project has no _project-docs/memory-bank/ yet. Analyze the entire project folder and generate all _project-docs/memory-bank/ starter files based on what you can see in the project files.
```

## Coding Standards

### General Principles
- **Functional components** with hooks — no class components
- **Single responsibility** — one component, one job
- **TypeScript strict** — all props and return types explicitly typed, no `any`
- **Immutability** — never mutate state directly; use Zustand store actions
- **DRY** — extract repeated logic into hooks or utility functions in `lib/`
- **Fail fast** — validate at boundaries (user input, API responses); trust internal data

### File Path Comment (Required)
Every source file must start with a file path comment on line 1:
```ts
// app/(clinic)/index.tsx
```
Short, exact path from project root. No dashes, no decorations.

### Comment Style
- Short and meaningful: `//SessionCard` not `//----SessionCard----`
- Only comment non-obvious logic — don't restate what the code already says
- Section dividers inside a file: `//Types` `//State` `//Handlers` `//Render`

### Security Rules
- Never hardcode secrets — always use `EXPO_PUBLIC_*` env vars
- Never expose `service_role` key on the client — anon key only
- Sanitize all user inputs before sending to Supabase
- RLS (Row Level Security) must be enabled on all tables — never rely on client-side filtering alone
- Use Supabase auth session for identity checks, not user-supplied IDs
- No `console.log` with sensitive data (tokens, passwords, patient info) in production

### Versioning
- Follow `CHANGELOG.md` — update it with every meaningful change
- Format: `Major.Minor.Patch` (e.g. `1.2.3`)
  - **Major** (X.0.0): Breaking changes, large new features
  - **Minor** (1.X.0): Backward-compatible features
  - **Patch** (1.0.X): Bug fixes, small refinements
- Current version is always in `CHANGELOG.md` at the top

## MCP — Supabase Connection
- Project ref: `yqgpykyogvoawlffkeoq`
- Pooler: `aws-1-ap-northeast-2.pooler.supabase.com:5432`
- MCP server configured in `.mcp.json` (postgres stdio)

## Project Overview
Vestigia is a React Native/Expo app for Diabetic Peripheral Neuropathy (DPN) screening via thermal foot imaging. Three user roles: **Clinic** (operators), **Patient** (view results), **Admin** (manage platform).
