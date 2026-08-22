"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import WestHomeLogo from "@/components/ui/WestHomeLogo";

export default function IntroAnimation({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(true);
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    // Phase 1: Logo fades in (0-800ms)
    // Phase 2: Hold (800-2200ms)
    // Phase 3: Fade out (2200-3000ms)
    const holdTimer = setTimeout(() => setPhase("hold"), 800);
    const exitTimer = setTimeout(() => setPhase("exit"), 2200);
    const hideTimer = setTimeout(() => setShowIntro(false), 3000);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {/* Main site content */}
      <div
        className={cn(
          "transition-opacity duration-700",
          phase === "exit" ? "opacity-100" : showIntro ? "opacity-0" : "opacity-100"
        )}
      >
        {children}
      </div>

      {/* Intro overlay */}
      {showIntro && (
        <div
          className={cn(
            "fixed inset-0 z-[9999] flex items-center justify-center",
            "bg-[#FAF9F6]",
            phase === "exit" ? "animate-intro-fade-out" : "animate-intro-fade-in"
          )}
        >
          <div className="text-center">
            {/* Logo image */}
            <div
              className={cn(
                "transition-all duration-700 ease-out",
                phase === "enter"
                  ? "opacity-0 translate-y-4 scale-95"
                  : "opacity-100 translate-y-0 scale-100"
              )}
            >
              <WestHomeLogo size="xl" className="mx-auto" />
            </div>

            {/* Subtle loading line */}
            <div className="mt-8 mx-auto w-12 h-[1px] bg-stone-300 overflow-hidden">
              <div
                className={cn(
                  "h-full bg-stone-600",
                  phase === "hold" ? "animate-intro-line" : ""
                )}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
