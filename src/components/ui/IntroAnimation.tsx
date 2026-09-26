"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

const INTRO_KEY = "westhome-intro-seen";

export default function IntroAnimation({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"idle" | "logo" | "line" | "tagline" | "wipe" | "done">(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(INTRO_KEY)) return "done";
    return "idle";
  });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const skip = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("wipe");
    setTimeout(() => setPhase("done"), 350);
  }, []);

  useEffect(() => {
    // A shop-layout remount can happen during client-side navigation (for
    // example when switching categories). The intro must never restart after
    // the first session entry, so check the session flag before scheduling any
    // animation timers.
    if (phase === "done") return;

    try {
      if (sessionStorage.getItem(INTRO_KEY)) {
        setPhase("done");
        return;
      }

      // Mark the intro as seen as soon as it begins. This protects against a
      // navigation/remount while the 1.6s animation is still running.
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      // Session storage can be unavailable in hardened/private contexts; the
      // intro still works normally in that case.
    }

    const at = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(fn, ms));
    };
    at(() => setPhase("logo"), 30);
    at(() => setPhase("line"), 380);
    at(() => setPhase("tagline"), 650);
    at(() => setPhase("wipe"), 1250);
    at(() => setPhase("done"), 1600);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  useEffect(() => {
    if (phase === "done") {
      try { sessionStorage.setItem(INTRO_KEY, "1"); } catch {}
    }
  }, [phase]);

  return (
    <>
      <div>{children}</div>
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
          <div
            className="absolute inset-0 transition-opacity duration-350"
            style={{ background: "#FAF8F5", opacity: phase === "wipe" ? 1 : 0 }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div
                className="relative mx-auto"
                style={{
                  width: 200,
                  height: 80,
                  opacity: ["logo", "line", "tagline", "wipe"].includes(phase) ? 1 : 0,
                  transform: phase === "idle" ? "scale(0.94) translateY(10px)" : "scale(1) translateY(0)",
                  transition: "opacity 500ms cubic-bezier(.22,1,.36,1), transform 500ms cubic-bezier(.22,1,.36,1)",
                }}
              >
                <Image
                  src="/images/logo/westhome-logo-white.png"
                  alt="WESTHOME"
                  fill
                  className="object-contain"
                  sizes="200px"
                  style={{ filter: "drop-shadow(0 0 40px rgba(250,248,245,0.12))" }}
                  priority
                />
              </div>
              <div
                className="mx-auto mt-2 h-[1px] transition-all duration-500"
                style={{
                  width: phase === "idle" || phase === "logo" ? 0 : 32,
                  background: "linear-gradient(90deg, transparent, rgba(181,108,69,0.6), transparent)",
                  opacity: ["line", "tagline", "wipe"].includes(phase) ? 1 : 0,
                }}
              />
            </div>
          </div>
          <p
            className="absolute bottom-8 left-0 right-0 text-center text-[10px] tracking-widest uppercase"
            style={{
              color: "rgba(250,248,245,0.18)",
              opacity: ["tagline", "wipe"].includes(phase) ? 1 : 0,
              transition: "opacity 400ms ease",
            }}
          >
            Tap to skip
          </p>
        </div>
      )}
    </>
  );
}
