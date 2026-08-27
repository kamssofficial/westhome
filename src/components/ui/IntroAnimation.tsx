"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

/**
 * Premium splash screen — clean, minimal, fast.
 *
 * Phases:
 *   1. Logo fades in with a subtle scale
 *   2. Thin gold line expands beneath the logo
 *   3. Tagline "by BM Distributors" fades in
 *   4. White wipe reveals the page
 *
 * Total duration ~3 s. Tap anywhere to skip instantly.
 */
export default function IntroAnimation({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"idle" | "logo" | "line" | "tagline" | "wipe" | "done">(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("westhome-intro-seen")) return "done";
    return "idle";
  });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const started = useRef(false);

  const skip = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    sessionStorage.setItem("westhome-intro-seen", "1");
    setPhase("wipe");
    setTimeout(() => setPhase("done"), 500);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const at = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(fn, ms));
    };

    at(() => setPhase("logo"), 50);
    at(() => setPhase("line"), 1200);
    at(() => setPhase("tagline"), 1800);
    at(() => setPhase("wipe"), 3000);
    at(() => { setPhase("done"); sessionStorage.setItem("westhome-intro-seen", "1"); }, 3600);

    return () => timers.current.forEach(clearTimeout);
  }, []);

  return (
    <>
      {/* Page content — hidden until intro finishes */}
      <div className={phase === "done" ? "opacity-100" : "opacity-0"}>
        {children}
      </div>

      {/* Overlay */}
      {phase !== "done" && (
        <div
          onClick={skip}
          onKeyDown={(e) => e.key === "Enter" && skip()}
          role="button"
          tabIndex={0}
          aria-label="Skip intro"
          className="fixed inset-0 z-[9999] cursor-pointer overflow-hidden"
          style={{ background: "#1a1917" }}
        >
          {/* White wipe */}
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              background: "#FAF8F5",
              opacity: phase === "wipe" ? 1 : 0,
            }}
          />

          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {/* Logo */}
              <div
                className="relative mx-auto"
                style={{
                  width: 200,
                  height: 80,
                  opacity: ["logo", "line", "tagline", "wipe"].includes(phase) ? 1 : 0,
                  transform:
                    phase === "idle"
                      ? "scale(0.94) translateY(10px)"
                      : "scale(1) translateY(0)",
                  transition: "opacity 900ms cubic-bezier(.22,1,.36,1), transform 900ms cubic-bezier(.22,1,.36,1)",
                }}
              >
                <Image
                  src="/images/logo/westhome-logo-white.png"
                  alt="WESTHOME"
                  fill
                  className="object-contain"
                  style={{ filter: "drop-shadow(0 0 40px rgba(250,248,245,0.12))" }}
                  priority
                />
              </div>

              {/* Gold line */}
              <div
                className="mx-auto mt-2 h-[1px] transition-all duration-700"
                style={{
                  width: phase === "idle" || phase === "logo" ? 0 : 32,
                  background: "linear-gradient(90deg, transparent, rgba(181,108,69,0.6), transparent)",
                  opacity: ["line", "tagline", "wipe"].includes(phase) ? 1 : 0,
                }}
              />
            </div>
          </div>

          {/* Skip hint */}
          <p
            className="absolute bottom-8 left-0 right-0 text-center text-[10px] tracking-widest uppercase"
            style={{
              color: "rgba(250,248,245,0.18)",
              opacity: ["tagline", "wipe"].includes(phase) ? 1 : 0,
              transition: "opacity 800ms ease",
            }}
          >
            Tap to skip
          </p>
        </div>
      )}
    </>
  );
}
