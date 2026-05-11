// web/app/admin/tickets/page.tsx
// Support ticket inbox. Two-pane layout: list on the left, detail + resolve
// form on the right. Resolve calls admin_resolve_ticket (admin-only RPC),
// which can move a ticket to in_progress (no response required) or resolved
// (response required).
//
// Top toolbar exposes:
//   • Status filter pills (Open / In Progress / Resolved / All)
//   • Severity pills, Category dropdown, Role dropdown
//   • Free-text search across subject + body
//   • Sort dropdown (newest / oldest / severity hi-lo / status / subject A-Z)
// Query params (?status=…&severity=…&category=…&role=…&q=…) are honored on
// first paint so the dashboard tiles can deep-link into a pre-filtered view.

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  listTickets,
  resolveTicket,
  setTicketSeverity,
  ALL_TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  type TicketAdminRow,
  type TicketStatus,
  type TicketCategory,
  type TicketSeverity,
} from "../../../lib/admin-rpc";

type StatusFilter   = TicketStatus | "all";
type SeverityFilter = TicketSeverity | "unassigned" | "all";
type CategoryFilter = TicketCategory | "all";
type RoleFilter     = "clinic" | "patient" | "all";
type SortKey        = "newest" | "oldest" | "severity" | "status" | "subject";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "open",         label: "Open"         },
  { value: "in_progress",  label: "In Progress"  },
  { value: "resolved",     label: "Resolved"     },
  { value: "all",          label: "All"          },
];

const SEVERITY_FILTERS: { value: SeverityFilter; label: string }[] = [
  { value: "all",        label: "Any"        },
  { value: "critical",   label: "Critical"   },
  { value: "high",       label: "High"       },
  { value: "medium",     label: "Medium"     },
  { value: "low",        label: "Low"        },
  { value: "unassigned", label: "Unassigned" },
];

const SEVERITY_OPTIONS: { value: TicketSeverity; label: string }[] = [
  { value: "low",      label: "Low"      },
  { value: "medium",   label: "Medium"   },
  { value: "high",     label: "High"     },
  { value: "critical", label: "Critical" },
];

// Severity → numeric weight (used by the "severity hi-lo" sort).
const SEVERITY_WEIGHT: Record<TicketSeverity | "unassigned", number> = {
  critical:   4,
  high:       3,
  medium:     2,
  low:        1,
  unassigned: 0,
};

const STATUS_WEIGHT: Record<TicketStatus, number> = {
  open:        2,
  in_progress: 1,
  resolved:    0,
};

function isStatus(v: string): v is TicketStatus {
  return v === "open" || v === "in_progress" || v === "resolved";
}
function isSeverity(v: string): v is TicketSeverity {
  return v === "low" || v === "medium" || v === "high" || v === "critical";
}
function isCategory(v: string): v is TicketCategory {
  return (ALL_TICKET_CATEGORIES as readonly string[]).includes(v);
}

