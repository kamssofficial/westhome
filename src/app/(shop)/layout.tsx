"use client";

import Header from "@/components/layout/Header";
import IntroAnimation from "@/components/ui/IntroAnimation";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import Footer from "@/components/layout/Footer";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <IntroAnimation>
        <main className="flex-1 bottom-nav-safe">
          {children}
        </main>
      </IntroAnimation>
      <Footer className="hidden md:block" />
      <MobileBottomNav />
    </div>
  );
}
