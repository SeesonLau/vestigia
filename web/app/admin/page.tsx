// web/app/admin/page.tsx
// Admin dashboard. Shows count tiles for the three things that need
// human attention: pending clinics, pending password resets, and
// open / in-progress tickets. Each tile links to the relevant queue.

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAdminCounts, type AdminCounts } from "../../lib/admin-rpc";

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const [err,    setErr]    = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const c = await fetchAdminCounts();
        if (!cancelled) setCounts(c);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load counts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Items waiting for admin action.
        </p>
      </header>

      {err && (
        <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Pending clinics"
          value={counts?.pendingClinics ?? null}
          loading={loading}
          href="/admin/clinics?status=pending"
          tone="amber"
        />
        <Tile
          label="Password reset requests"
          value={counts?.pendingPasswordResets ?? null}
          loading={loading}
          href="/admin/password-resets"
          tone="amber"
        />
        <Tile
          label="Open tickets"
          value={counts?.openTickets ?? null}
          loading={loading}
          href="/admin/tickets?status=open"
          tone="teal"
        />
        <Tile
          label="In-progress tickets"
          value={counts?.inProgressTickets ?? null}
          loading={loading}
          href="/admin/tickets?status=in_progress"
          tone="teal"
        />
      </div>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">How to use this console</h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li>
            <strong className="text-zinc-800 dark:text-zinc-200">Clinics</strong> — verify each new
            clinic&apos;s DOH LTO and facility credentials before approving. Reject with a reason if
            the application doesn&apos;t check out.
          </li>
          <li>
            <strong className="text-zinc-800 dark:text-zinc-200">Password resets</strong> — call the
            clinic at the contact mobile on file, confirm identity, then issue a temporary password
            via &quot;Set Password.&quot; Communicate the new password back over the same call.
          </li>
          <li>
            <strong className="text-zinc-800 dark:text-zinc-200">Tickets</strong> — read the body,
            move to In Progress while you investigate, then resolve with a written response. The
            submitter sees the response in their app.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  loading,
  href,
  tone,
}: {
  label:    string;
  value:    number | null;
  loading:  boolean;
  href:     string;
  tone:     "teal" | "amber";
}) {
  const ring = tone === "amber"
    ? "border-amber-200 dark:border-amber-900/40"
    : "border-teal-200 dark:border-teal-900/40";
  const text = tone === "amber"
    ? "text-amber-700 dark:text-amber-300"
    : "text-teal-700 dark:text-teal-300";
  return (
    <Link
      href={href}
      className={
        "group block rounded-2xl border bg-white p-5 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60 " +
        ring
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className={"mt-2 text-3xl font-bold " + text}>
        {loading ? "…" : value ?? "—"}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        View queue →
      </p>
    </Link>
  );
}
