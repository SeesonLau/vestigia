# Authentication Flow — Vestigia
**Last verified:** 2026-03-20 (full auth audit)
**Auth provider:** Supabase Auth (`auth.users`)
**Deep link scheme:** `vestigia://`

---

## Verification Results

| Feature | Status | Notes |
|---|---|---|
| Login | ✅ Working | Real Supabase only — mock accounts removed |
| Register | ✅ Working | Email confirmation flow handled |
| Forgot Password | ✅ Working | redirectTo `vestigia://update-password` configured |
| Email Confirmation OTP | ✅ Working | UI shows "check your inbox" and waits |
| Role-based routing | ✅ Working | clinic / patient / admin all route correctly |
| Session restore on app start | ✅ Working | Reads Supabase session from AsyncStorage |
| Auth state listener | ✅ Working | onAuthStateChange syncs profile on SIGNED_IN |
| Logout | ✅ Working | Supabase signOut + state cleared (try-finally) |
| Password update screen | ✅ Done | `app/(auth)/update-password.tsx` created |
| Deep link handler for auth | ✅ Done | Handles `vestigia://update-password` in `app/_layout.tsx` |
| Mock accounts | ✅ Removed | All auth now goes through Supabase |
| Client-side rate limiting | ✅ Done | 5 failed attempts → 30s lockout |

---

## Flow 1 — App Start / Session Restore

```
App opens
    ↓
app/index.tsx
    ↓
restoreSession() called
    ↓
supabase.auth.getSession()
    ├─ Session found
    │       ↓
    │   fetch profile from profiles table
    │       ↓
    │   set user in authStore
    │       ↓
    │   route by role:
    │       ├─ clinic  → /(clinic)
    │       ├─ patient → /(patient)
    │       └─ admin   → /(admin)
    │
    └─ No session
            ↓
        → /(auth)/login
```

---

## Flow 2 — Login

```
User enters email + password
    ↓
Client validation
    ├─ Invalid email format → show error
    └─ Empty password       → show error
    ↓
Rate limit check
    └─ Locked out → show countdown error, skip Supabase call
    ↓
authStore.login(email, password)
    ↓
supabase.auth.signInWithPassword()
    ├─ Error → mapAuthError() → show error message
    │          increment failure counter
    │          if 5 failures → lock out for 30s
    └─ Success
            ↓
        fetch profiles table (WHERE id = user.id)
            ↓
        Apply pendingClinicId if clinic role + no clinic_id
            ↓
        Reset rate limit counter
            ↓
        set user in authStore
            ↓
        route by role:
            ├─ clinic  → /(clinic)
            ├─ patient → /(patient)
            ├─ admin   → /(admin)
            └─ unknown → /(auth)/login
```

---

## Flow 3 — Register

```
User fills form (name, email, password, confirm, role)
    ↓
Client validation
    ├─ name empty          → error
    ├─ invalid email       → error
    ├─ password rules      → shows ALL failing rules at once (8+ chars, uppercase, number)
    └─ passwords mismatch  → error
    ↓
If role = clinic → show ClinicPicker (reads clinics table)
    ↓
authStore.register(email, password, fullName, role, clinicId?)
    ↓
supabase.auth.signUp({ email, password, data: { full_name, role } })
    ↓
    ├─ Error → show error
    └─ Success
            ↓
        Email confirmation enabled?
            ├─ YES (session is null)
            │       ↓
            │   Store pendingClinicId ONLY if role === "clinic"
            │       ↓
            │   Show "Check your inbox" screen
            │       ↓
            │   [User clicks email link]
            │       ↓
            │   onAuthStateChange fires → fetches profile
            │       ↓
            │   User goes to login screen → logs in
            │       ↓
            │   Login applies pendingClinicId to profile
            │
            └─ NO (session available immediately)
                    ↓
                Fetch profile from profiles table
                    ↓
                Apply clinicId to profile if clinic role
                    ↓
                route by role
```

---

## Flow 4 — Forgot Password + Reset

