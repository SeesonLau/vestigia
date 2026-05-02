# Lumen AI — web

Next.js (App Router, TypeScript, Tailwind v4) deployed to Vercel.

## What lives here

| Route | Purpose |
| --- | --- |
| `/auth/verified` | Landing page after a patient clicks the email-verification link. Deep-links to `lumenai://auth/account-activated`. |
| `/auth/reset-password` | Landing page after a patient clicks the password-reset link. Deep-links to `lumenai://auth/reset-password`. |
| `/admin/*` | Admin webapp (TODO — not yet implemented). |

## Local development

```sh
cd web
npm install      # first time only
npm run dev      # http://localhost:3000
npm run build    # production build (verifies prerender + types)
```

## Vercel deployment

### One-time setup

1. Sign in to Vercel with GitHub.
2. **Add New Project** → import the `vestigia` repo.
3. **Root Directory:** set to `web`. This is the only setting that matters — Vercel will ignore the mobile app entirely.
4. **Framework Preset:** Next.js (auto-detected).
5. **Environment Variables:** add when needed for the admin app:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (server-only) `SUPABASE_SERVICE_ROLE_KEY` for admin routes that need elevated privileges
6. Deploy. The first build produces a URL like `vestigia-xxx.vercel.app`.
7. **Project Settings → Domains:** the production alias is `lumenai-vert.vercel.app` (Vercel auto-suggested this since `lumenai.vercel.app` was already taken). When a custom domain is purchased later, replace the alias.

### Skipping web builds when only the mobile app changes

Vercel evaluates the **Ignored Build Step** from the project's Root Directory, so by default it already only rebuilds when files under `web/` change. No extra config needed.

## Supabase Auth URL configuration

In the Supabase dashboard → Authentication → URL Configuration:

- **Site URL:** `https://lumenai-vert.vercel.app`
- **Redirect URLs (allowlist):**
  - `https://lumenai-vert.vercel.app/auth/verified`
  - `https://lumenai-vert.vercel.app/auth/reset-password`
  - `lumenai://auth/account-activated`
  - `lumenai://auth/reset-password`

The first two cover web/desktop email-link clicks. The two `lumenai://` entries cover mobile when the email is opened on the phone (some mail clients honour the custom scheme directly without going through the web page).

## Mobile deep-link wiring

The Expo app must register the `lumenai` scheme. In `app.json`:

```json
{
  "expo": {
    "scheme": "lumenai"
  }
}
```

The mobile auth flow then reads tokens from the deep-link URL hash on `lumenai://auth/account-activated` and `lumenai://auth/reset-password`.

> **Without a custom domain** (i.e. while we are on `*.vercel.app`), App Links / Universal Links are not available, so mobile relies on the custom scheme only. The browser shows an "Open in Lumen AI?" prompt — works, just less seamless. When a custom domain is added later, host `assetlinks.json` and `apple-app-site-association` from the same domain to upgrade.

## Notes

- `next.config.ts` pins `turbopack.root` to this folder so Turbopack ignores the mobile app's lockfile in the parent directory.
- Tailwind v4 is configured via `app/globals.css` (`@import "tailwindcss"` + `@theme inline`) — no `tailwind.config.js`.
- Auth pages are static-prerendered; the deep-link logic runs entirely client-side in `useEffect`.
