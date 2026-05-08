// web/app/admin/layout.tsx
// Admin shell — sidebar nav + auth gate. Login page bypasses the gate
// because it sits at /admin/login (still under /admin/* in URL terms,
// so we special-case it here).

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAdminSession } from "../../lib/auth";
import { LumenLogo } from "../../components/LumenLogo";
import { ThermalBackground } from "../../components/ThermalBackground";

const NAV: { href: string; label: string }[] = [
  { href: "/admin",                 label: "Dashboard" },
  { href: "/admin/clinics",         label: "Clinics" },
  { href: "/admin/password-resets", label: "Password Resets" },
  { href: "/admin/tickets",         label: "Tickets" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router   = useRouter();
  const { status, session, signOut } = useAdminSession();

  const isLogin = pathname.startsWith("/admin/login");

  useEffect(() => {
    if (isLogin) return;                     // login page is unauthed
    if (status === "loading") return;        // still resolving
    if (status === "signed-in") return;      // good
    router.replace("/admin/login");
  }, [status, isLogin, router]);

  // Login page doesn't need the shell.
  if (isLogin) return <>{children}</>;

  if (status === "loading") {
    return (
      <>
        <ThermalBackground />
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Verifying session…</p>
        </div>
      </>
    );
  }

  if (status !== "signed-in" || !session) {
    // Redirect is in flight; render nothing rather than flashing the shell.
    return null;
  }

  return (
    <>
      <ThermalBackground />
      <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-zinc-200/80 bg-white/80 p-4 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/80">
        <div className="mb-6 flex items-center gap-3">
          <LumenLogo size={36} />
          <div className="leading-tight">
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Lumen AI</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Admin Console</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const active = n.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={
                  "rounded-md px-3 py-2 text-sm transition-colors " +
                  (active
                    ? "bg-teal-50 font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800")
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 pt-4 text-xs dark:border-zinc-800">
          <p className="truncate text-zinc-700 dark:text-zinc-200">{session.fullName}</p>
          <p className="truncate text-zinc-500 dark:text-zinc-500">{session.email}</p>
          <button
            onClick={() => { void signOut().then(() => router.replace("/admin/login")); }}
            className="mt-3 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-x-auto p-8">
        {children}
      </main>
      </div>
    </>
  );
}
