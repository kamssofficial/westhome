"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import DashboardView, {
  EMPTY_LIVE,
  type DashboardData,
  type LiveState,
} from "@/components/admin/DashboardView";

function toCsv(rows: any[]): string {
  const headers = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== "object");
  const esc = (v: any) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

/**
 * Data container for the admin dashboard.
 *
 * Owns the network: the figures, the realtime visitor poll and the CSV export.
 * Everything visual lives in DashboardView, which is why this file has no JSX
 * worth reading.
 */
export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [live, setLive] = useState<LiveState>(EMPTY_LIVE);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveError, setLiveError] = useState(false);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  // Stamps each request so a slow response can't overwrite fresher data.
  const requestId = useRef(0);

  const fetchData = useCallback(async (r: string, silent = false) => {
    const id = ++requestId.current;
    if (!silent) setLoading(true);
    // Background refreshes stay quiet: the "Live · updated" badge shows progress
    // instead, so the refresh button doesn't spin every 20 seconds.
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/dashboard?range=${r}`);
      if (res.status === 401 || res.status === 403) {
        // Stale/expired session — bounce to login instead of showing a fake zero dashboard.
        window.location.href = "/login";
        return;
      }
      // A newer request (range change, or a quick manual refresh) supersedes this
      // one, so a slow response can never overwrite fresher numbers.
      if (id !== requestId.current) return;
      if (res.ok) {
        setData(await res.json());
        setLastUpdated(Date.now());
        setError(null);
      } else if (!silent) {
        setError("Failed to load dashboard data.");
      }
    } catch {
      if (!silent) setError("Failed to load dashboard data.");
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  // Real-time visitors: poll the existing live endpoint (same one the BI
  // dashboard uses) — no duplicate realtime system.
  const fetchLive = useCallback(() => {
    fetch("/api/analytics/live")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        setLive({ live: d.live || 0, customers: d.customers || 0, guests: d.guests || 0, visitors: d.visitors || [] });
        setLiveError(false);
        setLiveLoaded(true);
      })
      .catch(() => setLiveError(true));
  }, []);

  useEffect(() => {
    fetchLive();
    const tick = () => { if (document.visibilityState === "visible") fetchLive(); };
    const i = setInterval(tick, 15000);
    return () => clearInterval(i);
  }, [fetchLive]);

  // Keep the figures live as well as the visitor count, so the dashboard never
  // needs a manual reload. Polling runs only while the tab is visible, and a tab
  // that regains focus refreshes immediately.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      fetchData(range, true);
      fetchLive();
    };
    const i = setInterval(refresh, 20000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [range, fetchData, fetchLive]);

  const exportCsv = useCallback(async (label: string, endpoint: string) => {
    try {
      const res = await fetch(endpoint);
      const json = await res.json();
      const rows = json.orders || json.products || json.customers || [];
      if (!rows.length) return;
      const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = label.toLowerCase().replace(/ /g, "-") + ".csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* export is best-effort; nothing to recover here */
    }
  }, []);

  return (
    <DashboardView
      data={data}
      live={live}
      range={range}
      onRangeChange={setRange}
      onRefresh={() => fetchData(range)}
      onExport={exportCsv}
      loading={loading}
      refreshing={refreshing}
      error={error}
      lastUpdated={lastUpdated}
      liveError={liveError}
      liveLoaded={liveLoaded}
    />
  );
}
