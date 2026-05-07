// web/app/admin/clinics/page.tsx
// Clinics queue. Status filter (pending / approved / rejected / all), table
// of clinic applications, and per-row Approve / Reject (with reason) actions.
// Approval calls admin_approve_clinic, rejection calls admin_reject_clinic —
// both are SECURITY DEFINER RPCs gated by is_admin().

"use client";

import { useEffect, useState } from "react";
import {
  listClinics,
  approveClinic,
  rejectClinic,
  type ClinicAdminRow,
  type ClinicApprovalStatus,
} from "../../../lib/admin-rpc";

type Filter = ClinicApprovalStatus | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending",  label: "Pending"  },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all",      label: "All"      },
];

export default function AdminClinicsPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [rows,   setRows]   = useState<ClinicAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState<string | null>(null);

  // Reject-with-reason modal state.
  const [rejectFor,    setRejectFor]    = useState<ClinicAdminRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting,    setRejecting]    = useState(false);

  // Approving busy state, keyed by clinic id.
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (f: Filter) => {
    try {
      setLoading(true);
      setErr(null);
      const data = await listClinics(f);
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load clinics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(filter); }, [filter]);

  const onApprove = async (row: ClinicAdminRow) => {
    if (!confirm(`Approve "${row.facility_name}" (${row.clinic_code})?`)) return;
    try {
      setBusyId(row.id);
      await approveClinic(row.id);
      await load(filter);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Approve failed.");
    } finally {
      setBusyId(null);
    }
  };

  const onConfirmReject = async () => {
    if (!rejectFor) return;
    const trimmed = rejectReason.trim();
    if (trimmed.length < 3) {
      alert("Reason is required (at least 3 characters).");
      return;
    }
    try {
      setRejecting(true);
      await rejectClinic(rejectFor.id, trimmed);
      setRejectFor(null);
      setRejectReason("");
      await load(filter);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Reject failed.");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Clinics
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Verify DOH LTO and facility credentials before approving.
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

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left">Clinic</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">DOH LTO</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Contact</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Submitted</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Status</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">No clinics in this queue.</td></tr>
            )}
            {!loading && rows.map((r) => (
              <tr key={r.id} className="text-zinc-700 dark:text-zinc-200">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">{r.facility_name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {r.clinic_code} · {r.facility_type}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.doh_lto_number}</td>
                <td className="px-4 py-3">
                  <div>{r.contact_first_name} {r.contact_last_name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{r.contact_email}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{r.contact_mobile}</div>
                </td>
                <td className="px-4 py-3 text-xs">{formatDate(r.created_at)}</td>
                <td className="px-4 py-3">
                  <StatusPill status={r.approval_status} />
                  {r.approval_status === "rejected" && r.rejection_reason && (
                    <div className="mt-1 max-w-xs text-xs text-red-700 dark:text-red-300">
                      {r.rejection_reason}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.approval_status === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onApprove(r)}
                        disabled={busyId === r.id}
                        className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-400"
                      >
                        {busyId === r.id ? "…" : "Approve"}
                      </button>
                      <button
                        onClick={() => { setRejectFor(r); setRejectReason(""); }}
                        disabled={busyId === r.id}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rejectFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Reject {rejectFor.facility_name}?
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              The clinic will see this reason if they try to sign in.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="e.g. DOH LTO number could not be verified."
              className="mt-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-900/40"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setRejectFor(null); setRejectReason(""); }}
                disabled={rejecting}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmReject}
                disabled={rejecting}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {rejecting ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ClinicApprovalStatus }) {
  const map: Record<ClinicApprovalStatus, string> = {
    pending:  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    approved: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };
  return (
    <span className={"inline-block rounded-full px-2 py-0.5 text-xs font-medium " + map[status]}>
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
