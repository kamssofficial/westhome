"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Scene = "darkness" | "space" | "light" | "logo" | "tagline" | "hold" | "exit";

export default function IntroAnimation({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(true);
  const [scene, setScene] = useState<Scene>("darkness");
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (dismissed) return;
    const timers: NodeJS.Timeout[] = [];
    const schedule = (fn: () => void, ms: number) => { timers.push(setTimeout(fn, ms)); };
    schedule(() => setScene("space"), 800);
    schedule(() => setScene("light"), 2200);
    schedule(() => setScene("logo"), 3200);
    schedule(() => setScene("tagline"), 4200);
    schedule(() => setScene("hold"), 5200);
    schedule(() => setScene("exit"), 6000);
    schedule(() => setShowIntro(false), 6800);
    timerRef.current = timers;
    return () => timers.forEach(clearTimeout);
  }, [dismissed]);

  const handleDismiss = () => {
    if (dismissed) return;
    setDismissed(true);
    timerRef.current.forEach(clearTimeout);
    setScene("exit");
    setTimeout(() => setShowIntro(false), 600);
  };

  return (
    <>
      <div className={cn("transition-opacity duration-700", scene === "exit" ? "opacity-100" : showIntro ? "opacity-0" : "opacity-100")}>
        {children}
      </div>
      {showIntro && (
        <div onClick={handleDismiss} className="fixed inset-0 z-[9999] cursor-pointer overflow-hidden bg-[#1a1917]" role="button" aria-label="Skip intro" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleDismiss()}>
          {/* Scene 1: Darkness */}
          <div className={cn("absolute inset-0 transition-opacity duration-[2000ms]", scene === "darkness" ? "opacity-100" : "opacity-0")} style={{background:"#1a1917"}} />
          {/* Scene 2: Space */}
          <div className={cn("absolute inset-0 transition-opacity duration-[1500ms]", ["space","light"].includes(scene) ? "opacity-100" : "opacity-0")}>
            <div className="absolute inset-0" style={{background:"radial-gradient(ellipse 80% 60% at 50% 60%, #3d3530 0%, #1a1917 70%, #0f0e0d 100%)"}} />
            <div className="absolute left-0 top-0 h-full w-[45%]" style={{background:"linear-gradient(90deg, #2a2520 0%, #3d3530 40%, transparent 100%)", borderRadius:"0 40% 30% 0"}} />
            <div className="absolute right-0 top-0 h-full w-[35%]" style={{background:"linear-gradient(270deg, #2a2520 0%, #352f2a 50%, transparent 100%)", borderRadius:"40% 0 0 20%"}} />
            <div className="absolute bottom-[22%] left-[15%] w-[30%] h-[18%]" style={{background:"linear-gradient(180deg, #4a403a 0%, #3d3530 100%)", borderRadius:"20px 20px 8px 8px", opacity:0.7}} />
            <div className="absolute bottom-[22%] right-[20%] w-[12%] h-[12%]" style={{background:"#4a403a", borderRadius:"50% 50% 4px 4px", opacity:0.6}} />
            <div className="absolute bottom-[28%] right-[22%] w-[8%] h-[20%]" style={{background:"radial-gradient(ellipse at bottom, #3a4a35 0%, #2a3525 60%, transparent 100%)", borderRadius:"50% 50% 20% 20%", opacity:0.5}} />
            <div className="absolute bottom-0 left-0 right-0 h-[20%]" style={{background:"linear-gradient(180deg, transparent 0%, #1a1917 100%)"}} />
          </div>
          {/* Scene 3: Light beam */}
          <div className={cn("absolute inset-0 transition-opacity duration-700", ["light","logo","tagline","hold"].includes(scene) ? "opacity-100" : "opacity-0")}>
            <div className="absolute top-0 h-full w-[30%] left-[-10%]" style={{background:"linear-gradient(90deg, transparent 0%, #faf8f510 20%, #faf8f518 50%, #faf8f510 80%, transparent 100%)", animation:"lightSweep 2.5s ease-in-out forwards"}} />
            <div className="absolute inset-0 flex items-center justify-center" style={{background:"radial-gradient(ellipse 40% 40% at 50% 50%, #faf8f512 0%, transparent 70%)"}} />
          </div>
          {/* Scene 4: Logo + Scene 5: Tagline */}
          <div className={cn("absolute inset-0 flex items-center justify-center transition-opacity duration-1000", ["logo","tagline","hold"].includes(scene) ? "opacity-100" : "opacity-0")}>
            <div className="text-center" style={{animation: scene === "logo" ? "logoReveal 1.2s ease-out forwards" : "none"}}>
              <div className="relative mx-auto" style={{width:"200px",height:"80px"}}>
                <Image src="/images/logo/westhome-logo-white.png" alt="WESTHOME" fill className="object-contain" style={{filter:"drop-shadow(0 0 30px rgba(250, 248, 245, 0.15))"}} priority />
              </div>
              <div className={cn("mx-auto h-[1px] bg-white/30 mb-4 transition-all duration-700", ["tagline","hold"].includes(scene) ? "w-8 opacity-100" : "w-0 opacity-0")} />
              <p className={cn("text-[11px] tracking-[.25em] uppercase text-white/50 font-light transition-all duration-700", ["tagline","hold"].includes(scene) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>by BM Distributors</p>
            </div>
          </div>
          {/* Scene 6: Exit */}
          <div className={cn("absolute inset-0 transition-opacity duration-600", scene === "exit" ? "opacity-100" : "opacity-0")} style={{background:"#FAF8F5"}} />
          {/* Skip hint */}
          <div className="absolute bottom-8 left-0 right-0 text-center"><p className="text-[10px] text-white/20 tracking-widest uppercase" style={{animation:"fadeIn 1s ease-out 2s both"}}>Tap to skip</p></div>
        </div>
      )}
      <style jsx global>{`
        @keyframes lightSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
        @keyframes logoReveal { 0% { opacity: 0; transform: scale(0.96) translateY(8px); filter: blur(4px); } 100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); } }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
      `}</style>
    </>
  );
}