"use client";
import { useHeartbeat } from "@/hooks/useAnalytics";

import Header from "@/components/layout/Header";
import IntroAnimation from "@/components/ui/IntroAnimation";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { SettingsProvider } from "@/components/ui/SettingsContext";
import Footer from "@/components/layout/Footer";

function HeartbeatWrapper() { useHeartbeat(); return null; }

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <HeartbeatWrapper />
      <div className="min-h-screen flex flex-col">
        <Header />
        <IntroAnimation>
          <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
        </IntroAnimation>
        <Footer className="hidden md:block" />
        <MobileBottomNav />
      </div>
    </SettingsProvider>
  );
}
