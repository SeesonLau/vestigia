// web/app/admin/page.tsx
// Admin dashboard. Two zones:
//   1. Action queues — pending clinics, password resets, open/in-progress
//      tickets. Each tile links to the relevant queue.
//   2. Tickets analytics — interactive stat tiles fed by
//      admin_ticket_dashboard_stats(). Tiles deep-link into a pre-filtered
//      tickets page; horizontal bar-chart graphs visualise the same data.
//
// Visual convention (per recent design call):
//   • All bars in the analytics zone share a single teal fill so the
//     viewer reads relative magnitude, not category-coded colour.
//   • Per-bucket emphasis is carried by the *label text* colour only —
//     so e.g. "Critical" stays red text, "Open" stays amber text, but
//     the bars themselves are the same teal.

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchAdminCounts,
  fetchTicketDashboardStats,
  TICKET_CATEGORY_LABELS,
  type AdminCounts,
  type TicketCategory,
  type TicketDashboardStats,
} from "../../lib/admin-rpc";

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const [stats,  setStats]  = useState<TicketDashboardStats | null>(null);
  const [err,    setErr]    = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [c, s] = await Promise.all([fetchAdminCounts(), fetchTicketDashboardStats()]);
        if (!cancelled) {
          setCounts(c);
          setStats(s);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const bySeverity = stats?.by_severity ?? {};
  const byStatus   = stats?.by_status   ?? {};
  const byCategory = stats?.by_category ?? {};
  const byRole     = stats?.by_role     ?? {};
  const total      = stats?.total       ?? 0;

  // Data series for the three bar-chart graphs.
  const statusSeries: BarDatum[] = [
    { label: "Open",        value: byStatus.open        ?? 0, textTone: "amber", href: "/admin/tickets?status=open" },
    { label: "In progress", value: byStatus.in_progress ?? 0, textTone: "sky",   href: "/admin/tickets?status=in_progress" },
    { label: "Resolved",    value: byStatus.resolved    ?? 0, textTone: "teal",  href: "/admin/tickets?status=resolved" },
  ];

  const severitySeries: BarDatum[] = [
    { label: "Critical",   value: bySeverity.critical   ?? 0, textTone: "red",    href: "/admin/tickets?status=all&severity=critical"   },
    { label: "High",       value: bySeverity.high       ?? 0, textTone: "orange", href: "/admin/tickets?status=all&severity=high"       },
    { label: "Medium",     value: bySeverity.medium     ?? 0, textTone: "amber",  href: "/admin/tickets?status=all&severity=medium"     },
    { label: "Low",        value: bySeverity.low        ?? 0, textTone: "zinc",   href: "/admin/tickets?status=all&severity=low"        },
    { label: "Unassigned", value: bySeverity.unassigned ?? 0, textTone: "zinc",   href: "/admin/tickets?status=all&severity=unassigned" },
  ];

  const roleSeries: BarDatum[] = [
    { label: "Clinic",  value: byRole.clinic  ?? 0, textTone: "teal", href: "/admin/tickets?status=all&role=clinic"  },
    { label: "Patient", value: byRole.patient ?? 0, textTone: "sky",  href: "/admin/tickets?status=all&role=patient" },
  ];

  const categorySeries: BarDatum[] = (Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[])
    .filter((c) => (byCategory[c] ?? 0) > 0)
    .sort((a, b) => (byCategory[b] ?? 0) - (byCategory[a] ?? 0))
    .map((c) => ({
      label: TICKET_CATEGORY_LABELS[c],
      value: byCategory[c] ?? 0,
      textTone: "teal" as const,
      href: `/admin/tickets?status=all&category=${c}`,
    }));

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Items waiting for admin action — and a live snapshot of the ticket queue.
        </p>
      </header>

      {err && (
        <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </p>
      )}

      {/* Action queues */}
      <section className="mb-10">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Action queues
        </h3>
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
      </section>

      {/* Ticket analytics */}
      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Ticket overview
          </h3>
          <Link href="/admin/tickets?status=all" className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-400">
            View full inbox →
          </Link>
        </div>

        {/* Headline numbers */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total tickets"       value={stats?.total            ?? null} loading={loading} href="/admin/tickets?status=all"                          accent="teal"  />
          <StatTile label="Opened (7d)"         value={stats?.opened_last_7d   ?? null} loading={loading} href="/admin/tickets?status=all"                          accent="sky"   />
          <StatTile label="Resolved (7d)"       value={stats?.resolved_last_7d ?? null} loading={loading} href="/admin/tickets?status=resolved"                     accent="teal"  />
          <StatTile label="Unassigned severity" value={stats?.unassigned_severity ?? null} loading={loading} href="/admin/tickets?status=all&severity=unassigned"   accent="amber" />
        </div>

        {/* Graphs */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarChartCard title="Status distribution"   data={statusSeries}   loading={loading} />
          <BarChartCard title="Severity distribution" data={severitySeries} loading={loading} />
          <BarChartCard title="Submitter role"        data={roleSeries}     loading={loading} />
          <BarChartCard title="By category"           data={categorySeries} loading={loading} emptyHint="No category data yet." />
        </div>

        {/* Per-bucket tiles (deep-link grid). Bars are intentionally a
            single teal fill — text-tone carries the per-bucket emphasis. */}
        <div className="mt-8">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">By status</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {statusSeries.map((d) => (
              <BarTile key={d.label} {...d} total={total} loading={loading} />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">By severity</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {severitySeries.map((d) => (
              <BarTile key={d.label} {...d} total={total} loading={loading} />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">By submitter role</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {roleSeries.map((d) => (
              <BarTile key={d.label} {...d} total={total} loading={loading} />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">By category</h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {categorySeries.map((c) => (
              <CategoryRow
                key={c.label}
                label={c.label}
                value={c.value}
                href={c.href}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
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
            <strong className="text-zinc-800 dark:text-zinc-200">Tickets</strong> — every tile above
            deep-links into a pre-filtered ticket queue. Assign a severity from the detail panel,
            move to In Progress while you investigate, then resolve with a written response.
          </li>
        </ul>
      </section>
    </div>
  );
}

// ── Tile primitives ──────────────────────────────────────────────

function Tile({
  label, value, loading, href, tone,
}: {
  label: string;
  value: number | null;
  loading: boolean;
  href: string;
  tone: "teal" | "amber";
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

type TextTone = "teal" | "sky" | "emerald" | "amber" | "orange" | "red" | "zinc";

const TEXT_TONE: Record<TextTone, string> = {
  teal:    "text-teal-700 dark:text-teal-300",
  sky:     "text-sky-700 dark:text-sky-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
  amber:   "text-amber-700 dark:text-amber-300",
  orange:  "text-orange-700 dark:text-orange-300",
  red:     "text-red-700 dark:text-red-300",
  zinc:    "text-zinc-700 dark:text-zinc-300",
};

interface BarDatum {
  label:    string;
  value:    number;
  textTone: TextTone;
  href:     string;
}

function StatTile({
  label, value, loading, href, accent,
}: {
  label: string;
  value: number | null;
  loading: boolean;
  href: string;
  accent: TextTone;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className={"mt-1 text-2xl font-bold " + TEXT_TONE[accent]}>
        {loading ? "…" : value ?? "—"}
      </p>
    </Link>
  );
}

function BarTile({
  label, value, total, href, textTone, loading,
}: BarDatum & { total: number; loading: boolean }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
    >
      <div className="flex items-baseline justify-between">
        <span className={"text-xs font-medium " + TEXT_TONE[textTone]}>{label}</span>
        <span className={"text-lg font-semibold " + TEXT_TONE[textTone]}>
          {loading ? "…" : value}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full bg-teal-500 dark:bg-teal-400"
          style={{ width: loading ? "0%" : `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">{pct}% of total</p>
    </Link>
  );
}

function CategoryRow({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
    >
      <span className="truncate">{label}</span>
      <span className="ml-3 shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
        {value}
      </span>
    </Link>
  );
}

// ── Bar-chart graph ─────────────────────────────────────────────
// Horizontal SVG bar chart. Single teal fill across all bars (per the
// design call); the bucket label keeps its tonal text colour so the
// admin can read "Critical" / "Open" / etc. at a glance without the
// bars themselves being chromatic. Each row is a <Link> so clicking a
// bar drills into the filtered ticket list.

function BarChartCard({
  title, data, loading, emptyHint,
}: {
  title:     string;
  data:      BarDatum[];
  loading:   boolean;
  emptyHint?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const empty = !loading && data.length === 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h4>
      {loading ? (
        <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : empty ? (
        <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {emptyHint ?? "No data yet."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {data.map((d) => {
            const pct = (d.value / max) * 100;
            return (
              <li key={d.label}>
                <Link
                  href={d.href}
                  className="group block rounded-md px-1 py-0.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={"truncate text-xs font-medium " + TEXT_TONE[d.textTone]}>
                      {d.label}
                    </span>
                    <span className={"shrink-0 text-xs font-semibold tabular-nums " + TEXT_TONE[d.textTone]}>
                      {d.value}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-[width] duration-500 ease-out dark:bg-teal-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
