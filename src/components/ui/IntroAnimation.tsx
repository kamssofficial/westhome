"use client";

export default function IntroAnimation({ children }: { children: React.ReactNode }) {
  // Never block first paint with a splash screen. The storefront should be
  // immediately visible while its non-critical data refreshes in the background.
  return <>{children}</>;
}
