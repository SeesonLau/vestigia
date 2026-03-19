# Vestigia

**Diabetic Peripheral Neuropathy (DPN) Screening via Thermal Foot Imaging**

A React Native mobile application for early detection of Diabetic Peripheral Neuropathy using thermal imaging of the foot. Built as a thesis project for a clinical screening workflow with three user roles: Clinic operators, Patients, and Admins.

---

## Overview

Vestigia captures thermal images of a patient's foot using a connected thermal device, analyzes temperature asymmetries across angiosome regions, and classifies the result as DPN Positive or Negative using an AI model. Results are stored per patient and accessible for clinical review.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81.5 + Expo 54 |
| Navigation | Expo Router 6 (file-based, role-grouped) |
| State | Zustand 5 |
| Backend | Supabase (Auth + Postgres + Realtime) |
| Language | TypeScript (strict) |
| Fonts | Space Grotesk |

---

## User Roles

| Role | Access |
|---|---|
| **Clinic** | Pair device, run screenings, capture thermal data, submit clinical results |
| **Patient** | View their own screening history and results |
| **Admin** | Manage platform, users, and clinics |

---

## Project Structure

```
app/
├── (auth)/         ← Login, Register, Forgot Password, Reset Password, Account Activated
├── (clinic)/       ← Dashboard, Pairing, Live Feed, Clinical Data, Assessment, Settings
├── (patient)/      ← Dashboard, Session Detail, Settings
├── (admin)/        ← Dashboard, Settings
└── index.tsx       ← Entry point — restores session, routes by role

store/              ← Zustand stores (authStore, sessionStore, deviceStore, thermalStore)
components/         ← Shared UI components (ThermalMap, ClassificationCard, etc.)
constants/          ← Theme (colors, typography, spacing)
types/              ← TypeScript interfaces aligned to DB schema
lib/                ← Supabase client
supabase/functions/ ← Edge Functions (auth-redirect)
_project-docs/      ← Memory bank, session logs, QA reports, auth flow docs
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Android emulator or physical device

### Install
```bash
npm install
```

### Environment Variables
Create a `.env` file in the project root:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Run
```bash
npx expo start
```

---

## Authentication Flow

- **Register** → email confirmation sent → user taps link on phone → app opens → Account Activated screen → Sign In
- **Login** → role-based routing (clinic / patient / admin)
- **Forgot Password** → reset link sent → deep link opens app → set new password
- **Deep link scheme:** `vestigia://`

> See [`_project-docs/auth/auth-flow.md`](_project-docs/auth/auth-flow.md) for the full flow diagram.

---

## Supabase Setup

1. Create a Supabase project
2. Run the schema from [`_project-docs/memory-bank/schema.md`](_project-docs/memory-bank/schema.md)
3. Enable RLS on all tables
4. Add to **Authentication → URL Configuration → Redirect URLs:**
   - `vestigia://update-password`
   - `https://your-project-ref.supabase.co/functions/v1/auth-redirect`
5. Deploy the Edge Function:
   ```bash
   npx supabase functions deploy auth-redirect --project-ref your-project-ref
   ```

---

## Version History

| Version | Description |
|---|---|
| 0.3.0 | Email confirmation deep link flow, account-activated screen, Edge Function redirect page |
| 0.2.0 | Auth audit (10 fixes), clinic navigation wired, SafeAreaView fix, Ionicons |
| 0.1.0 | Initial UI, auth, stores, Supabase integration, mock data |

Full changelog: [`CHANGELOG.md`](CHANGELOG.md)

---

## Project Docs

| File | Contents |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | AI session protocols and coding standards |
| [`CHANGELOG.md`](CHANGELOG.md) | Full version history |
| [`_project-docs/auth/auth-flow.md`](_project-docs/auth/auth-flow.md) | Auth flow diagrams and known issues |
| [`_project-docs/progress/qa-bugs.md`](_project-docs/progress/qa-bugs.md) | Bug tracker |
| [`_project-docs/sessions/`](_project-docs/sessions/) | Per-session dev logs |
