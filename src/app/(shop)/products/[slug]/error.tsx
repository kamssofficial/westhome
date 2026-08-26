"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Product page error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-[#1a1917] mb-2">
          Product not found
        </h2>
        <p className="text-sm text-[#6b6560] mb-6">
          This product may no longer exist or is temporarily unavailable.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/shop"
            className="px-6 py-2.5 border border-stone-200 text-sm font-medium rounded-full hover:bg-stone-50 transition-colors"
          >
            Browse products
          </Link>
        </div>
      </div>
    </div>
  );
}
