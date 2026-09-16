"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Trend({ current, previous, className, periodLabel }: { current: number; previous: number; className?: string; periodLabel?: string }) {
  // With no previous-period baseline there is no honest comparison — show a
  // neutral "New" badge instead of a misleading +100%.
  if (previous === 0) {
    if (current <= 0) return null;
    return <span className={cn("text-[10px] font-medium text-text-muted bg-surface-muted px-1.5 py-0.5 rounded-full", className)}>New</span>;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className={cn("text-xs text-text-muted flex items-center gap-0.5", className)}><Minus size={12} /> 0%</span>;
  return (
    <span className={cn("text-xs font-medium flex items-center gap-0.5", pct > 0 ? "text-green-600" : "text-red-500", className)}>
      {pct > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(pct)}%{periodLabel ? ` vs ${periodLabel}` : ""}
    </span>
  );
}

export function KPICard({ label, value, icon: Icon, trend, trendLabel, href, bg, accent }: { label: string; value: string | number; icon: any; trend?: { current: number; previous: number }; trendLabel?: string; href?: string; bg?: string; accent?: string }) {
  const card = (
    <div className={cn("bg-white rounded-2xl border border-black/[.06] p-4 hover:shadow-md transition-all", href && "cursor-pointer")}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg || "bg-[#f0ede8]")}>
          <Icon size={18} className={accent || "text-[#6b6560]"} />
        </div>
        {trend && <Trend current={trend.current} previous={trend.previous} periodLabel={trendLabel} />}
      </div>
      <p className="text-2xl font-bold text-primary tracking-tight">{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
      {href && <ExternalLink size={10} className="text-text-muted mt-2" />}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export function Section({ title, icon: Icon, children, defaultOpen = true, badge }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; badge?: string | number }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-[#6b6560]" />
          <h2 className="text-sm font-semibold text-primary">{title}</h2>
          {badge !== undefined && <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-bold rounded-full">{badge}</span>}
        </div>
        <ChevronDown size={16} className={cn("text-text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-5 pb-5 border-t border-border">{children}</div>}
    </div>
  );
}

/**
 * Shows that a dashboard refreshes itself: a pulsing live dot plus how long ago
 * the data behind it was fetched. Owns its own one-second ticker so the clock
 * doesn't re-render the whole dashboard every second.
 */
export function LiveUpdated({ at }: { at: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  if (at === null) return null;
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  const ago =
    seconds < 5 ? "just now" : seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 whitespace-nowrap"
      title="This dashboard refreshes by itself — no need to reload"
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      Live
      <span className="text-text-muted font-normal tabular-nums">· updated {ago}</span>
    </span>
  );
}

export function MiniBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color || "bg-accent")} style={{ width: `${pct}%` }} />
    </div>
  );
}