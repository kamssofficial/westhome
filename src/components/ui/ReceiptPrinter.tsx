"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Config (easy to edit) ─── */
const BRAND = "WESTHOME";
const TAGLINE = "Premium Home, Thoughtfully Chosen";
const ITEM_NAME = "Linen Comforter Set";
const ITEM_SUB = "King Size · Sage Green";
const SUBTOTAL = 4999;
const TAX_RATE = 0.18;
const PLAN = "Pro plan";
const PLAN_SUB = "Annual subscription";

/* ─── Helpers ─── */
function generateOrderId() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const r = Math.floor(Math.random() * 9000 + 1000);
  return `WH${y}${m}${r}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(n: number) {
  return "\u20B9" + n.toLocaleString("en-IN");
}

/* ─── Barcode generator ─── */
function generateBarcodeSvg(text: string): string {
  let bits = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bits += code.toString(2).padStart(8, "0");
  }
  const bars: string[] = [];
  let x = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === "1") {
      const w = (i % 3 === 0) ? 2 : 1;
      bars.push(`<rect x="${x}" y="0" width="${w}" height="40" fill="currentColor"/>`);
      x += w;
    } else {
      x += 1;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} 40" width="${x}" height="40">${bars.join("")}</svg>`;
}

/* ─── Component ─── */
interface ReceiptPrinterProps {
  className?: string;
}

