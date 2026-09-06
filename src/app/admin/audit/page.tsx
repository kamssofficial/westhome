"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ScrollText, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { name: string; email: string; role: string } | null;
}

const ENTITIES = ["PRODUCT", "ORDER", "USER", "CATEGORY", "COUPON", "SETTINGS"];
const ACTIONS = ["CREATE", "UPDATE", "DELETE", "DEACTIVATE", "CONFIRM", "PAYMENT_CONFIRMED", "SHIP", "DELIVER", "CANCEL", "REORDER", "BULK_"];

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  DEACTIVATE: "bg-red-100 text-red-700",
  CONFIRM: "bg-indigo-100 text-indigo-700",
  PAYMENT_CONFIRMED: "bg-green-100 text-green-700",
  SHIP: "bg-purple-100 text-purple-700",
  DELIVER: "bg-green-100 text-green-700",
  CANCEL: "bg-amber-100 text-amber-700",
  REORDER: "bg-stone-100 text-stone-700",
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function detailsText(details: Record<string, unknown> | null): string {
  if (!details) return "";
  try {
    const s = JSON.stringify(details);
    return s.length > 120 ? s.slice(0, 120) + "…" : s;
  } catch {
    return "";
  }
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (entity) params.set("entity", entity);
      if (action) params.set("action", action);
      const res = await fetch("/api/admin/audit?" + params.toString());
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setError("Failed to load audit log.");
        setLogs([]);
        return;
      }
      const d = await res.json();
      setLogs(d.logs || []);
      setTotal(d.total || 0);
    } catch {
      setError("Failed to load audit log.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, entity, action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#f0ede8] flex items-center justify-center">
            <ScrollText size={16} className="text-[#6b6560]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary">Audit Log</h1>
            <p className="text-xs text-text-muted">{total} recorded actions</p>
          </div>
        </div>
        <button
          onClick={() => fetchLogs()}
          disabled={loading}
          className="p-2 hover:bg-surface-muted rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-text-muted" : "text-text-muted"} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
          <option value="">All entities</option>
          {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Entity</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-text-muted">Loading…</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-red-500">{error}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-text-muted">No audit entries match.</td></tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted/30 transition-colors">
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtTime(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      {l.actor ? (
                        <span className="font-medium text-primary">{l.actor.name || l.actor.email}</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${ACTION_COLORS[l.action] || "bg-stone-100 text-stone-700"}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-primary">{l.entity}{l.entityId ? ` #${l.entityId.slice(0, 8)}` : ""}</td>
                    <td className="px-4 py-3 text-text-muted font-mono text-xs">{detailsText(l.details)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-white hover:bg-surface-muted disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-xs text-text-muted">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-white hover:bg-surface-muted disabled:opacity-40 transition-colors"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}