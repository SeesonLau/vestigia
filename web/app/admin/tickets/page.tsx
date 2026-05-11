// web/app/admin/tickets/page.tsx
// Support ticket inbox. Two-pane layout: list on the left, detail + resolve
// form on the right. Resolve calls admin_resolve_ticket (admin-only RPC),
// which can move a ticket to in_progress (no response required) or resolved
// (response required).

"use client";

import { useEffect, useState } from "react";
import {
  listTickets,
  resolveTicket,
  setTicketSeverity,
  type TicketAdminRow,
  type TicketStatus,
  type TicketCategory,
  type TicketSeverity,
} from "../../../lib/admin-rpc";

type Filter = TicketStatus | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "open",         label: "Open"         },
  { value: "in_progress",  label: "In Progress"  },
  { value: "resolved",     label: "Resolved"     },
  { value: "all",          label: "All"          },
];

const CAT_LABEL: Record<TicketCategory, string> = {
  bug:             "Bug",
  feature_request: "Feature request",
  question:        "Question",
  billing:         "Billing",
};

const SEVERITY_OPTIONS: { value: TicketSeverity; label: string }[] = [
  { value: "low",      label: "Low"      },
  { value: "medium",   label: "Medium"   },
  { value: "high",     label: "High"     },
  { value: "critical", label: "Critical" },
];

export default function AdminTicketsPage() {
  const [filter, setFilter] = useState<Filter>("open");
  const [rows,   setRows]   = useState<TicketAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = rows.find((r) => r.id === activeId) ?? null;

  const [response,   setResponse]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalErr,   setModalErr]   = useState<string | null>(null);

  const load = async (f: Filter) => {
    try {
      setLoading(true);
      setErr(null);
      const data = await listTickets(f);
      setRows(data);
      // Keep selection if still in the list, else select first row.
      setActiveId((prev) => {
        if (prev && data.some((r) => r.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(filter); }, [filter]);
  useEffect(() => {
    setResponse(active?.admin_response ?? "");
    setModalErr(null);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMarkInProgress = async () => {
    if (!active) return;
    try {
      setSubmitting(true);
      setModalErr(null);
      await resolveTicket(active.id, "in_progress");
      await load(filter);
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
      await load(filter);
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
      await load(filter);
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "Could not set severity.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Tickets
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Submitter sees the response in their app once you mark a ticket resolved.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
              (filter === f.value
                ? "bg-teal-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {err && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* List */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-1">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading && (
              <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading…</li>
            )}
            {!loading && rows.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No tickets in this queue.</li>
            )}
            {!loading && rows.map((r) => {
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
                      <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
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
                        <span>{CAT_LABEL[r.category]}</span>
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
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {active.subject}
                  </h3>
                  <TicketStatusPill status={active.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <span><span className="font-medium">Category:</span> {CAT_LABEL[active.category]}</span>
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
