"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared dashboard primitives.
 *
 * Every colour here comes from the DESIGN.md token set (`success`, `warning`,
 * `error`, `info`, `accent`, `surface-muted`) as a light tint, so status never
 * invents a palette of its own. That is the difference between an editorial
 * admin panel and a wall of default Tailwind pastels.
 */
export type Tone = "neutral" | "accent" | "success" | "warning" | "error" | "info";

const TONE_TINT: Record<Tone, string> = {
  neutral: "bg-surface-muted text-text-secondary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  info: "bg-info/10 text-info",
};

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-primary",
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
};

const TONE_BG: Record<Tone, string> = {
  neutral: "bg-secondary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
};

export function Trend({
  current,
  previous,
  className,
  periodLabel,
}: {
  current: number;
  previous: number;
  className?: string;
  periodLabel?: string;
}) {
  // With no previous-period baseline there is no honest comparison — show a
  // neutral "New" badge instead of a misleading +100%.
  if (previous === 0) {
    if (current <= 0) return null;
    return (
      <span className={cn("font-label rounded-full bg-surface-muted px-2 py-1 text-text-muted", className)}>
        New
      </span>
    );
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) {
    return (
      <span className={cn("flex items-center gap-0.5 text-xs text-text-muted", className)}>
        <Minus size={12} aria-hidden="true" /> 0%
      </span>
    );
  }
  const up = pct > 0;
  return (
    <span
      className={cn("flex items-center gap-0.5 text-xs font-medium", up ? "text-success" : "text-error", className)}
      title={periodLabel ? `${Math.abs(pct)}% vs ${periodLabel}` : undefined}
    >
      {up ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
      {Math.abs(pct)}%
      {periodLabel ? <span className="sr-only"> vs {periodLabel}</span> : null}
    </span>
  );
}

export function KPICard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  trend,
  trendLabel,
  href,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone?: Tone;
  trend?: { current: number; previous: number };
  trendLabel?: string;
  href?: string;
  hint?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONE_TINT[tone])}>
          <Icon size={18} aria-hidden="true" />
        </span>
        {trend ? <Trend current={trend.current} previous={trend.previous} periodLabel={trendLabel} /> : null}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-primary tabular-nums">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
        {label}
        {href ? (
          <ArrowUpRight
            size={11}
            aria-hidden="true"
            className="opacity-0 transition-opacity group-hover:opacity-100"
          />
        ) : null}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-text-muted">{hint}</p> : null}
    </>
  );

  const shell = "group block rounded-2xl border border-border bg-surface p-4 shadow-sm transition-shadow";
  return href ? (
    <Link href={href} className={cn(shell, "focus-ring hover:shadow-card")}>
      {inner}
    </Link>
  ) : (
    <div className={shell}>{inner}</div>
  );
}

/** Small metric tile for the summary rows. */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="font-label text-text-muted">{label}</p>
      <p className={cn("mt-2 text-xl font-semibold tracking-tight tabular-nums", TONE_TEXT[tone])}>{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-text-muted">{hint}</p> : null}
    </div>
  );
}

export function MiniBar({ value, max, tone = "accent" }: { value: number; max: number; tone?: Tone }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", TONE_BG[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  badge,
  hint,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  hint?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `section-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      {/* Heading wraps the control, so screen readers get a real section
          landmark next to an operable disclosure. */}
      <h2 className="m-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          className="focus-ring flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-hover"
        >
          <span className="flex min-w-0 items-center gap-3">
            <Icon size={17} aria-hidden="true" className="shrink-0 text-text-muted" />
            <span className="font-display truncate text-lg text-primary">{title}</span>
            {badge !== undefined ? (
              <span className="font-label rounded-full bg-accent/10 px-2 py-1 text-accent">{badge}</span>
            ) : null}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {hint ? <span className="hidden text-xs text-text-muted sm:block">{hint}</span> : null}
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={cn("text-text-muted transition-transform duration-300", open && "rotate-180")}
            />
          </span>
        </button>
      </h2>
      {open ? (
        <div id={id} className="border-t border-border px-5 pb-5 pt-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Order status as a single source of truth. Statuses map onto semantic tones
 * rather than one pastel per status, so the list stays readable at a glance:
 * green = done, amber = in progress, red = needs attention.
 */
const STATUS_TONE: Record<string, Tone> = {
  NEW: "info",
  CONFIRMED: "info",
  PROCESSING: "warning",
  SHIPPED: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "error",
  PAYMENT_FAILED: "error",
  FAILED: "error",
  ON_HOLD: "warning",
  PENDING: "warning",
  REFUNDED: "neutral",
  DRAFT: "neutral",
};

export function statusTone(status: string): Tone {
  return STATUS_TONE[status] ?? "neutral";
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        TONE_TINT[statusTone(status)],
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border py-8 text-center">
      <Icon size={20} aria-hidden="true" className="mx-auto mb-2 text-text-muted/60" />
      <p className="text-sm font-medium text-primary">{title}</p>
      {hint ? <p className="mt-0.5 text-xs text-text-muted">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
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
  const ago = seconds < 5 ? "just now" : seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`;
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-success"
      title="This dashboard refreshes by itself — no need to reload"
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
      </span>
      Live
      <span className="font-normal text-text-muted tabular-nums">· updated {ago}</span>
    </span>
  );
}
