// web/app/admin/login/page.tsx
// Admin sign-in form. Calls supabase.auth.signInWithPassword(), then verifies
// the resulting profile row has role === "admin" before letting the layout
// render the rest of the console. Non-admin sign-ins are immediately signed
// back out with a clear error.

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabase } from "../../../lib/supabase";
import { LumenLogo } from "../../../components/LumenLogo";
import { ThermalBackground } from "../../../components/ThermalBackground";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({
        email:    email.trim(),
        password,
      });
      if (error) {
        setErr(error.message);
        return;
      }
      if (!data.session || !data.user) {
        setErr("Sign-in returned no session. Try again.");
        return;
      }

      // Verify the role against profiles before allowing the console in.
      const { data: profile, error: pErr } = await sb
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (pErr || !profile) {
        await sb.auth.signOut();
        setErr("Could not verify admin role. Contact a system administrator.");
        return;
      }
      if (profile.role !== "admin") {
        await sb.auth.signOut();
        setErr("This account is not an admin. Sign-in denied.");
        return;
      }

      router.replace("/admin");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Unexpected error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ThermalBackground />
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <header className="mb-6 flex flex-col items-center text-center">
          <LumenLogo size={64} className="mb-4 shadow-lg shadow-teal-500/20" />
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Lumen <span className="text-teal-600 dark:text-teal-400">AI</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Admin Console — sign in
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white/85 p-6 shadow-xl shadow-zinc-900/5 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/85 dark:shadow-black/30"
        >
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-900/40"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-900/40"
            />
          </div>

          {err && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Diabetic Peripheral Neuropathy thermal screening
        </p>
      </div>
      </div>
    </>
  );
}
