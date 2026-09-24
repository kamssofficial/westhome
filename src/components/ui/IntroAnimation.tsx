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
 * Total duration ~1.6 s (was ~3 s — the splash was the single largest
 * perceived-latency cost on the storefront: every new session stared at a
 * full-screen overlay before any content was visible). Tap anywhere to skip.
 */
const INTRO_KEY = "westhome-intro-seen";

export default function IntroAnimation({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"idle" | "logo" | "line" | "tagline" | "wipe" | "done">(() => {
    // Skip intro entirely if already seen in this session — avoids replaying
    // on back-navigation which destroys scroll position.
    if (typeof window !== "undefined" && sessionStorage.getItem(INTRO_KEY)) {
      return "done";
    }
    return "idle";
  });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const skip = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("wipe");
    setTimeout(() => setPhase("done"), 500);
  }, []);

  // Schedule the whole sequence exactly once on mount. (Depending on [phase]
  // here re-armed a fresh `logo` timer on every transition, which always fired
  // before `done` — the splash looped forever unless the user tapped it.)
  useEffect(() => {
    const at = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(fn, ms));
    };

    at(() => setPhase("logo"), 30);
    at(() => setPhase("line"), 380);
    at(() => setPhase("tagline"), 650);
    at(() => setPhase("wipe"), 1250);
    at(() => setPhase("done"), 1600);

    return () => timers.current.forEach(clearTimeout);
  }, []);

  // Mark the intro as seen when it completes so it never replays this session.
  useEffect(() => {
    if (phase === "done") {
      try { sessionStorage.setItem(INTRO_KEY, "1"); } catch {}
    }
  }, [phase]);

  return (
    <>
      {/* Page content — hidden until intro finishes */}
      <div>
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
                  className="object-contain" sizes="200px"
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
