Run a targeted QA audit on the file(s) specified in $ARGUMENTS.

Read the file(s) and check for:
- TypeScript errors or use of `any` — flag file + line
- Missing explicit types on props, state, or function returns
- Unused imports or variables
- Missing file path comment on line 1 (required by CLAUDE.md)
- `console.log` with sensitive data (tokens, passwords, patient info)
- Hardcoded secrets or API keys outside of `EXPO_PUBLIC_*` env vars
- Every `onPress` handler actually does something (not a no-op or console.log)
- Every async Supabase call destructures `{ error }` and handles failure
- PostgREST join results normalized (array vs object)
- Loading state set to false in a finally block or equivalent
- Every `useEffect` with setInterval/setTimeout has a cleanup return

Report findings as:
| ID | File | Line | Issue | Severity |

Severity: Critical | High | Medium | Low

End with a one-line summary: "X issues found — Y critical/high, Z medium/low."
