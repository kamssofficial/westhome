"use client";

import { useEffect } from "react";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Shop page error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-[#1a1917] mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-[#6b6560] mb-6">
          We couldn&apos;t load this page. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