```
User enters email
    ↓
Client validation (must contain @)
    ↓
authStore.forgotPassword(email)
    ↓
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'vestigia://update-password'
})
    ↓
    ├─ Error  → show error message
    └─ Success
            ↓
        Show "Check your inbox" screen
        "Link expires in 60 minutes"
            ↓
        [User clicks reset link in email]
            ↓
        Deep link fires: vestigia://update-password#access_token=...&type=recovery
            ↓
        app/_layout.tsx handleAuthDeepLink()
        (only processes vestigia://update-password URLs with access_token)
            ↓
        supabase.auth.setSession(access_token, refresh_token)
            ↓
        router.replace('/(auth)/update-password')
            ↓
        update-password.tsx checks session exists on mount
        (shows error + disables button if no valid session)
            ↓
        User enters + confirms new password
            ↓
        supabase.auth.updateUser({ password })
            ↓
        ├─ Error → show error
        └─ Success → "Password Updated" ✅ → Back to Sign In
```

---

## Flow 5 — Logout

```
User taps logout
    ↓
authStore.logout()
    ↓
supabase.auth.signOut()  [wrapped in try-finally]
    ↓
Clear user, error, pendingClinicId from store (always runs)
    ↓
onAuthStateChange fires SIGNED_OUT → user set to null
    ↓
→ /(auth)/login
```

---

## Route Map

```
app/
├── index.tsx                  ← Entry point. Restores session → routes by role
├── _layout.tsx                ← Root Stack + deep link handler
│
├── (auth)/
│   ├── _layout.tsx            ← Auth Stack layout (slide animation)
│   ├── login.tsx              ← UI-01 Login
│   ├── register.tsx           ← UI-01 Register
│   ├── forgot-password.tsx    ← UI-01 Forgot Password
│   └── update-password.tsx    ← Password reset (deep link entry point)
│
├── (clinic)/                  ← Clinic role group
├── (patient)/                 ← Patient role group
└── (admin)/                   ← Admin role group
```

---

## Known Issues / Gaps

| ID | Issue | Severity | Status |
|---|---|---|---|
| AUTH-01 | `resetPasswordForEmail` had no `redirectTo` | High | ✅ Fixed — `vestigia://update-password` added |
| AUTH-02 | No `update-password` screen | High | ✅ Fixed — `app/(auth)/update-password.tsx` created |
| AUTH-03 | No deep link handler for auth callbacks | High | ✅ Fixed — handler in `app/_layout.tsx` |
| AUTH-04 | Register password validation sequential — only last error shown | Low | ✅ Fixed — all failing rules shown at once |
| AUTH-05 | Mock accounts in production code | Medium | ✅ Fixed — mock accounts fully removed |
| AUTH-06 | No client-side rate limiting on login | Low | ✅ Fixed — 5 attempts → 30s lockout |
| AUTH-07 | Admin cannot self-register | Expected | ✅ By design — create via Supabase dashboard |
| AUTH-08 | Login blocked users with valid passwords < 8 chars | Medium | ✅ Fixed — login only checks field is non-empty |
| AUTH-09 | No default case in role routing switch — silent stuck screen | Medium | ✅ Fixed — unknown roles fall back to login |
| AUTH-10 | selectedClinicId not reset when switching roles in register | Low | ✅ Fixed — reset on role change |
| AUTH-11 | update-password screen had no session guard | Medium | ✅ Fixed — checks session on mount, disables form if invalid |
| AUTH-12 | Deep link handler processed any URL with "access_token" | Low | ✅ Fixed — narrowed to `vestigia://update-password` only |
| AUTH-13 | onAuthStateChange listener never unsubscribed | Low | ✅ Fixed — subscription stored, old one cleaned up on re-init |
| AUTH-14 | pendingClinicId set for patient role / logout not try-finally | Low | ✅ Fixed — role check added; logout uses try-finally |
| AUTH-15 | Raw PostgREST "no rows" error shown to user | Medium | ✅ Fixed — PGRST116 mapped to friendly message |

---

## Supabase Config Required

For the password reset deep link to work:

1. In Supabase Dashboard → **Authentication → URL Configuration**:
   - Add `vestigia://update-password` to **Redirect URLs**
