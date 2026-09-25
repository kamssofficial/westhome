"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { toCsv as buildCsv } from "@/lib/csv";
import { readCached, writeCached } from "@/lib/clientCache";
import DashboardView, {
  EMPTY_LIVE,
  type DashboardData,
  type LiveState,
} from "@/components/admin/DashboardView";

function toCsv(rows: any[]): string {
  return buildCsv(rows);
}

const dashboardUrl = (range: string, force = false) =>
  `/api/admin/dashboard?range=${range}${force ? "&force=1" : ""}`;

// Long enough to cover a normal working session between manual refreshes, short
// enough that an order placed elsewhere shows up on its own within a minute.
const CACHE_TTL_MS = 60_000;

// Deep-link support: /admin/dashboard?tab=sales opens the Sales tab directly.
const initialTab = (() => {
  if (typeof window === "undefined") return undefined as string | undefined;
  const t = new URLSearchParams(window.location.search).get("tab") || undefined;
  return t;
})();

/**
 * Data container for the admin dashboard.
 *
 * Owns the network: the figures, the realtime visitor poll and the CSV export.
 * Everything visual lives in DashboardView, which is why this file has no JSX
 * worth reading.
 */
export default function AdminDashboardPage() {
  // Seed from the session cache so returning to the dashboard paints the last
  // known figures immediately instead of showing a skeleton for the length of
  // a multi-second aggregate query. The effect below revalidates right after.
  const [data, setData] = useState<DashboardData | null>(() =>
    readCached<DashboardData>(dashboardUrl("30d"))
  );
  const [live, setLive] = useState<LiveState>(EMPTY_LIVE);
  const [range, setRange] = useState("30d");
  // Only block on the network when there is nothing to show. With a cache hit
  // the skeleton never appears, so switching ranges refreshes in place.
  const [loading, setLoading] = useState(() => !readCached<DashboardData>(dashboardUrl("30d")));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveError, setLiveError] = useState(false);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  // Stamps each request so a slow response can't overwrite fresher data.
  const requestId = useRef(0);

  const fetchData = useCallback(async (r: string, opts: { silent?: boolean; force?: boolean } = {}) => {
    const { silent = false, force = false } = opts;
    const id = ++requestId.current;
    if (!silent) setLoading(true);
    // Background refreshes stay quiet: the "Live · updated" badge shows progress
    // instead, so the refresh button doesn't spin every 20 seconds.
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(dashboardUrl(r, force));
      if (res.status === 401 || res.status === 403) {
        // Stale/expired session — bounce to login instead of showing a fake zero dashboard.
        window.location.href = "/login";
        return;
      }
      // A newer request (range change, or a quick manual refresh) supersedes this
      // one, so a slow response can never overwrite fresher numbers.
      if (id !== requestId.current) return;
      if (res.ok) {
        const json = (await res.json()) as DashboardData;
        setData(json);
        // Keep the payload for the next visit. Silent polls refresh this entry,
        // so returning to the tab is instant even after the server TTL lapses.
        writeCached(dashboardUrl(r), json, CACHE_TTL_MS);
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

  // One interval owns the live-visitor poll. Previously a second interval (the
  // figures poll below) also called fetchLive, so the endpoint was hit roughly
  // every 7s instead of every 15s.
  useEffect(() => {
    fetchLive();
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") fetchLive();
    }, 15000);
    return () => clearInterval(tick);
  }, [fetchLive]);

  // Keep the figures live as well as the visitor count, so the dashboard never
  // needs a manual reload. Polling runs only while the tab is visible, and a tab
  // that regains focus refreshes immediately.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      fetchData(range, { silent: true });
      // A returning tab may have missed several ticks, so top the live count up
      // right away rather than waiting out the interval.
      fetchLive();
    };
    const i = setInterval(() => {
      if (document.visibilityState === "visible") fetchData(range, { silent: true });
    }, 20000);
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
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = await res.json();
      const rows = json.orders || json.products || json.customers || [];
      if (!rows.length) {
        // Previously silent: clicking Export on an empty range looked broken.
        toast.error(`No ${label.toLowerCase().replace(" csv", "")} to export`);
        return;
      }
      const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = label.toLowerCase().replace(/ /g, "-") + ".csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${label} downloaded`);
    } catch {
      toast.error(`Could not export ${label.toLowerCase()}. Please try again.`);
    }
  }, []);

  return (
    <DashboardView
      data={data}
      live={live}
      range={range}
      onRangeChange={setRange}
      // An explicit refresh always bypasses the server cache.
      onRefresh={() => fetchData(range, { force: true })}
      onExport={exportCsv}
      loading={loading}
      refreshing={refreshing}
      error={error}
      lastUpdated={lastUpdated}
      liveError={liveError}
      liveLoaded={liveLoaded}
      initialTab={initialTab as any}
    />
  );
}