export default function ReceiptPrinter({ className }: ReceiptPrinterProps) {
  const [phase, setPhase] = useState<"idle" | "printing" | "ready" | "tearing">("idle");
  const [visibleLines, setVisibleLines] = useState(0);
  const [printedCount, setPrintedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [orderId] = useState(() => generateOrderId());
  const [now] = useState(() => new Date());
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const tax = Math.round(SUBTOTAL * TAX_RATE);
  const total = SUBTOTAL + tax;
  const totalLines = 16; // number of content lines

  /* cleanup timers on unmount */
  useEffect(() => {
    return () => timerRef.current.forEach(clearTimeout);
  }, []);

  const clearTimeouts = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);

  /* prefers-reduced-motion */
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const printDuration = prefersReduced ? 400 : 2000;

  /* ─── Print ─── */
  const handlePrint = useCallback(() => {
    if (busyRef.current) return;
    setBusy(true); busyRef.current = true;
    setPhase("printing");
    setVisibleLines(0);

    // Reveal lines one by one
    for (let i = 1; i <= totalLines; i++) {
      const t = setTimeout(() => setVisibleLines(i), (i * printDuration) / totalLines);
      timerRef.current.push(t);
    }

    // After full feed, show "Tear off" button
    const finishTimer = setTimeout(() => {
      setPhase("ready");
      setBusy(false); busyRef.current = false;
    }, printDuration + 200);
    timerRef.current.push(finishTimer);

    // Safety timeout: always recover after 5s
    const safetyTimer = setTimeout(() => {
      if (timerRef.current.length > 0) {
        setPhase("ready");
        setBusy(false); busyRef.current = false;
      }
    }, 5000);
    timerRef.current.push(safetyTimer);
  }, [busy, printDuration, totalLines]);

  /* ─── Tear ─── */
  const handleTear = useCallback(() => {
    if (busyRef.current) return;
    setBusy(true); busyRef.current = true;
    setPhase("tearing");

    const t = setTimeout(() => {
      setPhase("idle");
      setVisibleLines(0);
      setPrintedCount((c) => Math.min(c + 1, 8));
      setBusy(false);
      clearTimeouts();
    }, prefersReduced ? 100 : 700);
    timerRef.current.push(t);
  }, [busy, prefersReduced, clearTimeouts]);

  const receipts = Array.from({ length: printedCount }, (_, i) => i);


  const barcodeSvg = generateBarcodeSvg(orderId);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-6 py-8",
        className
      )}
    >
      {/* ─── Printer Device ─── */}
      <div
        className="relative w-full max-w-[340px] overflow-hidden rounded-[1.6rem] border border-white/[.08]"
        style={{
          background: "linear-gradient(160deg, #2a2825 0%, #1d1c19 100%)",
          boxShadow: "0 24px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.04) inset",
        }}
      >
        {/* Home pill */}
        <div className="absolute right-4 top-4 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.08] px-3 py-1 text-[10px] font-semibold tracking-wide text-white/60 backdrop-blur-sm">
            <Home size={10} /> Home
          </span>
        </div>

        {/* Built-in screen */}
        <div className="mx-4 mt-4 rounded-xl border border-white/[.06] bg-black/60 p-5 md:mx-5 md:mt-5 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white/90" style={{ fontFamily: "var(--font-sans)" }}>
                {PLAN}
              </p>
              <p className="mt-0.5 text-[11px] text-white/40">{PLAN_SUB}</p>
            </div>
            <p className="text-right text-lg font-bold text-white" style={{ fontFamily: "var(--font-sans)" }}>
              {formatCurrency(SUBTOTAL)}
            </p>
          </div>
          <div className="my-3 border-t border-dashed border-white/10" />
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="text-[12px] font-medium text-emerald-400/90">Payment complete</span>
          </div>
        </div>

        {/* Print button */}
        <div className="px-5 py-4">
          <button
            onClick={handlePrint}
            disabled={busy}
            className={cn(
              "mx-auto block rounded-full px-6 py-2.5 text-[12px] font-semibold tracking-wide transition-all duration-300",
              busy
                ? "cursor-not-allowed bg-white/[.06] text-white/30"
                : "bg-white/[.1] text-white hover:bg-white/[.15] active:scale-95"
            )}
          >
            {phase === "printing" ? "Printing…" : "Print invoice"}
          </button>
        </div>

        {/* Paper slot */}
        <div className="relative mx-5 mb-5 h-2 overflow-hidden rounded-full bg-gradient-to-r from-black via-neutral-800 to-black">
          <div className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-black/80" />
        </div>

        {/* ─── Receipt Paper ─── */}
        <div
          ref={containerRef}
          className="mx-auto overflow-hidden transition-all"
          style={{
            maxWidth: "260px",
            height: phase === "idle" ? "6px" : undefined,
            minHeight: "6px",
          }}
        >
          <div
            ref={contentRef}
            className={cn(
              "origin-top transition-all ease-out",
              phase === "tearing" && "animate-tear",
              phase === "idle" && "opacity-0"
            )}
            style={{
              background: "#f6f1e4",
              color: "#2a2825",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "11px",
              lineHeight: "1.6",
              padding: "20px 18px",
              borderRadius: "0 0 4px 4px",
              transitionDuration: phase === "tearing" ? "600ms" : `${printDuration}ms`,
              maxHeight: phase === "idle" ? "0px" : "800px",
              opacity: phase === "tearing" ? 0 : 1,
              transform: phase === "tearing" ? "translateY(40px) rotate(3deg)" : undefined,
            }}
          >
            {renderReceiptContent(visibleLines, orderId, now, barcodeSvg, total, tax)}
          </div>

          {/* Zig-zag tear edge */}
          {phase !== "idle" && (
            <div
              className="w-full"
              style={{
                height: "8px",
                background: "linear-gradient(135deg, #f6f1e4 33.33%, transparent 33.33%) 0 0 / 8px 100%, linear-gradient(225deg, #f6f1e4 33.33%, transparent 33.33%) 0 0 / 8px 100%",
                backgroundPosition: "top",
                backgroundRepeat: "repeat-x",
              }}
            />
          )}
        </div>

        {/* Tear off button */}
        {phase === "ready" && (
          <div className="px-5 pb-5 text-center">
            <button
              onClick={handleTear}
              className="rounded-full border border-white/10 bg-white/[.06] px-5 py-2 text-[11px] font-medium text-white/70 transition-all hover:bg-white/[.1] hover:text-white active:scale-95"
            >
              Tear off receipt
            </button>
          </div>
        )}
      </div>

      {/* ─── Tray ─── */}
      <div className="flex flex-col items-center gap-2">
        {/* Stacked receipts */}
        <div className="relative flex h-8 w-28 items-end justify-center">
          {receipts.map((i) => (
            <div
              key={i}
              className="absolute rounded-sm border border-stone-300/40 bg-[#f6f1e4]"
              style={{
                width: "70px",
                height: "6px",
                bottom: `${i * 3}px`,
                left: `calc(50% - 35px + ${(i % 3 - 1) * 2}px)`,
                opacity: 0.5 + (i / 8) * 0.5,
                boxShadow: "0 1px 3px rgba(0,0,0,.1)",
              }}
            />
          ))}
        </div>
        {printedCount > 0 && (
          <p className="text-[11px] text-text-muted">
            Printed today: <span className="font-semibold text-foreground">{printedCount}</span>
          </p>
        )}
      </div>

      {/* Tear animation keyframes */}
      <style jsx global>{`
        @keyframes tear {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(40px) rotate(3deg); opacity: 0; }
        }
        .animate-tear {
          animation: tear 0.6s ease-in forwards;
        }
      `}</style>
    </div>
  );
}

