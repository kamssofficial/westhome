import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-light text-[#d4a574] mb-4">404</p>
        <h2 className="text-xl font-semibold text-[#1a1917] mb-2">
          Page not found
        </h2>
        <p className="text-sm text-[#6b6560] mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