export default function AdminTicketsPage() {
  const params = useSearchParams();

  // Toolbar state. Query params seed the initial value so dashboard tile
  // links land on the right slice.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const q = params.get("status") ?? "open";
    if (q === "all" || isStatus(q)) return q as StatusFilter;
    return "open";
  });
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(() => {
    const q = params.get("severity") ?? "all";
    if (q === "all" || q === "unassigned" || isSeverity(q)) return q as SeverityFilter;
    return "all";
  });
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(() => {
    const q = params.get("category") ?? "all";
    if (q === "all" || isCategory(q)) return q as CategoryFilter;
    return "all";
  });
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(() => {
    const q = params.get("role") ?? "all";
    if (q === "all" || q === "clinic" || q === "patient") return q as RoleFilter;
    return "all";
  });
  const [search, setSearch] = useState<string>(() => params.get("q") ?? "");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  // Server state.
  const [rows,    setRows]    = useState<TicketAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState<string | null>(null);

  // Detail-panel state.
  const [activeId,   setActiveId]   = useState<string | null>(null);
  const active = rows.find((r) => r.id === activeId) ?? null;
  const [response,   setResponse]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalErr,   setModalErr]   = useState<string | null>(null);

  const load = async (f: StatusFilter) => {
    try {
      setLoading(true);
      setErr(null);
      const data = await listTickets(f);
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(statusFilter); }, [statusFilter]);
  useEffect(() => {
    setResponse(active?.admin_response ?? "");
    setModalErr(null);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply the secondary client-side filters + sort. The status filter
  // already happens server-side via load(); everything else stays local
  // so toggling search/severity/category doesn't refetch.
  const visibleRows = useMemo(() => {
    let out = rows;
    if (severityFilter === "unassigned") out = out.filter((r) => r.severity === null);
    else if (severityFilter !== "all")   out = out.filter((r) => r.severity === severityFilter);
    if (categoryFilter !== "all") out = out.filter((r) => r.category === categoryFilter);
    if (roleFilter     !== "all") out = out.filter((r) => r.submitter_role === roleFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        r.subject.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q) ||
        (r.submitter?.full_name?.toLowerCase().includes(q) ?? false) ||
        (r.submitter?.email?.toLowerCase().includes(q) ?? false),
      );
    }
    const sorted = [...out];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "newest":   return b.created_at.localeCompare(a.created_at);
        case "oldest":   return a.created_at.localeCompare(b.created_at);
        case "subject":  return a.subject.localeCompare(b.subject, undefined, { numeric: true });
        case "status":   return STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status] || b.created_at.localeCompare(a.created_at);
        case "severity": {
          const sa = SEVERITY_WEIGHT[a.severity ?? "unassigned"];
          const sb = SEVERITY_WEIGHT[b.severity ?? "unassigned"];
          return sb - sa || b.created_at.localeCompare(a.created_at);
        }
        default: return 0;
      }
    });
    return sorted;
  }, [rows, severityFilter, categoryFilter, roleFilter, search, sortKey]);

  // Keep the active selection valid as filters change.
  useEffect(() => {
    if (visibleRows.length === 0) { setActiveId(null); return; }
    if (!visibleRows.some((r) => r.id === activeId)) {
      setActiveId(visibleRows[0].id);
    }
  }, [visibleRows]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMarkInProgress = async () => {
    if (!active) return;
    try {
      setSubmitting(true);
      setModalErr(null);
      await resolveTicket(active.id, "in_progress");
      await load(statusFilter);
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const onResolve = async () => {
    if (!active) return;
    const trimmed = response.trim();
    if (trimmed.length < 3) {
      setModalErr("Response is required (at least 3 characters).");
      return;
    }
    try {
      setSubmitting(true);
      setModalErr(null);
      await resolveTicket(active.id, "resolved", trimmed);
      await load(statusFilter);
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "Resolve failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const onSeverityChange = async (next: TicketSeverity | "") => {
    if (!active) return;
    try {
      setSubmitting(true);
      setModalErr(null);
      await setTicketSeverity(active.id, next === "" ? null : next);
      await load(statusFilter);
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "Could not set severity.");
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setSeverityFilter("all");
    setCategoryFilter("all");
    setRoleFilter("all");
    setSearch("");
    setSortKey("newest");
  };

  const activeFilterCount =
    (severityFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (roleFilter     !== "all" ? 1 : 0) +
    (search.trim() !== "" ? 1 : 0);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Tickets
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Submitter sees the response in their app once you mark a ticket resolved.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          ← Back to dashboard
        </Link>
      </header>

      {/* Status filter pills */}
      <div className="mb-3 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
              (statusFilter === f.value
                ? "bg-teal-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Secondary toolbar: search / sort / refinement filters */}
      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-55 flex-1">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Subject, body, submitter name or email"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-900/40"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-900/40"
            >
              <option value="all">All categories</option>
              {ALL_TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>{TICKET_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              From
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-900/40"
            >
              <option value="all">All roles</option>
              <option value="clinic">Clinic</option>
              <option value="patient">Patient</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Sort by
            </label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-900/40"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="severity">Severity (high → low)</option>
              <option value="status">Status (open first)</option>
              <option value="subject">Subject (A → Z)</option>
            </select>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Clear ({activeFilterCount})
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SEVERITY_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSeverityFilter(s.value)}
              className={
                "rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors " +
                (severityFilter === s.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700")
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
        Showing {visibleRows.length} of {rows.length}
      </p>

      {err && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* List */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-1">
          <ul className="max-h-[70vh] overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading && (
              <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading…</li>
            )}
            {!loading && visibleRows.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No tickets match the current filters.</li>
            )}
            {!loading && visibleRows.map((r) => {
              const isActive = r.id === activeId;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setActiveId(r.id)}
                    className={
                      "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors " +
                      (isActive
                        ? "bg-teal-50 dark:bg-teal-900/20"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40")
                    }
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate font-mono text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {r.subject}
                      </span>
                      <TicketStatusPill status={r.status} />
                    </div>
                    <div className="flex w-full items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="truncate">
                        {r.submitter?.full_name ?? "—"} · {r.submitter_role}
                      </span>
                      <span className="ml-2 flex shrink-0 items-center gap-1.5">
                        <TicketSeverityPill severity={r.severity} />
                        <span className="truncate">{TICKET_CATEGORY_LABELS[r.category]}</span>
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500">{formatDate(r.created_at)}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Detail */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
          {!active ? (
            <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Select a ticket to view its details.
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-mono text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {active.subject}
                  </h3>
                  <TicketStatusPill status={active.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <span><span className="font-medium">Category:</span> {TICKET_CATEGORY_LABELS[active.category]}</span>
                  <span><span className="font-medium">From:</span> {active.submitter?.full_name ?? "—"} ({active.submitter_role})</span>
                  <span><span className="font-medium">Email:</span> {active.submitter?.email ?? "—"}</span>
                  <span><span className="font-medium">Submitted:</span> {formatDate(active.created_at)}</span>
                  {active.resolved_at && (
                    <span><span className="font-medium">Resolved:</span> {formatDate(active.resolved_at)}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Severity
                </label>
                <select
                  value={active.severity ?? ""}
                  onChange={(e) => onSeverityChange(e.target.value as TicketSeverity | "")}
                  disabled={submitting}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-900/40"
                >
                  <option value="">Unassigned</option>
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <TicketSeverityPill severity={active.severity} />
              </div>

              <div className="rounded-md bg-zinc-50 p-4 text-sm text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                <p className="whitespace-pre-wrap">{active.body}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Admin response
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={5}
                  placeholder="What you tell the submitter."
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-900/40"
                  disabled={active.status === "resolved"}
                />
                {active.status === "resolved" && (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    This ticket is resolved. The submitter sees the response above in their app.
                  </p>
                )}
              </div>

              {modalErr && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {modalErr}
                </p>
              )}

              {active.status !== "resolved" && (
                <div className="flex flex-wrap gap-2">
                  {active.status === "open" && (
                    <button
                      onClick={onMarkInProgress}
                      disabled={submitting}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Mark in progress
                    </button>
                  )}
                  <button
                    onClick={onResolve}
                    disabled={submitting}
                    className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-400"
                  >
                    {submitting ? "Saving…" : "Resolve with response"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketStatusPill({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, string> = {
    open:        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    in_progress: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    resolved:    "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  };
  const label: Record<TicketStatus, string> = {
    open:        "Open",
    in_progress: "In Progress",
    resolved:    "Resolved",
  };
  return (
    <span className={"inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " + map[status]}>
      {label[status]}
    </span>
  );
}

function TicketSeverityPill({ severity }: { severity: TicketSeverity | null }) {
  if (!severity) {
    return (
      <span className="inline-block shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        Unassigned
      </span>
    );
  }
  const map: Record<TicketSeverity, string> = {
    low:      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    medium:   "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    high:     "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };
  return (
    <span className={"inline-block shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide " + map[severity]}>
      {severity}
    </span>
  );
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}