/* ─── Receipt Content Renderer ─── */
function renderReceiptContent(
  lines: number,
  orderId: string,
  now: Date,
  barcodeSvg: string,
  total: number,
  tax: number,
) {
  const taxAmt = tax;
  const allLines = [
    /* 1 */ <div key="logo" className="flex justify-center"><span className="text-[18px] font-bold tracking-[.3em]">{BRAND}</span></div>,
    /* 2 */ <p key="tag" className="text-center text-[9px] tracking-wide opacity-50">{TAGLINE}</p>,
    /* 3 */ <div key="dr1" className="my-2 border-t border-dashed border-[#2a2825]/20" />,
    /* 4 */ (
      <div key="item" className="flex justify-between">
        <div>
          <p className="font-semibold">{ITEM_NAME}</p>
          <p className="text-[9px] opacity-50">{ITEM_SUB}</p>
        </div>
        <span className="font-semibold">{formatCurrency(SUBTOTAL)}</span>
      </div>
    ),
    /* 5 */ <div key="dr2" className="my-2 border-t border-dashed border-[#2a2825]/20" />,
    /* 6 */ (
      <div key="sub" className="flex justify-between text-[10px]">
        <span className="opacity-60">Subtotal</span>
        <span>{formatCurrency(SUBTOTAL)}</span>
      </div>
    ),
    /* 7 */ (
      <div key="tax" className="flex justify-between text-[10px]">
        <span className="opacity-60">Tax (18%)</span>
        <span>{formatCurrency(taxAmt)}</span>
      </div>
    ),
    /* 8 */ (
      <div key="total" className="flex justify-between border-t border-[#2a2825]/10 pt-1 text-[12px] font-bold">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    ),
    /* 9 */ <div key="dr3" className="my-2 border-t border-dashed border-[#2a2825]/20" />,
    /* 10 */ (
      <div key="meta1" className="flex justify-between text-[9px]">
        <span className="opacity-50">Order #</span>
        <span className="font-medium">{orderId}</span>
      </div>
    ),
    /* 11 */ (
      <div key="meta2" className="flex justify-between text-[9px]">
        <span className="opacity-50">Paid with</span>
        <span className="font-medium">Razorpay UPI</span>
      </div>
    ),
    /* 12 */ (
      <div key="meta3" className="flex justify-between text-[9px]">
        <span className="opacity-50">Date</span>
        <span className="font-medium">{formatDate(now)} {formatTime(now)}</span>
      </div>
    ),
    /* 13 */ <div key="dr4" className="my-2 border-t border-dashed border-[#2a2825]/20" />,
    /* 14 */ (
      <div key="barcode" className="flex flex-col items-center gap-1 text-[#2a2825]/70">
        <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
        <span className="text-[8px] tracking-widest">{orderId}</span>
      </div>
    ),
    /* 15 */ <div key="dr5" className="my-2 border-t border-dashed border-[#2a2825]/20" />,
    /* 16 */ <p key="footer" className="text-center text-[8px] opacity-40 leading-relaxed">Thank you for shopping with Westhome. This is a digital receipt.</p>,
  ];

  return (
    <>
      {allLines.slice(0, lines).map((line, i) => (
        <div
          key={i}
          style={{
            opacity: 0,
            transform: "translateY(6px)",
            animation: `fadeSlideIn 0.3s ease ${i * 0.04}s forwards`,
          }}
        >
          {line}
        </div>
      ))}
      <style jsx global>{`
        @keyframes fadeSlideIn {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
