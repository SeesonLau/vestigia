// web/app/admin/password-resets/page.tsx
// Password-reset queue. Each row is a clinic asking for a temporary
// password. Workflow: admin calls the contact mobile on file, verifies
// identity, then opens "Set Password" to issue a new password via the
// admin-set-clinic-password Edge Function (service-role-gated). The
// Edge Function also marks the request row as approved.

"use client";

import { useEffect, useState } from "react";
import {
  listPasswordResets,
  adminSetClinicPassword,
  type PasswordResetRow,
  type PasswordResetStatus,
} from "../../../lib/admin-rpc";

type Filter = PasswordResetStatus | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending",  label: "Pending"  },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired",  label: "Expired"  },
  { value: "all",      label: "All"      },
];

export default function AdminPasswordResetsPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [rows,    setRows]    = useState<PasswordResetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState<string | null>(null);

  // Set-Password modal state.
  const [setFor, setSetFor] = useState<PasswordResetRow | null>(null);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalErr,   setModalErr]   = useState<string | null>(null);

  // Inline success banner after a Set Password completes.
  const [successFor, setSuccessFor] = useState<{
    facility: string;
    operator: string;
  } | null>(null);

  const load = async (f: Filter) => {
    try {
      setLoading(true);
      setErr(null);
      const data = await listPasswordResets(f);
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load password reset requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(filter); }, [filter]);

  const openSetPassword = (row: PasswordResetRow) => {
    setSetFor(row);
    setPw1("");
    setPw2("");
    setShowPw(false);
    setModalErr(null);
  };

  const onConfirmSetPassword = async () => {
    if (!setFor) return;
    if (pw1.length < 8) {
      setModalErr("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setModalErr("Passwords do not match.");
      return;
    }
    try {
      setSubmitting(true);
      setModalErr(null);
      await adminSetClinicPassword({
        requestId:   setFor.id,
        profileId:   setFor.clinic_profile_id,
        newPassword: pw1,
      });
      setSuccessFor({
        facility: setFor.clinic?.facility_name ?? setFor.clinic?.clinic_code ?? "Clinic",
        operator: setFor.clinic_profile?.full_name ?? setFor.clinic_profile?.email ?? "the requester",
      });
      setSetFor(null);
      await load(filter);
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "Set password failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Password Resets
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Verify the requester by phone before issuing a temporary password.
        </p>
      </header>

      {successFor && (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-200"
        >
          <div>
            <p className="font-semibold">Password updated for {successFor.facility}.</p>
            <p className="mt-0.5 text-xs">
              Communicate the new password to {successFor.operator} over the same call you just used
              to verify their identity.
            </p>
          </div>
          <button
            onClick={() => setSuccessFor(null)}
            aria-label="Dismiss"
            className="shrink-0 rounded-md px-2 py-0.5 text-teal-700 hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-900/50"
          >
            ×
          </button>
        </div>
      )}

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
              <th className="whitespace-nowrap px-4 py-3 text-left">Requester</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Clinic</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Contact</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Notes</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Submitted</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Status</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">No password reset requests.</td></tr>
            )}
            {!loading && rows.map((r) => (
              <tr key={r.id} className="text-zinc-700 dark:text-zinc-200">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {r.clinic_profile?.full_name ?? "—"}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {r.clinic_profile?.email ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>{r.clinic?.facility_name ?? "—"}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {r.clinic?.clinic_code ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.clinic?.contact_mobile ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="max-w-xs whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">
                    {r.notes ?? <span className="italic text-zinc-400 dark:text-zinc-500">No notes provided</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">{formatDate(r.created_at)}</td>
                <td className="px-4 py-3">
                  <ResetStatusPill status={r.status} />
                  {r.status === "rejected" && r.rejection_reason && (
                    <div className="mt-1 max-w-xs text-xs text-red-700 dark:text-red-300">
                      {r.rejection_reason}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === "pending" ? (
                    <button
                      onClick={() => openSetPassword(r)}
                      className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400"
                    >
                      Set Password
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {setFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Set new password for {setFor.clinic?.facility_name ?? setFor.clinic_profile?.full_name ?? "clinic"}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              The clinic will be able to sign in immediately. Communicate this password back to them
              over the same call you just used to verify their identity.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  New password
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                  placeholder="At least 8 characters"
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-900/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Confirm password
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-900/40"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={showPw}
                  onChange={(e) => setShowPw(e.target.checked)}
                  className="rounded border-zinc-300 text-teal-600"
                />
                Show password
              </label>
            </div>

            {modalErr && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {modalErr}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setSetFor(null)}
                disabled={submitting}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmSetPassword}
                disabled={submitting}
                className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-400"
              >
                {submitting ? "Setting…" : "Set password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResetStatusPill({ status }: { status: PasswordResetStatus }) {
  const map: Record<PasswordResetStatus, string> = {
    pending:  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    approved: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    expired:  "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return (
    <span className={"inline-block rounded-full px-2 py-0.5 text-xs font-medium " + map[status]}>
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}
