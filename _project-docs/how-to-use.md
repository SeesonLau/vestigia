# How to Use — Vestigia Dev Setup

## Slash Commands

These are typed directly in the Claude Code chat window.

| Command | What it does |
|---|---|
| `/start-session` | Reads all memory-bank files and CLAUDE.md, then gives you a full project state report before you start working |
| `/end-session` | Updates all memory-bank files, bumps the version, logs Supabase changes, and lists every file touched this session |
| `/audit` | Scans the codebase for TypeScript errors, `any` types, empty stubs, broken imports, missing file path comments, and hardcoded secrets |
| `/db-sync` | Queries Supabase live and reports all tables, columns, RLS status, policies, and flags anything misconfigured |
| `/memory` | Quick summary of all memory-bank files — version, last worked on, in progress, pending, open questions |
| `/version` | Shows current version number and recent changelog entries |

---

## Commit Message Format

Follow this format so the GitHub Action can auto-update `CHANGELOG.md` on every push to main.

| Prefix | Changelog Section | Example |
|---|---|---|
| `feat:` | Added | `feat: add patient dashboard` |
| `fix:` | Fixed | `fix: login crash on empty email` |
| `chore:` | Changed | `chore: update dependencies` |
| `refactor:` | Changed | `refactor: simplify authStore` |
| `docs:` | Changed | `docs: update README` |

---

## How the Auto-Changelog Works

1. You push to `main`
2. GitHub Action reads the last commits and groups them by prefix
3. Prepends a new dated entry to `CHANGELOG.md`
4. Commits back automatically with `[skip ci]` so it doesn't trigger a loop

### One-time GitHub Setup Required
Go to your repo on GitHub:
> Settings → Actions → General → Workflow permissions → select **Read and write permissions** → Save

Without this, the action cannot commit back to the repo.

---

## Memory Bank Files

Located in `_project-docs/memory-bank/`. Read these when you need context on the project.

| File | What it contains |
|---|---|
| `projectbrief.md` | What the project is and its goals |
| `productContext.md` | Why it exists, problems it solves |
| `systemPatterns.md` | Architecture decisions and patterns |
| `techContext.md` | Tech stack, setup, dependencies |
| `activeContext.md` | What is currently being worked on |
| `progress.md` | Summary of what's done, in progress, and not started |
| `decisionLog.md` | Why decisions were made |
| `supabase-changes.md` | Log of every database change with SQL |
| `requirements.md` | UI screens + functional requirements from thesis Ch.3 |
| `schema.md` | Full database schema for all 8 tables |

---

## Progress Tracking Files

Located in `_project-docs/progress/`. These are the detailed checklists that back up `progress.md`.

| File | What it contains |
|---|---|
| `progress.md` *(in memory-bank)* | **Cover page** — quick snapshot of overall project state |
| `ui-checklist.md` | Per-screen status: built, real data, navigation |
| `fr-checklist.md` | Per-requirement status across all FR-100 to FR-600 groups |
| `data-checklist.md` | Supabase schema match, WatermelonDB status, type alignment, security |
| `qa-bugs.md` | All known bugs and gaps with file + line number, severity, fix order |

### How they work together

`progress.md` is the **summary** — a quick snapshot you read first.
The files in `progress/` are the **details** — drill into them when you need specifics.

```
progress.md  ←  "Auth done, navigation stubs, WatermelonDB not started"
     ↓
_project-docs/progress/
├── ui-checklist.md     ←  exactly which screens are done, partial, or stub
├── fr-checklist.md     ←  exactly which requirements are met or not
├── data-checklist.md   ←  Supabase schema, WatermelonDB, types, security
└── qa-bugs.md          ←  specific bugs with file + line numbers, fix priority
```

### Update workflow (when something is fixed)
1. Mark it fixed in `qa-bugs.md`
2. Update the relevant checklist (`ui-checklist.md`, `fr-checklist.md`, or `data-checklist.md`)
3. Reflect it in `progress.md` if it's a meaningful milestone
4. Run `/end-session` to sync everything

---

## Session Workflow

```
Open Claude Code
       ↓
Type /start-session → Claude reads context and reports state
       ↓
Work on the project
       ↓
Every Supabase change → supabase-changes.md auto-updated by Claude
       ↓
Type /end-session → Claude updates all memory-bank files + bumps version
       ↓
git commit (using prefix format) + git push to main
       ↓
GitHub Action auto-updates CHANGELOG.md
```
