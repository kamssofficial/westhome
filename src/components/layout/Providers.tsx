"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Refetch session every 5 minutes instead of default 1 minute
      refetchInterval={5 * 60}
      // Don't refetch when window gets focus (reduces failed fetches)
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
